<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useElementSize } from '@vueuse/core';
import {
    useCellMetaData,
    type Lineage,
    type Track,
    type Cell,
} from '@/stores/cellMetaData';
import { useDataPointSelection } from '@/stores/dataPointSelection';
import { useSegmentationStore } from '@/stores/segmentationStore';
import CellSnippetsLayer from './layers/CellSnippetsLayer.js';
// import HorizonChartLayer from './layers/HorizonChartLayer.js';
// import RoundedRectangleLayer from './layers/RoundedRectangleLayer.js';
import { useImageViewerStore } from '@/stores/imageViewerStore';
import { useImageViewerStoreUntrracked } from '@/stores/imageViewerStoreUntrracked';
import { useDatasetSelectionStore } from '@/stores/datasetSelectionStore';
import { useEventBusStore } from '@/stores/eventBusStore';
import { useLooneageViewStore } from '@/stores/looneageViewStore';
import { clamp } from 'lodash-es';
import { Pool } from 'geotiff';
import type { Feature } from 'geojson';
import {
    expandHeight,
    getMaxHeight,
    type BBox,
    getWidth,
    getHeight,
} from '@/util/imageSnippets';

import {
    loadOmeTiff,
    getChannelStats,
    ImageLayer,
    XRLayer,
    AdditiveColormapExtension,
} from '@hms-dbmi/viv';

import type { PixelData, PixelSource } from '@vivjs/types';
import { Deck, OrthographicView, type PickingInfo } from '@deck.gl/core/typed';
import {
    GeoJsonLayer,
    LineLayer,
    ScatterplotLayer,
    SolidPolygonLayer,
    TextLayer,
} from '@deck.gl/layers/typed';

// import CustomScatterplotLayer from './layers/CustomScatterplot/CustomScatterplotLayer';3
import HorizonChartLayer from './layers/HorizonChartLayer/HorizonChartLayer';
// @ts-ignore
import { TripsLayer } from '@deck.gl/geo-layers';
import { render } from 'vue';
import { index } from 'd3-array';

const cellMetaData = useCellMetaData();

const dataPointSelection = useDataPointSelection();
const imageViewerStore = useImageViewerStore();
const imageViewerStoreUntrracked = useImageViewerStoreUntrracked();
const datasetSelectionStore = useDatasetSelectionStore();
const { currentLocationMetadata } = storeToRefs(datasetSelectionStore);
const { contrastLimitSlider } = storeToRefs(imageViewerStoreUntrracked);
const { frameNumber } = storeToRefs(imageViewerStore);
const { selectedTrack } = storeToRefs(cellMetaData);
const eventBusStore = useEventBusStore();
const segmentationStore = useSegmentationStore();
const looneageViewStore = useLooneageViewStore();

const deckGlContainer = ref(null);
//////////////////////////
// start temp test code //
//////////////////////////
const colormapExtension = new AdditiveColormapExtension();

const contrastLimit = computed<[number, number][]>(() => {
    return [[contrastLimitSlider.value.min, contrastLimitSlider.value.max]];
});
const loader = ref<any | null>(null);
const pixelSource = ref<any | null>(null);
const testRaster = ref<PixelData | null>(null);
watch(currentLocationMetadata, async () => {
    if (currentLocationMetadata.value?.imageDataFilename == null) return;
    if (deckgl == null) return;

    pixelSource.value = null;

    const fullImageUrl = datasetSelectionStore.getServerUrl(
        currentLocationMetadata.value.imageDataFilename
    );
    loader.value = await loadOmeTiff(fullImageUrl, { pool: new Pool() });
    imageViewerStoreUntrracked.sizeX = loader.value.metadata.Pixels.SizeX;
    imageViewerStoreUntrracked.sizeY = loader.value.metadata.Pixels.SizeY;
    imageViewerStoreUntrracked.sizeT = loader.value.metadata.Pixels.SizeT;

    testRaster.value = await loader.value.data[0].getRaster({
        selection: { c: 0, t: 0, z: 0 },
    });
    if (testRaster.value == null) return;
    const copy = testRaster.value.data.slice();
    const channelStats = getChannelStats(copy);
    contrastLimitSlider.value.min = channelStats.contrastLimits[0];
    contrastLimitSlider.value.max = channelStats.contrastLimits[1];
    imageViewerStore.contrastLimitExtentSlider.min = channelStats.domain[0];
    imageViewerStore.contrastLimitExtentSlider.max = channelStats.domain[1];

    pixelSource.value = loader.value.data[0] as PixelSource<any>;
    renderDeckGL();
});

