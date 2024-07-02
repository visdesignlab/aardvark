<template>
    <div v-if="cellMetaData.dataInitialized">
        <q-item-section>
            <div id="plotContainer" ref="vgPlotContainer1"></div>
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
import { storeToRefs } from 'pinia';
import PlotSelector from './PlotSelector.vue';
import { isNull } from 'lodash-es';
import FilterSelector from './FilterSelector.vue';

const vgPlotContainer1 = ref<HTMLDivElement | null>(null);
const cellMetaData = useCellMetaData();
const datasetSelectionStore = useDatasetSelectionStore();
const { dataInitialized } = storeToRefs(cellMetaData);

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
});

// Event handler for interval changes
const handleIntervalChange = () => {
    const clauses = props.plotBrush.clauses;
    const active = props.plotBrush.clauses.active;
    console.log(clauses);

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
const clearBrushSelection = (plotName: string) => {
    console.log('reveived');
    if (plotName === props.plotName) {
        props.plotBrush.clear(); // Clear the brush selection for this plot
    }
};
props.plotBrush.addEventListener('clear-brush-selection', clearBrushSelection);
props.plotBrush.addEventListener('value', handleIntervalChange);

const makePlot = (column: string) => {
    // Optional Text Underneath Plots
    //const rangeText = document.createElement('div');
    //rangeText.classList.add('vgPlotContainer');

    // props.plotBrush.addEventListener('value', () => {
    //     const selectedRange = props.plotBrush.active.value;
    //     if (selectedRange) {
    //         minX.value = selectedRange[0];
    //         maxX.value = selectedRange[1];

    //         emit('selectionChange', {
    //             plotName: props.plotName,
    //             range: [minX.value, maxX.value],
    //         });
    //     } else {
    //         // Emit an event to clear the selection
    //         emit('selectionChange', {
    //             plotName: props.plotName,
    //             range: null,
    //         });
    //     }

    //     // Optional Text Underneath Plots, must return rangeText in function.
    //     //rangeText.textContent = `[${Math.round(minX.value * 1000) / 1000}, ${Math.round(maxX.value * 1000) / 1000}]`;

    //     // Set text content
    //     // currSel.textContent = `[${Math.round(minX.value * 1000) / 1000}, ${
    //     //     Math.round(maxX.value * 1000) / 1000
    //     // }]`;
    // });

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
        // vg.highlight({ by: props.plotBrush }),
        // vg.text({
        //     x: props.plotBrush,
        //     text: props.plotBrush,
        //     frameAnchor: 'top',
        //     lineAnchor: 'bottom',
        //     dy: -7,
        // })
        //vg.highlight({ by: props.plotBrush, channels: { fill: 'red' }})
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
</style>
