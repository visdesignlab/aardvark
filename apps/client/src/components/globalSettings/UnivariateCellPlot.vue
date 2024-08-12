<script lang="ts" setup>
import { ref, watch, onMounted } from 'vue';
import type { PropType } from 'vue';
import * as vg from '@uwdata/vgplot';
import { useCellMetaData } from '@/stores/cellMetaData';
import { useSelectionStore } from '@/stores/selectionStore';
import { storeToRefs } from 'pinia';
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
const emit = defineEmits(['selectionChange', 'plot-loaded']);
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

// Sets range (min and max) of plot
async function dataRange() {
    try {
        // Finds min and max from duckDB
        const result = await vg.coordinator().query(
            `SELECT MIN(${props.plotName}) as min, MAX(${props.plotName}) as max
            FROM current_cell_metadata`,
            { type: 'json' }
        );

        const { min, max } = result[0];
        dataMin.value = Number(min.toFixed(3));
        dataMax.value = Number(max.toFixed(3));

        // Check for existing selection in the store
        const currentSelection = selectionStore.Selections.find(
            (selection) => selection.plotName === props.plotName
        );

        if (currentSelection) {
            // Use selection range if present
            range.value.min = currentSelection.range[0];
            range.value.max = currentSelection.range[1];
        } else {
            // Fallback to dataMin and dataMax
            range.value.min = dataMin.value;
            range.value.max = dataMax.value;
        }
    } catch (error) {
        console.error('Error fetching data range:', error);
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
};

const handleSelectionRemoved = (event: CustomEvent) => {
    if (props.plotName == event.detail) {
        range.value.min = dataMin.value;
        range.value.max = dataMax.value;
    }
};

// Vg Plot
function makePlot(column: string) {
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
                fill: 'steelblue',
                opacity: 1,
                inset: 1,
                tip: {
                    anchor: 'bottom',
                },
            }
        ),
        vg.marginBottom(130),
        vg.marginTop(30),
        vg.width(600),
        vg.height(250),
        vg.style({ 'font-size': '30px' }),
        vg.xDomain(vg.toFixed),
        vg.xLabelAnchor('center'),
        vg.xTickPadding(10),
        vg.xLabelOffset(80),
        vg.xAxis('bottom'),
        vg.xLine(true),
        vg.xAlign(0),
        vg.xInsetRight(20),
        vg.xTickSpacing(100),
        vg.yLabelAnchor('top'),
        vg.yAxis(null),
        vg.xLine(false),
        vg.yTicks(0)
    );
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

// Handle Loading
const charts = ref<null | HTMLElement>(null);
const loaded = ref(false);

async function createCharts() {
    charts.value = makePlot(props.plotName);
    if (plotContainer.value) {
        plotContainer.value.appendChild(charts.value!);
        loaded.value = true;
    }
}
watch(loaded, () => {
    dataRange();
    handlePlotLoading();
});
const handlePlotLoading = async () => {
    await dataRange();
    // Wait for 0.5 seconds before emitting the plot-loaded event
    await new Promise((resolve) => setTimeout(resolve, 500));
    emit('plot-loaded');
};

// Handle Rendering
onMounted(() => {
    if (dataInitialized.value) {
        createCharts();
        dataRange();
    }
});

watch(dataInitialized, createCharts);
watch(range, handleRangeChange);

// Remove Selection
window.addEventListener(
    'selectionRemoved',
    handleSelectionRemoved as EventListener
);

// Opening Context Menu
document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
});

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
                <q-menu touch-position anchor="top right" self="top right">
                    <q-item clickable @click="openRangeDialog">
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
                        selection-color="steel-blue"
                        track-color="hidden"
                        drag-range
                    />
                </div>
            </div>
        </q-item-section>

        <!-- Q-Dialog for entering min and max values -->
        <q-dialog v-model="showRangeDialog">
            <q-card>
                <q-card-section>
                    <div>Enter Range</div>
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
    bottom: 40px;
    left: 0;
    right: 0;
}
</style>
