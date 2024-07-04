<template>
    <div v-if="cellMetaData.dataInitialized">
        <q-item-section style="position: relative">
            <div
                id="plotContainer"
                ref="vgPlotContainer1"
                @clearSelection="clearBrushSelection"
                style="position: relative"
            ></div>
            <div
                class="selection-box left"
                style="position: absolute; bottom: 12px"
            >
                <input
                    type="text"
                    :value="getMinValue()"
                    @input="
                        $emit('updateMinValue', parseFloat($event.target.value))
                    "
                    @focus="$event.target.select()"
                    @blur="
                        $event.target.value !== getMinValue() &&
                            $emit(
                                'updateMinValue',
                                parseFloat($event.target.value)
                            )
                    "
                    @keydown.enter.prevent="$event.target.blur()"
                    style="
                        width: 56px;
                        padding: 2px 5px;
                        border: 1px solid lightgrey;
                        border-radius: 4px;
                        font-size: 11px;
                        line-height: 12px;
                        color: gray;
                        text-align: center;
                    "
                    class="hover-effect"
                />
            </div>
            <div
                class="selection-box right"
                style="position: absolute; bottom: 12px; right: 0"
            >
                <input
                    type="text"
                    :value="getMaxValue()"
                    @input="
                        $emit('updateMaxValue', parseFloat($event.target.value))
                    "
                    @focus="$event.target.select()"
                    @blur="
                        $event.target.value !== getMinValue() &&
                            $emit(
                                'updateMinValue',
                                parseFloat($event.target.value)
                            )
                    "
                    @keydown.enter.prevent="$event.target.blur()"
                    style="
                        width: 56px;
                        display: flex;
                        align-items: center;
                        box-sizing: border-box;
                        padding: 2px 5px;
                        border: 1px solid lightgrey;
                        border-radius: 4px;
                        font-size: 11px;
                        line-height: 12px;
                        color: gray;
                        text-align: center;
                    "
                    class="hover-effect"
                />
            </div>
        </q-item-section>
    </div>
</template>

<script lang="ts" setup>
import { ref, computed, toRaw, watch } from 'vue';
import type { PropType } from 'vue';
import { QBtn } from 'quasar';
import * as vg from '@uwdata/vgplot';
import { useCellMetaData } from '@/stores/cellMetaData';
import { useDatasetSelectionStore } from '@/stores/datasetSelectionStore';
import { useSelectionStore } from '@/stores/selectionStore';
import { storeToRefs } from 'pinia';
import PlotSelector from './PlotSelector.vue';
import { isNull } from 'lodash-es';
import FilterSelector from './FilterSelector.vue';

const vgPlotContainer1 = ref<HTMLDivElement | null>(null);
const cellMetaData = useCellMetaData();
const datasetSelectionStore = useDatasetSelectionStore();
const { dataInitialized } = storeToRefs(cellMetaData);

const emit = defineEmits([
    'selectionChange',
    'updateMinValue',
    'updateMaxValue',
]);
const selectionStore = useSelectionStore();
const { Selections } = storeToRefs(selectionStore);

interface clearSelectionEvent {
    plotName: string;
}

const props = defineProps({
    plotName: {
        type: String as PropType<string>,
        required: true,
    },
    plotBrush: {
        type: Object as PropType<vg.Selection>,
        required: true,
    },
});