//////////////////////////
// end temp test code   //
//////////////////////////
let deckgl: any | null = null;
onMounted(() => {
    deckgl = new Deck({
        initialViewState: {
            zoom: 0,
            target: [0, 0, 0],
            minZoom: -8,
            maxZoom: 8,
        },
        // @ts-ignore
        canvas: deckGlContainer.value?.id,
        views: new OrthographicView({
            id: 'looneage-controller',
            controller: true,
        }),
        controller: true,
        layers: [],
        // debug: true,
        // onBeforeRender: (gl: any) => {
        //     console.count('before');
        //     console.log(gl);
        // },
        // onAfterRender: (gl: any) => {
        //     console.count('after');
        //     console.log(gl);
        // },
        // onError: (error: any, _layer: any) => {
        //     console.error('ERROR');
        //     console.log(error);
        // },
        // onWebGLInitialized: () => console.log('onWebGLInitialized'),
        // onViewStateChange: () => console.log('onViewStateChange'),
        // onInteractionStateChange: () => console.log('onInteractionStateChange'),
        // onLoad: () => console.log('onLoad'),
    });
    // renderDeckGL();
});

const testGeometry = computed<number[]>(() => {
    if (!cellMetaData.selectedTrack) return [];
    // const areaGen = area<Cell>()
    //     .x((d: Cell) => cellMetaData.getTime(d))
    //     .y1((d: Cell) => 10 * cellMetaData.getMass(d))
    //     .y0(0);

    const geometry: number[] = [];
    const key = looneageViewStore.attrKey;
    let x = 0;
    let y = 0;
    // min/max just for debugging
    let minY = Infinity;
    let maxY = -Infinity;

    let minX = Infinity;
    let maxX = -Infinity;

    const testBottom = -404.123456789;
    // this is a hack to make the shaders work correctly.
    // this value is used in the shaders to determine the non value side
    // of the geometry. If a data has this exact value there will be a
    // small visual bug. This value is arbitrary, but is less likely to
    // be found in data than 0.

    const firstX = cellMetaData.getFrame(cellMetaData.selectedTrack.cells[0]);
    geometry.push(firstX, testBottom);
    for (const cell of cellMetaData.selectedTrack.cells) {
        y = cell.attrNum[key];
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);

        x = cellMetaData.getFrame(cell); // TODO: maybe time is better
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);

        geometry.push(x, y);
        geometry.push(x, testBottom);
    }
    // console.log('YYY MIN MAX', minY, maxY);
    // console.log('XXX MIN MAX', minX, maxX);

    geometry.push(x, testBottom);
    return geometry;
});

const testModOffests = computed(() => {
    // TODO: maybe need to calculate?

    return [-8, -7, -6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5];
});

const destination = computed<[number, number, number, number]>(() => [
    0,
    0,
    300,
    looneageViewStore.rowHeight,
]);

const dataXExtent = computed<[number, number]>(() => {
    if (!cellMetaData.selectedTrack) return [0, 0];
    const minTime = cellMetaData.getFrame(cellMetaData.selectedTrack.cells[0]);
    const lastIndex = cellMetaData.selectedTrack.cells.length - 1;
    const maxTime = cellMetaData.getFrame(
        cellMetaData.selectedTrack.cells[lastIndex]
    );
    return [minTime, maxTime];
});

const imageOffset = ref(0);

function createTestHorizonChartLayer(): HorizonChartLayer | null {
    if (!cellMetaData.selectedTrack) return null;
    if (!segmentationData.value) return null;
    // test data with points positioned in a grid
    const testData = [];
    const y = 0;
    let i = 0;
    for (let x = 0; x <= 1100; x += 110) {
        // for (let y = -100; y <= 100; y += 100) {
        testData.push({
            position: [0, y],
            modOffset: i++,
            color: [
                Math.random() * 255,
                Math.random() * 255,
                Math.random() * 255,
            ],
        });
        // }
    }

    // const positiveColors = [];

    const hexListToRgba = (hexList: readonly string[]): number[] => {
        const rgbaList: number[] = [];
        for (let colorHex of hexList) {
            // convert coloHex to rgba array all values [0-1]
            const color = [];
            for (let i = 0; i < 3; i++) {
                color.push(
                    parseInt(colorHex.slice(1 + i * 2, 1 + i * 2 + 2), 16) / 255
                );
            }
            color.push(1.0);
            rgbaList.push(...color);
        }
        return rgbaList;
    };
    const positiveColors = hexListToRgba(
        looneageViewStore.positiveColorScheme.value[6]
    );
    const negativeColors = hexListToRgba(
        looneageViewStore.negativeColorScheme.value[6]
    );

    const minTime = cellMetaData.getFrame(cellMetaData.selectedTrack.cells[0]);
    const lastIndex = cellMetaData.selectedTrack.cells.length - 1;
    const maxTime = cellMetaData.getFrame(
        cellMetaData.selectedTrack.cells[lastIndex]
    );

    const placeholderThreshold = frameNumber.value;
    const placeholderSize = getWidth(segmentationData.value[0].bbox as BBox);
    // console.log({ placeholderThreshold, placeholderSize });
    // const height = getHeight(segmentationData.value[0].bbox as BBox);

    //
    // for (let feature of segmentationData.value) {
    //         if (!feature) continue;
    //         if (!feature?.properties?.frame) continue;
    //         if (!feature?.bbox) continue;
    //         const t = feature.properties.frame - 1; // convert frame number to index
    //         const source = expandHeight(feature.bbox as BBox, maxHeight);
    //         const width = getWidth(source);
    //
    imageOffset.value =
        ((frameNumber.value - minTime) / (maxTime - minTime)) * 300;
    // console.log('imageOffset', imageOffset.value);
    return new HorizonChartLayer({
        id: 'custom-scatterplot-layer',
        data: testModOffests.value,
        instanceData: testGeometry.value,
        destination: destination.value,
        dataXExtent: dataXExtent.value,
        baseline: looneageViewStore.baseline,
        binSize: looneageViewStore.modHeight,
        placeholderThreshold,
        placeholderSize,
        getModOffset: (d: any) => d,
        // getPosition: (d: any) => d.position,
        // getFillColor: (d) => d.color,
        // positiveColorTest: [0.0, 1.0, 0.0, 1.0], // Green
        // prettier-ignore
        positiveColors,
        negativeColors,
        // positiveColors: [
        //     0.5, 0.5, 0.5, 1.0, // Gray
        //     1.0, 0.0, 0.0, 1.0, // Red
        //     0.0, 1.0, 0.0, 1.0, // Green
        //     0.0, 0.0, 1.0, 1.0, // Blue
        //     1.0, 1.0, 0.0, 1.0, // Yellow
        //     1.0, 0.0, 1.0, 1.0, // Magenta
        //     0.0, 1.0, 1.0, 1.0, // Cyan
        //     0.0, 0.0, 0.0, 1.0, // Black
        // ],
        updateTriggers: {
            instanceData: testGeometry.value,
        },
    });
}

