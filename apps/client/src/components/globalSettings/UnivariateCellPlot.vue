<script lang="ts" setup>
import { ref, watch, onMounted } from 'vue';
import type { PropType } from 'vue';
import * as vg from '@uwdata/vgplot';
import { useCellMetaData } from '@/stores/cellMetaData';
import { useSelectionStore } from '@/stores/selectionStore';
import { storeToRefs } from 'pinia';
import { Query, min, max, count } from '@uwdata/mosaic-sql';
import {
    QMenu,
    QItem,
    QItemSection,
    QDialog,
    QCard,
    QCardSection,
    QForm,
    QInput,
    QBtn,
} from 'quasar';

// Initialise Data
const cellMetaData = useCellMetaData();
const { dataInitialized } = storeToRefs(cellMetaData);
const selectionStore = useSelectionStore();
let dataMin = ref(0);
let dataMax = ref(0);

// Define Plot Emits and Props
const emit = defineEmits(['selectionChange', 'plot-loaded', 'plot-error']);
const props = defineProps({
    plotName: {
        type: String as PropType<string>,
        required: true,
    },
    plotBrush: {
        type: Object as PropType<any>,
        required: true,
    },
});

// Function that finds the min and max of the data to set the quasar slider.
async function dataRange() {
    try {
        // Loading

        const plotName = props.plotName;

        if (!plotName || plotName.trim() === '') {
            throw new Error('Invalid or empty plot name');
        }

        // Escape the column name to handle spaces and special characters
        const escapedPlotName = `${plotName.replace(/"/g, '""')}`;

        const query = `
            SELECT
                MIN("${escapedPlotName}") AS min_value,
                MAX("${escapedPlotName}") AS max_value
            FROM current_cell_metadata
        `;

        console.log('Constructed query:', query);

        const result = await vg.coordinator().query(query);

        if (
            !result ||
            !result.batches ||
            result.batches.length === 0 ||
            result.batches[0].numRows === 0
        ) {
            throw new Error('No data returned from query');
        }

        const minValue = Number(result.batches[0].get(0).min_value);
        const maxValue = Number(result.batches[0].get(0).max_value);

        if (isNaN(minValue) || isNaN(maxValue)) {
            throw new Error('NaN values detected in the data');
        }

        dataMin.value = Number(minValue.toFixed(3));
        dataMax.value = Number(maxValue.toFixed(3));

        console.log(dataMin.value);
        console.log(dataMax.value);

        const currentSelection = selectionStore?.Selections?.find(
            (selection) => {
                selection.plotName === plotName;
            }
        );
        if (
            currentSelection &&
            Array.isArray(currentSelection.range) &&
            currentSelection.range.length === 2
        ) {
            range.value.min = Number(currentSelection.range[0]);
            range.value.max = Number(currentSelection.range[1]);
        } else {
            range.value.min = dataMin.value;
            range.value.max = dataMax.value;
        }
    } catch (error) {
        console.error('Error fetching data range:', error);
        emit('plot-error', props.plotName);
        throw error;
    }
}

// Q-Range Slider Data
let range = ref({ min: ref(dataMin.value), max: ref(dataMax.value) });

// Updates Selection and Exact Input Values when Q-Range Slider is moved
const handleRangeChange = (newRange: { min: number; max: number }) => {
    minInput.value = newRange.min.toFixed(3);
    maxInput.value = newRange.max.toFixed(3);

    if (
        !isNaN(newRange.min) &&
        !isNaN(newRange.max) &&
        newRange.min <= newRange.max
    ) {
        updateBrushSelection(newRange.min, newRange.max);
    }
};

// Updates Selection store
const updateBrushSelection = (min: number, max: number) => {
    emit('selectionChange', {
        plotName: props.plotName,
        range: [Number(min.toFixed(3)), Number(max.toFixed(3))],
    });
};

// Called when textbox values are changed.
const applyManualSelection = (min: number, max: number) => {
    if (!isNaN(min) && !isNaN(max) && min <= max) {
        updateBrushSelection(min, max);
        range.value.min = Number(min);
        range.value.max = Number(max);
    }
};

// Finds current brush selection, changes selection store, updates text box vals.
const clearBrushSelection = () => {
    try {
        const active = props.plotBrush.clauses.active;
        if (props.plotBrush) {
            emit('selectionChange', {
                plotName: active.source.field,
                range: null,
            });

            props.plotBrush.update({
                source: props.plotName,
                value: null,
                predicate: null,
            });
        }
    } catch (error) {
        emit('plot-error', props.plotName);
    }
};

const handleSelectionRemoved = (event: CustomEvent) => {
    if (props.plotName == event.detail) {
        range.value.min = dataMin.value;
        range.value.max = dataMax.value;
    }
};

