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
import HorizonChartLayer from './layers/HorizonChartLayer.js';
import RoundedRectangleLayer from './layers/RoundedRectangleLayer.js';
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

import CustomScatterplotLayer from './layers/CustomScatterplot/CustomScatterplotLayer';
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
        debug: true,
        onBeforeRender: (gl: any) => {
            console.count('before');
            console.log(gl);
        },
        onAfterRender: (gl: any) => {
            console.count('after');
            console.log(gl);
        },
        onError: (error: any, _layer: any) => {
            console.error('ERROR');
            console.log(error);
        },
        onWebGLInitialized: () => console.log('onWebGLInitialized'),
        onViewStateChange: () => console.log('onViewStateChange'),
        onInteractionStateChange: () => console.log('onInteractionStateChange'),
        onLoad: () => console.log('onLoad'),
    });
    // renderDeckGL();
});

const testGeometry = computed(() => {
    if (!cellMetaData.selectedTrack) return [];
    // const areaGen = area<Cell>()
    //     .x((d: Cell) => cellMetaData.getTime(d))
    //     .y1((d: Cell) => 10 * cellMetaData.getMass(d))
    //     .y0(0);

    const geometry = [];
    const key = cellMetaData.headerKeys.mass;
    let x, y;
    // min/max just for debugging
    let minY = Infinity;
    let maxY = -Infinity;

    let minX = Infinity;
    let maxX = -Infinity;

    const firstX = cellMetaData.getFrame(cellMetaData.selectedTrack.cells[0]);
    geometry.push(firstX, 0);
    for (const cell of cellMetaData.selectedTrack.cells) {
        y = cell.attrNum[key];
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);

        x = cellMetaData.getFrame(cell); // TODO: maybe time is better
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);

        geometry.push(x, y);
        geometry.push(x, 0);
    }
    console.log('YYY MIN MAX', minY, maxY);
    console.log('XXX MIN MAX', minX, maxX);

    geometry.push(x, 0);
    return geometry;
});

function createHorizonChartLayer(): HorizonChartLayer {
    return new HorizonChartLayer({
        id: 'test-horizon-layer',
        data: [2],
        // pickable: true,
        // stroked: true,
        // filled: true,
        // lineWidthMinPixels: 1,
        getPolygon: (d: number) => {
            if (d === 0) {
                return [
                    [0, 0],
                    [0, 100],
                    [100, 100],
                    [100, 0],
                ];
            } else if (d === 1) {
                return [
                    [50, 50],
                    [50, 150],
                    [150, 150],
                    [150, 50],
                ];
            } else {
                return testGeometry.value;
            }
        },
        // getColor: [66, 140, 0],
        getFillColor: (d: boolean) => {
            if (d) {
                return [255, 0, 0, 120];
            } else {
                return [0, 255, 0, 120];
            }
        },
        getLineColor: [80, 80, 80],
        // getLineWidth: 1,
        extruded: false,
    });
}

function createTestScatterLayer(): RoundedRectangleLayer {
    // test data with points positioned in a grid
    const testData = [];
    const y = 0;
    for (let x = 0; x <= 1100; x += 110) {
        // for (let y = -100; y <= 100; y += 100) {
        testData.push({
            position: [0, y],
            color: [
                Math.random() * 255,
                Math.random() * 255,
                Math.random() * 255,
            ],
        });
        // }
    }
    return new RoundedRectangleLayer({
        id: 'scatterplot-layer',
        data: testData,
        pickable: true,
        opacity: 0.8,
        stroked: true,
        filled: true,
        radiusScale: 1,
        radiusMinPixels: 1,
        radiusMaxPixels: 100,
        lineWidthMinPixels: 0,
        getLineWidth: 0,
        cornerRadius: 0.7,
        getPosition: (d: any) => d.position,
        getRadius: 5,
        getFillColor: (d) => d.color,
        // getLineColor: (d) => [0, 0, 0],
    });
}
function createTestCustomLayer(): CustomScatterplotLayer | null {
    if (!cellMetaData.selectedTrack) return null;
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

    const positiveColors = [];
    for (let colorHex of looneageViewStore.positiveColorScheme.value[8]) {
        // convert coloHex to rgba array all values [0-1]
        const color = [];
        for (let i = 0; i < 3; i++) {
            color.push(
                parseInt(colorHex.slice(1 + i * 2, 1 + i * 2 + 2), 16) / 255
            );
        }
        color.push(1.0);
        positiveColors.push(...color);
    }

    const minTime = cellMetaData.getFrame(cellMetaData.selectedTrack.cells[0]);
    const lastIndex = cellMetaData.selectedTrack.cells.length - 1;
    const maxTime = cellMetaData.getFrame(
        cellMetaData.selectedTrack.cells[lastIndex]
    );

    return new CustomScatterplotLayer({
        id: 'custom-scatterplot-layer',
        data: [0, 1, 2, 3, 4, 5, 6, 7],
        instanceData: testGeometry.value,
        destination: [0, 0, 100, looneageViewStore.rowHeight],
        dataXExtent: [minTime, maxTime],
        baseline: 0,
        binSize: looneageViewStore.modHeight,
        getModOffset: (d: any) => d,
        // getPosition: (d: any) => d.position,
        // getFillColor: (d) => d.color,
        // positiveColorTest: [0.0, 1.0, 0.0, 1.0], // Green
        // prettier-ignore
        positiveColors,
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
    });
}

const segmentationData = ref<Feature[]>();

watch(selectedTrack, async () => {
    if (cellMetaData.selectedTrack == null) return;

    const dataRequests = [];
    const samples = [0, 0.25, 0.5, 0.75, 1];
    for (let sample of samples) {
        const index = Math.round(
            sample * (cellMetaData.selectedTrack.cells.length - 1)
        );
        dataRequests.push(
            segmentationStore.getCellSegmentation(
                cellMetaData.selectedTrack.cells[index]
            )
        );
    }

    Promise.all(dataRequests).then((data) => {
        segmentationData.value = data.filter((d) => d != null) as Feature[];
        renderDeckGL();
    });
});

function createTrackLayer(): CellSnippetsLayer | null {
    if (!segmentationData.value) return null;
    const selections = [];
    let xOffset = 0;
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
        const destination = [xOffset, 0, xOffset + width, -height];
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
    });
}

function renderDeckGL(): void {
    if (deckgl == null) return;
    if (cellMetaData.selectedTrack == null) return;
    if (segmentationData.value == null) return;
    const layers = [];

    // layers.push(createTrackLayer());
    // layers.push(createTestScatterLayer());
    // layers.push(createHorizonChartLayer());
    layers.push(createTestCustomLayer());
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