const segmentationData = ref<Feature[]>();

watch(selectedTrack, async () => {
    updateSnippet();
});

watch(frameNumber, () => {
    updateSnippet();
});

function updateSnippet() {
    if (cellMetaData.selectedTrack == null) return;

    const dataRequests = [];

    // TODO: this is not right
    const frame = imageViewerStore.frameNumber;
    const cell = cellMetaData.selectedTrack.cells.find(
        (c) => cellMetaData.getFrame(c) === frame
    );
    if (!cell) return;

    // const samples = [0, 0.25, 0.5, 0.75, 1];
    // for (let sample of samples) {
    //     const index = Math.round(
    //         sample * (cellMetaData.selectedTrack.cells.length - 1)
    //     );
    dataRequests.push(segmentationStore.getCellSegmentation(cell));
    // }

    Promise.all(dataRequests).then((data) => {
        segmentationData.value = data.filter((d) => d != null) as Feature[];
        renderDeckGL();
    });
}

function createTrackLayer(): CellSnippetsLayer | null {
    if (!segmentationData.value) return null;
    const selections = [];
    let xOffset = imageOffset.value;
    const yOffset = 0;
    // console.log('xOffset', xOffset);
    const padding = 6;
    const maxHeight = getMaxHeight(segmentationData.value);
    // console.log({ maxHeight });
    for (let feature of segmentationData.value) {
        if (!feature) continue;
        if (!feature?.properties?.frame) continue;
        if (!feature?.bbox) continue;
        const t = feature.properties.frame - 1; // convert frame number to index
        const source = expandHeight(feature.bbox as BBox, maxHeight);
        const width = getWidth(source);
        const height = getHeight(source);
        const destination = [
            xOffset,
            yOffset,
            xOffset + width,
            yOffset - height,
        ];
        xOffset += width + padding;
        selections.push({
            c: 0,
            z: 0,
            t,
            snippets: [{ source, destination }],
        });
    }

    return new CellSnippetsLayer({
        loader: pixelSource.value,
        id: 'looneage-view-gl-test-snippet-layer',
        contrastLimits: contrastLimit.value,
        selections,
        channelsVisible: [true],
        extensions: [colormapExtension],
        colormap: imageViewerStore.colormap,
        onClick: () => {
            console.log('clicked');
        },
    });
}

function renderDeckGL(): void {
    if (deckgl == null) return;
    if (cellMetaData.selectedTrack == null) return;
    if (segmentationData.value == null) return;
    const layers = [];

    // layers.push(createHorizonChartLayer());
    layers.push(createTestHorizonChartLayer());
    layers.push(createTrackLayer());
    // layers.push(createTestScatterLayer());
    deckgl.setProps({
        layers,
        controller: true,
    });
    // console.log('done: render test deckgl');
}
watch(dataPointSelection.$state, renderDeckGL);
watch(imageViewerStore.$state, renderDeckGL);
watch(looneageViewStore.$state, renderDeckGL);
watch(contrastLimitSlider, renderDeckGL);
</script>

<template>
    <canvas id="looneage-deckgl-canvas" ref="deckGlContainer"></canvas>
</template>

<style scoped lang="scss"></style>
