<script lang="ts" setup>
import { ref, watch, onMounted, computed } from 'vue';
import type { PropType } from 'vue';
import * as vg from '@uwdata/vgplot';
import { useCellMetaData } from '@/stores/cellMetaData';
import { useSelectionStore, type DataSelection } from '@/stores/selectionStore';
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

// Called when textbox values are changed.
const applyManualSelection = (min: number, max: number) => {
    if (!isNaN(min) && !isNaN(max) && min <= max) {
        rangeModel.value = { min, max };
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
        //TODO: UPDATE
        // range.value.min = dataMin.value;
        // range.value.max = dataMax.value;
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
const minInput = ref<number>();
const maxInput = ref<number>();

function openRangeDialog() {
    minInput.value = rangeModel.value.min;
    maxInput.value = rangeModel.value.max;
    showRangeDialog.value = true;
}

function onSubmit() {
    if (typeof minInput.value === 'undefined') return;
    if (typeof maxInput.value === 'undefined') return;
    applyManualSelection(minInput.value, maxInput.value);
    showRangeDialog.value = false;
}

const minMaxFormError = computed<string | boolean>(() => {
    // returns an error string if invalid
    // otherwise returns false
    // @ts-ignore: actually it can be '', I would expect quasar to make this undefined or null, but it doesn't
    if (typeof minInput.value === 'undefined' || minInput.value === '')
        return 'Min cannot be undefined.';
    // @ts-ignore: actually it can be '', I would expect quasar to make this undefined or null, but it doesn't
    if (typeof maxInput.value === 'undefined' || maxInput.value === '')
        return 'Max cannot be undefined.';
    if (minInput.value > maxInput.value)
        return 'Min should be less than or equal to Max.';
    return false;
});

const minMaxFormValid = computed<boolean>(() => {
    return !minMaxFormError.value;
});

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
    // dataRange().catch((error) => {
    //     console.error('Error in dataRange:', error);
    //     emit('plot-error', props.plotName);
    // });
    handlePlotLoading();
});

// Waits for data range to load, then waits a bit, then notifies plotselector to show everything.
async function handlePlotLoading() {
    try {
        // await dataRange();
        // Wait for 0.5 seconds before emitting the plot-loaded event
        await new Promise((resolve) => setTimeout(resolve, 500));
        emit('plot-loaded');
    } catch (error) {
        console.error('Error in handlePlotLoading:', error);
        emit('plot-error', props.plotName);
    }
}

// Handle Rendering
onMounted(() => {
    if (dataInitialized.value) {
        createCharts();
        // dataRange().catch((error) => {
        //     console.error('Error in dataRange:', error);
        //     emit('plot-error', props.plotName);
        // });
    }
});

// Waits for data to be initialized before creating charts
watch(dataInitialized, createCharts);

// watch(range, handleRangeChange);

// Remove Selection
window.addEventListener(
    'selectionRemoved',
    handleSelectionRemoved as EventListener
);

const plotContainer = ref<HTMLDivElement | null>(null);

const selection = computed<DataSelection>(() => {
    const s = selectionStore.getSelection(props.plotName);
    if (!s) {
        return {
            plotName: 'not found',
            type: 'cell',
            range: [0, 0],
            maxRange: [0, 0],
            displayChart: true,
        };
    }
    return s;
});

const rangeModel = computed({
    get() {
        return { min: selection.value.range[0], max: selection.value.range[1] };
    },
    set(newValue) {
        selection.value.range[0] = newValue.min;
        selection.value.range[1] = newValue.max;
    },
});
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
                        v-model="rangeModel"
                        :min="selection.maxRange[0]"
                        :max="selection.maxRange[1]"
                        :step="0.001"
                        :left-label-value="rangeModel.min.toFixed(2)"
                        :right-label-value="rangeModel.max.toFixed(2)"
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
                            v-model.number="minInput"
                            label="Min"
                            lazy-rules
                        />

                        <q-input
                            filled
                            type="number"
                            step="any"
                            v-model.number="maxInput"
                            label="Max"
                            lazy-rules
                        />

                        <q-banner
                            v-if="minMaxFormError"
                            dense
                            class="text-white bg-red"
                            >{{ minMaxFormError }}</q-banner
                        >
                        <div>
                            <q-btn
                                label="Submit"
                                type="submit"
                                color="primary"
                                :disable="!minMaxFormValid"
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