// Vg Plot
function makePlot(column: string) {
    try {
        return vg.plot(
            // Background grey data
            vg.rectY(vg.from('current_cell_metadata'), {
                x: vg.bin(column),
                y: vg.count(),
                fill: '#cccccc',
                inset: 1,
            }),
            // Currently Selected Data
            vg.rectY(
                vg.from('current_cell_metadata', { filterBy: props.plotBrush }),
                {
                    x: vg.bin(column),
                    y: vg.count(),
                    fill: '#377eb8',
                    opacity: 1,
                    inset: 1,
                }
            ),
            vg.marginBottom(45),
            vg.marginTop(5),
            vg.marginLeft(20),
            vg.marginRight(20),
            vg.width(268),
            vg.height(85),
            vg.style({ 'font-size': '.85em' }),
            vg.xDomain(vg.toFixed),
            vg.xLabelAnchor('center'),
            vg.xTickPadding(8),
            vg.xLabelOffset(38),
            vg.xInsetLeft(0),
            vg.xInsetRight(0),
            vg.xTickSpacing(100),
            vg.yAxis(null),
            vg.xLine(false),
            vg.xNice(false)
        );
    } catch (error) {
        emit('plot-error', props.plotName);
    }
}

// Dialog box, enter exact numbers ------
const showRangeDialog = ref(false);
const minInput = ref('');
const maxInput = ref('');

const openRangeDialog = () => {
    minInput.value = range.value.min.toString();
    maxInput.value = range.value.max.toString();
    showRangeDialog.value = true;
};

const onSubmit = () => {
    if (minInput.value !== '' && maxInput.value !== '') {
        applyManualSelection(Number(minInput.value), Number(maxInput.value));
        showRangeDialog.value = false;
    }
};

const validateRealNumber = (val: string) => {
    if (val === '') return true;
    const num = parseFloat(val);
    return !isNaN(num) || 'Please enter a real number';
};

const validateMinMax = () => {
    if (minInput.value !== '' && maxInput.value !== '') {
        return (
            parseFloat(minInput.value) <= parseFloat(maxInput.value) ||
            'Min should be less than or equal to Max'
        );
    }
    return true;
};

// Handle Loading of Everything
const charts = ref<null | HTMLElement>(null);
const loaded = ref(false);

// Creates the Plots.
async function createCharts() {
    try {
        charts.value = makePlot(props.plotName);
        if (plotContainer.value) {
            plotContainer.value.appendChild(charts.value!);
            loaded.value = true;
        }
    } catch (error) {
        console.error('Error creating charts:', error);
        emit('plot-error', props.plotName);
    }
}

// Checks when everything has loaded
watch(loaded, () => {
    dataRange().catch((error) => {
        console.error('Error in dataRange:', error);
        emit('plot-error', props.plotName);
    });
    handlePlotLoading();
});

// Waits for data range to load, then waits a bit, then notifies plotselector to show everything.
const handlePlotLoading = async () => {
    try {
        await dataRange();
        // Wait for 0.5 seconds before emitting the plot-loaded event
        await new Promise((resolve) => setTimeout(resolve, 500));
        emit('plot-loaded');
    } catch (error) {
        console.error('Error in handlePlotLoading:', error);
        emit('plot-error', props.plotName);
    }
};

// Handle Rendering
onMounted(() => {
    if (dataInitialized.value) {
        createCharts();
        dataRange().catch((error) => {
            console.error('Error in dataRange:', error);
            emit('plot-error', props.plotName);
        });
    }
});

// Waits for data to be initialized before creating charts
watch(dataInitialized, createCharts);

watch(range, handleRangeChange);

// Remove Selection
window.addEventListener(
    'selectionRemoved',
    handleSelectionRemoved as EventListener
);

const plotContainer = ref<HTMLDivElement | null>(null);
</script>

<template>
    <div>
        <q-item-section style="position: relative">
            <!-- Plot Container, and Q-Range Slider -->
            <div
                ref="plotContainer"
                @clearSelection="clearBrushSelection"
                style="position: relative"
            >
                <!-- Q-Menu for other options -->
                <q-menu touch-position context-menu>
                    <q-item clickable v-close-popup @click="openRangeDialog">
                        <q-item-section>Enter Range</q-item-section>
                    </q-item>
                </q-menu>

                <div class="q-range-container">
                    <q-range
                        v-model="range"
                        :min="dataMin"
                        :max="dataMax"
                        :step="0.001"
                        label
                        thumb-size="14px"
                        track-size="2px"
                        switch-label-side
                        selection-color="#377eb8"
                        track-color="hidden"
                    />
                </div>
            </div>
        </q-item-section>

        <!-- Q-Dialog for entering min and max values -->
        <q-dialog v-model="showRangeDialog">
            <q-card>
                <q-card-section>
                    <div class="text-h6">Enter Range</div>
                </q-card-section>

                <q-card-section>
                    <q-form @submit="onSubmit" class="q-gutter-md">
                        <q-input
                            filled
                            type="number"
                            step="any"
                            v-model="minInput"
                            label="Min"
                            lazy-rules
                            :rules="[validateRealNumber]"
                        />

                        <q-input
                            filled
                            type="number"
                            step="any"
                            v-model="maxInput"
                            label="Max"
                            lazy-rules
                            :rules="[validateRealNumber]"
                        />

                        <div>
                            <q-btn
                                label="Submit"
                                type="submit"
                                color="primary"
                                :disable="!validateMinMax()"
                            />
                            <q-btn
                                label="Cancel"
                                color="primary"
                                flat
                                @click="showRangeDialog = false"
                                class="q-ml-sm"
                            />
                        </div>
                    </q-form>
                </q-card-section>
            </q-card>
        </q-dialog>
    </div>
</template>

<style scoped>
.q-range-container {
    padding: 0 20px;
    position: absolute;
    bottom: 20px;
    left: 0;
    right: 0;
}
</style>
