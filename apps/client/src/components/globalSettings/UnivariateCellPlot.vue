<script lang="ts" setup>
import { ref, watch, onMounted, computed } from 'vue';
import type { PropType } from 'vue';
import * as vg from '@uwdata/vgplot';
import { useCellMetaData } from '@/stores/cellMetaData';
import { useSelectionStore, type DataSelection } from '@/stores/selectionStore';
import { storeToRefs } from 'pinia';
import FilterEditMenu from './FilterEditMenu.vue';
import { useGlobalSettings } from '@/stores/globalSettings';
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
const globalSettings = useGlobalSettings();
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

// Called when textbox values are changed.
const applyManualSelection = (min: number, max: number) => {
    if (!isNaN(min) && !isNaN(max) && min <= max) {
        rangeModel.value = { min, max };
    }
};

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
    handlePlotLoading();
});

// Waits for data range to load, then waits a bit, then notifies plotselector to show everything.
async function handlePlotLoading() {
    try {
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
    }
});

// Waits for data to be initialized before creating charts
watch(dataInitialized, createCharts);

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

const handleRangeUpdate = (newRange: { min: number; max: number }) => {
    rangeModel.value = newRange;
};
</script>

<template>
    <div>
        <q-item-section style="position: relative">
            <div ref="plotContainer" style="position: relative">
                <FilterEditMenu
                    :plot-name="props.plotName"
                    :initial-min="rangeModel.min"
                    :initial-max="rangeModel.max"
                    type="selection"
                    @update:range="handleRangeUpdate"
                    :dark="globalSettings.darkMode"
                />

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
                        :dark="globalSettings.darkMode"
                    />
                </div>
            </div>
        </q-item-section>
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
