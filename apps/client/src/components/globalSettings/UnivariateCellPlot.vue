<template>
    <div v-if="cellMetaData.dataInitialized && visible">
        <q-item-section style="position: relative">
            <div
                id="plotContainer"
                ref="vgPlotContainer"
                @clearSelection="clearBrushSelection"
                style="position: relative"
            ></div>
            <div
                class="selection-box left"
                style="position: absolute; bottom: 12px"
            >
                <input
                    type="text"
                    :value="minValue"
                    @input="updateMinValue($event.target.value)"
                    @keyup.enter="handleEnter($event)"
                    @blur="applyManualFilter()"
                    @focus="$event.target.select()"
                    class="minMax"
                />
            </div>
            <div
                class="selection-box right"
                style="position: absolute; bottom: 12px; right: 0"
            >
                <input
                    type="text"
                    :value="maxValue"
                    @input="updateMaxValue($event.target.value)"
                    @keyup.enter="handleEnter($event)"
                    @blur="applyManualFilter()"
                    @focus="$event.target.select()"
                    class="minMax"
                />
            </div>
        </q-item-section>
    </div>
</template>

<script lang="ts" setup>
import { ref, watch } from 'vue';
import type { PropType } from 'vue';
import * as vg from '@uwdata/vgplot';
import { useCellMetaData } from '@/stores/cellMetaData';
import { useDatasetSelectionStore } from '@/stores/datasetSelectionStore';
import { useSelectionStore } from '@/stores/selectionStore';
import { storeToRefs } from 'pinia';

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
        type: Object as PropType<vg.Selection>,
        required: true,
    },
    visible: {
        type: Boolean as PropType<boolean>,
        required: true,
    },
});

const minValue = ref('min');
const maxValue = ref('max');

const updateMinValue = (value: string) => {
    minValue.value = value;
};

const updateMaxValue = (value: string) => {
    maxValue.value = value;
};

const handleEnter = (event: KeyboardEvent) => {
    //event.preventDefault(); // Prevent default form submission on Enter
    applyManualFilter();
    //event.target.blur(); // Manually blur the input element
};

// Called by applyManualFilter when min and max textbox values are entered.
const updateBrushSelection = (min: number, max: number) => {
    console.log(props.plotBrush);
    if (props.plotBrush) {
        if (props.plotBrush.clauses && props.plotBrush.clauses.length > 0) {
            const clauseIndex = props.plotBrush.clauses.findIndex(
                (clause) => clause.source.field === props.plotName
            );

            if (clauseIndex !== -1) {
                const clause0 = props.plotBrush.clauses[clauseIndex];
                clause0.source.value = [min, max];
                const clause = {
                    clients: clause0.clients,
                    meta: clause0.meta,
                    predicate: `${props.plotName} BETWEEN ${min} AND ${max}`,
                    source: clause0.source,
                    value: [min, max],
                };

                //props.plotBrush.activate(clause);
                props.plotBrush.update(clause);
            } else {
                console.log(min, max);
                const clause = {
                    source: props.plotName,
                    value: [min, max],
                    predicate: `${props.plotName} BETWEEN ${min} AND ${max}`,
                };

                //props.plotBrush.activate(clause);
                props.plotBrush.update(clause);
            }
        } else {
            console.log(min, max);
            const clause = {
                source: props.plotName,
                value: [min, max],
                predicate: `${props.plotName} BETWEEN ${min} AND ${max}`,
            };

            //props.plotBrush.activate(clause);
            props.plotBrush.update(clause);
        }
    }

    // Update the store
    selectionStore.updateSelection(props.plotName, [
        min.toFixed(2),
        max.toFixed(2),
    ]);

    handleIntervalChange();
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
    console.log(props.plotBrush);
    const active = props.plotBrush.clauses.active;
    if (active && Array.isArray(active.value)) {
        const clauses = props.plotBrush.clauses;
        if (Array.isArray(clauses) && clauses.length > 0) {
            // Iterate through all clauses
            clauses.forEach((clause) => {
                const plotName = clause.predicate.column;
                const range = clause.value;
                // PlotSelector listens for this and updates current selections view.
                emit('selectionChange', {
                    plotName: plotName,
                    range: range,
                });
            });
        } else {
            // Clear all selections if no clauses are present
            emit('selectionChange', {
                plotName: props.plotName,
                range: null,
            });
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
    if (!props.visible) return;
    // Configure the coordinator to use DuckDB-WASM
    vg.coordinator().databaseConnector(vg.wasmConnector());
    if (!datasetSelectionStore.currentLocationMetadata) {
        return;
    }
    const url = datasetSelectionStore.getServerUrl(
        datasetSelectionStore.currentLocationMetadata.tabularDataFilename
    );
    await vg.coordinator().exec([vg.loadCSV('dummy_data', url)]);
    charts.value = makePlot(props.plotName);
    if (vgPlotContainer.value) {
        vgPlotContainer.value.appendChild(charts.value!);
    }
}

function makePlot(column: string) {
    const plot = vg.plot(
        vg.rectY(vg.from('dummy_data'), {
            x: vg.bin(column),
            y: vg.count(),
            fill: '#cccccc',
            inset: 1,
        }),
        vg.rectY(vg.from('dummy_data', { filterBy: props.plotBrush }), {
            x: vg.bin(column),
            y: vg.count(),
            fill: 'steelblue',
            opacity: 1,
            inset: 1,
        }),
        vg.intervalX({
            as: props.plotBrush,
            peers: true,
        }),
        vg.marginBottom(130),
        vg.marginTop(30),
        vg.width(600),
        vg.height(250),
        vg.style({ 'font-size': '30px' }),
        vg.xDomain(vg.Fixed),
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
        vg.yTicks(0)
    );
    return plot;
}

props.plotBrush.addEventListener('value', handleIntervalChange);
watch(() => props.visible, createCharts);
watch(dataInitialized, createCharts);
</script>

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