// Event handler for interval changes
const handleIntervalChange = () => {
    const clauses = props.plotBrush.clauses;
    const active = props.plotBrush.clauses.active;

    if (active.value == undefined) {
        emit('selectionChange', {
            plotName: active.source.field,
            range: null,
        });
    }
    if (Array.isArray(clauses) && clauses.length > 0) {
        // Iterate through all clauses
        clauses.forEach((clause) => {
            const plotName = clause.predicate.column; // The plot name is stored in the column property
            const range = clause.value;

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
};

const getMinValue = () => {
    const selection = Selections.value.find(
        (s) => s.plotName === props.plotName
    );
    if (selection && Array.isArray(selection.range)) {
        return parseFloat(selection.range[0]).toFixed(3); // Access first element and truncate
    } else {
        return 'min'; // Or you can return any default value if no selection exists
    }
};

const getMaxValue = () => {
    const selection = Selections.value.find(
        (s) => s.plotName === props.plotName
    );
    if (selection && Array.isArray(selection.range)) {
        return parseFloat(selection.range[1]).toFixed(3); // Access second element and truncate
    } else {
        return 'max'; // Or you can return any default value if no selection exists
    }
};

const clearBrushSelection = () => {
    // console.log('Clearing brush selection for:', props.plotName);
    // if (props.plotBrush) {
    //     props.plotBrush.update({
    //         source: props.plotName,
    //         value: null,
    //         predicate: `${props.plotName} IS NOT NULL`, // This predicate is always true for non-null values
    //     });
    // }
};

defineExpose({ clearBrushSelection });

watch(
    () => Selections.value,
    (newSelections) => {
        const selectionExists = newSelections.some(
            (s) => s.plotName === props.plotName
        );
        if (!selectionExists) {
            clearBrushSelection();
        }
    },
    { deep: true }
);

// props.plotBrush.addEventListener('clearSelection', clearBrushSelection);
props.plotBrush.addEventListener('value', handleIntervalChange);

const makePlot = (column: string) => {
    console.log('plot');
    const plot = vg.plot(
        vg.name('ploted'),

        vg.rectY(
            vg.from('dummy_data'), // Use plot-specific brush for filtering
            {
                x: vg.bin(column),
                y: vg.count(),
                fill: 'steelblue',
                inset: 1,
            }
        ),
        vg.rectY(
            vg.from('dummy_data', { filterBy: props.plotBrush }), // Use plot-specific brush for filtering
            {
                x: vg.bin(column),
                y: vg.count(),
                fill: '#FFA500',
                opacity: 1,
                inset: 1,
            }
        ),
        vg.intervalX({
            as: props.plotBrush,
            brush: { stroke: '#888' },
            peers: true,
        }),
        vg.xDomain(vg.Fixed),
        vg.marginBottom(130),
        vg.marginTop(30),
        vg.width(600),
        vg.height(250),
        vg.style({ 'font-size': '30px' }),
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
        // vg.text({
        //     x: () => {
        //         if (props.plotBrush.clauses) {
        //             const selection = selectionStore.Selections.find(
        //                 (s) => s.plotName === column
        //             );
        //             if (selection) {
        //                 const value = selection.range;
        //                 if (Array.isArray(value)) {
        //                     return parseFloat(value[0]).toFixed(3); // Access first element and truncate
        //                 } else {
        //                     return parseFloat(value).toFixed(3); // Handle string case (from previous code)
        //                 }
        //             }
        //         } else {
        //             return undefined; // Or you can return an empty string ""
        //         }
        //     },
        //     text: () => {
        //         if (props.plotBrush.clauses) {
        //             const selection = selectionStore.Selections.find(
        //                 (s) => s.plotName === column
        //             );
        //             if (selection) {
        //                 const value = selection.range;
        //                 if (Array.isArray(value)) {
        //                     return parseFloat(value[0]).toFixed(3); // Access first element and truncate
        //                 } else {
        //                     return parseFloat(value).toFixed(3); // Handle string case (from previous code)
        //                 }
        //             }
        //         } else {
        //             return undefined; // Or you can return an empty string ""
        //         }
        //     },
        //     frameAnchor: 'top',
        //     lineAnchor: 'bottom',
        //     dy: -7,
        //     // dx: -55,
        //     textAnchor: 'end',
        // }),
        // vg.text({
        //     x: () => {
        //         if (props.plotBrush.clauses) {
        //             const selection = selectionStore.Selections.find(
        //                 (s) => s.plotName === column
        //             );
        //             if (selection) {
        //                 const value = selection.range;
        //                 if (Array.isArray(value)) {
        //                     return parseFloat(value[1]).toFixed(3); // Access first element and truncate
        //                 } else {
        //                     return parseFloat(value).toFixed(3); // Handle string case (from previous code)
        //                 }
        //             }
        //         } else {
        //             return undefined; // Or you can return an empty string ""
        //         }
        //     },
        //     text: () => {
        //         if (props.plotBrush.clauses) {
        //             const selection = selectionStore.Selections.find(
        //                 (s) => s.plotName === column
        //             );
        //             if (selection) {
        //                 const value = selection.range;
        //                 if (Array.isArray(value)) {
        //                     return parseFloat(value[1]).toFixed(3); // Access first element and truncate
        //                 } else {
        //                     return parseFloat(value).toFixed(3); // Handle string case (from previous code)
        //                 }
        //             }
        //         } else {
        //             return undefined; // Or you can return an empty string ""
        //         }
        //     },
        //     frameAnchor: 'top',
        //     lineAnchor: 'bottom',
        //     dy: -7,
        //     textAnchor: 'start',
        // })
    );
    console.log('plotAfter');

    return plot;
};

const dummyCellData = computed(() => {
    return cellMetaData.cellArray?.map((cell) => {
        return toRaw(cell.attrNum);
    });
});

const charts = ref<null | HTMLElement>(null);

watch(dataInitialized, createCharts);
//createCharts();

async function createCharts() {
    console.log('test');

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
    if (vgPlotContainer1.value) {
        vgPlotContainer1.value.appendChild(charts.value!);
    }
}
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
.hover-effect {
    background-color: white; /* Default background */
    transition: background-color 0.2s ease-in-out; /* Smooth transition */
}

.hover-effect:hover {
    background-color: #f0f0f0; /* Hover background color */
}
</style>
