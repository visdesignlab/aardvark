<script lang="ts" setup>
import { ref, watch, onMounted } from 'vue';
import type { PropType } from 'vue';
import * as vg from '@uwdata/vgplot';
import { useCellMetaData } from '@/stores/cellMetaData';
import { useDatasetSelectionStore } from '@/stores/datasetSelectionStore';
import { useSelectionStore } from '@/stores/selectionStore';
import { storeToRefs } from 'pinia';
import PlotSelector from './PlotSelector.vue';

const vgPlotContainer = ref<HTMLDivElement | null>(null);
const cellMetaData = useCellMetaData();
const datasetSelectionStore = useDatasetSelectionStore();
const { dataInitialized } = storeToRefs(cellMetaData);
const selectionStore = useSelectionStore();
const { Selections } = storeToRefs(selectionStore);
const emit = defineEmits(['selectionChange']);
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

const minValue = ref('min');
const maxValue = ref('max');
const chartInitialized = ref<boolean>(false);
const updateMinValue = (event: Event) => {
    const value = (event.target as HTMLInputElement).value;
    minValue.value = value;
};

const updateMaxValue = (event: Event) => {
    const value = (event.target as HTMLInputElement).value;
    maxValue.value = value;
};

const selectText = (event: Event) => {
    const target = event.target as HTMLInputElement;
    target.select();
};

const handleEnter = (event: KeyboardEvent) => {
    // Prevent default form submission on Enter
    event.preventDefault();

    // Apply the manual filter
    applyManualFilter();

    // Deselect the currently focused input element
    const activeElement = document.activeElement;
    if (activeElement instanceof HTMLInputElement) {
        activeElement.blur();
    }
};

// Called by applyManualFilter when min and max textbox values are entered.
const updateBrushSelection = (min: number, max: number) => {
    if (props.plotBrush) {
        if (props.plotBrush.clauses && props.plotBrush.clauses.length > 0) {
            // Is there a clause on this plot?
            const existingClauseIndex = props.plotBrush.clauses.findIndex(
                (clause: any) => clause.source.field === props.plotName
            );

            // If theres a clause on this plot, copy it and update it.
            if (existingClauseIndex !== -1) {
                const existingClause =
                    props.plotBrush.clauses[existingClauseIndex];
                existingClause.source.value = [min, max];
                const clause = {
                    predicate: `${props.plotName} BETWEEN ${min} AND ${max}`,
                    source: existingClause.source,
                    value: [min, max],
                };
                props.plotBrush.update(clause);
            }
            // Otherwise, make a new clause.
            else {
                const clause = {
                    source: props.plotName,
                    value: [min, max],
                    predicate: `${props.plotName} BETWEEN ${min} AND ${max}`,
                };

                props.plotBrush.update(clause);
            }
        }

        // Make a new clause even if none exist.
        else {
            const clause = {
                source: props.plotName,
                value: [min, max],
                predicate: `${props.plotName} BETWEEN ${min} AND ${max}`,
            };

            props.plotBrush.update(clause);
        }
    }

    // Update the store
    selectionStore.updateSelection(props.plotName, [
        min.toFixed(2),
        max.toFixed(2),
    ]);
};

// Called when textbox values are changed.
const applyManualFilter = () => {
    const min = parseFloat(minValue.value);
    const max = parseFloat(maxValue.value);
    if (
        typeof min === 'number' &&
        typeof max === 'number' &&
        !isNaN(min) &&
        !isNaN(max) &&
        min <= max
    ) {
        updateBrushSelection(min, max);
    }
};

// Brush Selection Changes update selection stores, or clear selections.
const handleIntervalChange = () => {
    //console.log(props.plotBrush);
    const active = props.plotBrush.clauses.active;
    if (active && Array.isArray(active.value)) {
        const clauses = props.plotBrush.clauses;
        if (Array.isArray(clauses) && clauses.length > 0) {
            // Find the clause for the current plot
            const currentClause = clauses.find(
                (clause) => clause.source.field === props.plotName
            );
            if (currentClause) {
                // Emit only the selection for the current plot
                emit('selectionChange', {
                    plotName: props.plotName,
                    range: currentClause.value,
                });
            }
        }
    } else {
        clearBrushSelection();
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
        minValue.value = 'min';
        maxValue.value = 'max';

        props.plotBrush.update({
            source: props.plotName,
            value: null,
            predicate: null,
        });
    }
};

// Updates the min and max values.
watch(
    () => Selections.value,
    (newSelections) => {
        const selection = newSelections.find(
            (s) => s.plotName === props.plotName
        );
        if (selection) {
            minValue.value = selection.range[0];
            maxValue.value = selection.range[1];
        } else {
            minValue.value = 'min';
            maxValue.value = 'max';
        }
    },
    { deep: true }
);

const charts = ref<null | HTMLElement>(null);
async function createCharts() {
    charts.value = makePlot(props.plotName);
    if (vgPlotContainer.value) {
        vgPlotContainer.value.appendChild(charts.value!);
    }
}

onMounted(() => {
    if (dataInitialized) {
        createCharts();
    }
});

function makePlot(column: string) {
    return vg.plot(
        vg.rectY(vg.from('current_cell_metadata'), {
            x: vg.bin(column),
            y: vg.count(),
            fill: '#cccccc',
            inset: 1,
        }),
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
        vg.intervalX({
            as: props.plotBrush,
            peers: true,
        }),
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
        //vg.xZero(true),
        vg.xInsetRight(20),
        vg.xTickSpacing(100),
        vg.yLabelAnchor('top'),
        vg.yAxis(null),
        vg.yTicks(0)
    );
}

props.plotBrush.addEventListener('value', handleIntervalChange);
watch(dataInitialized, createCharts);
</script>

<template>
    <div>
        <q-item-section style="position: relative">
            <div
                id="plotContainer"
                ref="vgPlotContainer"
                @clearSelection="clearBrushSelection"
                style="position: relative"
            ></div>
            <div
                class="selection-box left"
                style="position: absolute; bottom: 15px"
            >
                <input
                    type="text"
                    :value="minValue"
                    @input="updateMinValue($event)"
                    @keyup.enter="handleEnter($event)"
                    @blur="applyManualFilter()"
                    @focus="selectText($event)"
                    class="minMax"
                />
            </div>
            <div
                class="selection-box right"
                style="position: absolute; bottom: 15px; right: 0"
            >
                <input
                    type="text"
                    :value="maxValue"
                    @input="updateMaxValue($event)"
                    @keyup.enter="handleEnter($event)"
                    @blur="applyManualFilter()"
                    @focus="selectText($event)"
                    class="minMax"
                />
            </div>
        </q-item-section>
    </div>
</template>

<style scoped>
.plot-container {
    display: flex;
    align-items: center;
    text-align: center;
}
.selection-box {
    display: flex;
    align-items: center;
}
.minMax {
    width: 56px;
    padding: 2px 3px;
    border: 1px solid lightgrey;
    border-radius: 4px;
    font-size: 11px;
    line-height: 12px;
    color: gray;
    text-align: center;
    background-color: white;
    transition: background-color 0.2s ease-in-out;
}
.minMax:hover {
    background-color: #f0f0f0;
}
</style>
