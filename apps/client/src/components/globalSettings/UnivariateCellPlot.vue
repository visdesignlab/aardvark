<template>
    <div v-if="cellMetaData.dataInitialized">
        <q-item-section>
            <div class="q-item-section__right">
                <q-btn
                    class="gt-xs"
                    size="12px"
                    flat
                    dense
                    round
                    icon="filter_alt"
                    color="grey-7"
                />
            </div>
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

const vgPlotContainer1 = ref<HTMLDivElement | null>(null);
const cellMetaData = useCellMetaData();
const datasetSelectionStore = useDatasetSelectionStore();
const { dataInitialized } = storeToRefs(cellMetaData);

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

// Current Selection HTML
const currSel = document.getElementById('currSel');

// Brush selection
// const plotBrush = vg.Selection.intersect();
// vg.Selection.crossfilter();

const makePlot = (column: string) => {
    console.log('makePlot Start');
    // Optional Text Underneath Plots
    //const rangeText = document.createElement('div');
    //rangeText.classList.add('vgPlotContainer');

    // Tracking brush range
    const minX = ref(0);
    const maxX = ref(0);
    // Event for the brush.
    props.plotBrush.addEventListener('value', () => {
        const selectedRange = props.plotBrush.active.value;
        if (selectedRange) {
            minX.value = selectedRange[0];
            maxX.value = selectedRange[1];
        }
        // Optional Text Underneath Plots, must return rangeText in function.
        //rangeText.textContent = `[${Math.round(minX.value * 1000) / 1000}, ${Math.round(maxX.value * 1000) / 1000}]`;

        // Set text content
        // currSel.textContent = `[${Math.round(minX.value * 1000) / 1000}, ${
        //     Math.round(maxX.value * 1000) / 1000
        // }]`;
    });

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
        vg.intervalX({
            as: props.plotBrush,
            brush: { fill: 'red', stroke: '#888' },
            peers: true,
        }), // Add plot-specific brush selection
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
        vg.yTicks(0),
        vg.text({
            x: props.plotBrush,
            text: props.plotBrush,
            frameAnchor: 'top',
            lineAnchor: 'bottom',
            dy: -7,
        })
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

    //Load data into the database
    // await vg.coordinator().exec([
    //     vg.loadObjects('dummy_data', [
    //         { mass: 1, 'Time (h)': 3, Mass_norm: 2 },
    //         { mass: 2, 'Time (h)': 4, Mass_norm: 8 },
    //     ]),
    // ]);

    // const dummy = [
    //     { mass: 1, time: 3, Mass_norm: 2 },
    //     { mass: 11, time: 3, Mass_norm: 2 },
    // ];

    // console.log(dummy);
    // const realData = JSON.parse(
    //     JSON.stringify(dummyCellData.value?.slice(50, 110))
    // );
    // console.log(realData);

    //console.log('data: ', dummyCellData.value);

    // await vg.coordinator().exec([vg.loadObjects('dummy_data', realData)]);

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

//         //Load data into the database
//         // await vg.coordinator().exec([
//         //     vg.loadObjects('dummy_data', [
//         //         { 'Mass (pg)': 1, 'Time (h)': 3, Mass_norm: 2 },
//         //         { 'Mass (pg)': 1, 'Time (h)': 4, Mass_norm: 8 },
//         //         { 'Mass (pg)': 1, 'Time (h)': 5, Mass_norm: 3 },
//         //         { 'Mass (pg)': 3, 'Time (h)': 5, Mass_norm: 7 },
//         //         { 'Mass (pg)': 3, 'Time (h)': 5, Mass_norm: 3 },
//         //         { 'Mass (pg)': 5, 'Time (h)': 2, Mass_norm: 4 },
//         //         { 'Mass (pg)': 5, 'Time (h)': 3, Mass_norm: 1 },
//         //         { 'Mass (pg)': 7, 'Time (h)': 4, Mass_norm: 1 },
//         //         { 'Mass (pg)': 1, 'Time (h)': 3, Mass_norm: 2 },
//         //         { 'Mass (pg)': 2, 'Time (h)': 3, Mass_norm: 8 },
//         //         { 'Mass (pg)': 1, 'Time (h)': 1, Mass_norm: 1 },
//         //         { 'Mass (pg)': 2, 'Time (h)': 8, Mass_norm: 4 },
//         //         { 'Mass (pg)': 3, 'Time (h)': 4, Mass_norm: 5 },
//         //         { 'Mass (pg)': 4, 'Time (h)': 0, Mass_norm: 2 },
//         //         { 'Mass (pg)': 5, 'Time (h)': 1, Mass_norm: 3 },
//         //         { 'Mass (pg)': 0, 'Time (h)': 7, Mass_norm: 0 },
//         //     ]),
//         // ]);
</script>

<style scoped>
.plot-container {
    display: flex;
    align-items: center;
    text-align: center;
}
.q-item-section__right {
    display: flex;
    justify-content: flex-end;
}
</style>
