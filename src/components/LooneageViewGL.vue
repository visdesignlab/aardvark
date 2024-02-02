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
import { useImageViewerStore } from '@/stores/imageViewerStore';
import { useImageViewerStoreUntrracked } from '@/stores/imageViewerStoreUntrracked';
import { useDatasetSelectionStore } from '@/stores/datasetSelectionStore';
import { useEventBusStore } from '@/stores/eventBusStore';
import { clamp } from 'lodash-es';
import { Pool } from 'geotiff';
import type { Feature } from 'geojson';

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
    TextLayer,
} from '@deck.gl/layers/typed';
// @ts-ignore
import { TripsLayer } from '@deck.gl/geo-layers';
import { render } from 'vue';

const cellMetaData = useCellMetaData();

const dataPointSelection = useDataPointSelection();
const imageViewerStore = useImageViewerStore();
const imageViewerStoreUntrracked = useImageViewerStoreUntrracked();
const datasetSelectionStore = useDatasetSelectionStore();
const { currentLocationMetadata } = storeToRefs(datasetSelectionStore);
const { contrastLimitSlider } = storeToRefs(imageViewerStoreUntrracked);
const { selectedLineage } = storeToRefs(cellMetaData);
const eventBusStore = useEventBusStore();
const segmentationStore = useSegmentationStore();

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
    // if (contrastLimitSlider == null) return;
    // renderLoadingDeckGL();
    // imageViewerStore.frameIndex = 0;
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
    // need a copy since getChannelStats mutates the array mutates the array
    const channelStats = getChannelStats(copy);
    contrastLimitSlider.value.min = channelStats.contrastLimits[0];
    contrastLimitSlider.value.max = channelStats.contrastLimits[1];
    imageViewerStore.contrastLimitExtentSlider.min = channelStats.domain[0];
    imageViewerStore.contrastLimitExtentSlider.max = channelStats.domain[1];
    // const contrastLimits: [number, number][] = [
    //     channelStats.contrastLimits as [number, number],
    // ];
    pixelSource.value = loader.value.data[0] as PixelSource<any>;
    // resetView();
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

function createTestScatterLayer(): ScatterplotLayer {
    // test data with points positioned in a grid
    const testData = [];
    for (let x = -100; x < 100; x += 25) {
        for (let y = -100; y < 100; y += 25) {
            testData.push({
                position: [x, y],
                color: [
                    Math.random() * 255,
                    Math.random() * 255,
                    Math.random() * 255,
                ],
            });
        }
    }
    return new ScatterplotLayer({
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
        getPosition: (d: any) => d.position,
        getRadius: 5,
        getFillColor: (d) => d.color,
        // getLineColor: (d) => [0, 0, 0],
    });
}

const segmentationData = ref<(Feature | undefined)[]>();

watch(selectedLineage, async () => {
    if (cellMetaData.selectedLineage == null) return;
    // const segmentationFolderUrl = datasetSelectionStore.getServerUrl(
    //     datasetSelectionStore.currentLocationMetadata?.segmentationsFolder ??
    //         'UNKNOWN'
    // );
    // const segmentationUrl = `${segmentationFolderUrl}${imageViewerStore.frameNumber}.json`;
    // // get json data
    // fetch(segmentationUrl)
    //     .then((response) => response.json())
    //     .then((data) => {
    //         segmentationData.value = data;
    //         console.log({ data });
    //         renderDeckGL();
    //     });

    const dataRequests = [];
    for (const cell of cellMetaData.selectedLineage.founder.cells) {
        dataRequests.push(segmentationStore.getCellSegmentation(cell));
    }
    Promise.all(dataRequests).then((data) => {
        segmentationData.value = data;
        renderDeckGL();
    });
    // segmentationData.value = await segmentationStore.getCellSegmentation(
    //     cellMetaData.selectedLineage.founder.cells[0]
    // );
    // renderDeckGL();
});

function addMargin(bbox: number[], margin: number): number[] {
    return [
        bbox[0] - margin,
        bbox[1] + margin,
        bbox[2] + margin,
        bbox[3] - margin,
    ];
}

function renderDeckGL(): void {
    // console.log('render test deckgl');
    if (deckgl == null) return;
    if (cellMetaData.selectedLineage == null) return;
    if (segmentationData.value == null) return;
    const layers = [];
    // layers.push(createTestScatterLayer());

    // const firstFrameIndex =
    //     cellMetaData.getFrame(cellMetaData.selectedLineage.founder.cells[0]) -
    //     1;

    // const id = cellMetaData.selectedLineage.lineageId;
    // const bbox = segmentationData.value.bbox;

    // add a margin of 10 pixels around the bbox
    // console.log(bbox);
    // const bboxWithMargin = [
    //     bbox[0] - 10,
    //     bbox[1] + 10,
    //     bbox[2] + 10,
    //     bbox[3] - 10,
    // ];
    // for (let i = 0; i < 4; i++) {
    //     bboxWithMargin[i] = clamp(
    //         bboxWithMargin[i],
    //         0,
    //         imageViewerStoreUntrracked.sizeX
    //     );
    // }
    // console.log({ bboxWithMargin });
    // const width = bboxWithMargin[2] - bboxWithMargin[0];
    // const height = bboxWithMargin[3] - bboxWithMargin[1];
    // const destination = [0, 0, width, height];
    // [roi.left, roi.bottom, roi.right, roi.top]
    // const everyCellSnippet = segmentationData.value.features.map((feature) => {
    //     return { source: feature.bbox, destination: feature.bbox };
    // });

    const selections = [];
    let xOffset = 0;
    const padding = 6;
    for (let feature of segmentationData.value) {
        if (!feature) continue;
        if (!feature?.properties?.frame) continue;
        if (!feature?.bbox) continue;
        const t = feature.properties.frame - 1; // convert frame number to index
        const source = addMargin(feature.bbox, 10);
        const width = source[2] - source[0];
        const height = source[3] - source[1];
        const destination = [xOffset, 0, xOffset + width, height];
        xOffset += width + padding;
        selections.push({
            c: 0,
            z: 0,
            t,
            snippets: [{ source, destination }],
        });
    }

    // const selections = [
    //     {
    //         c: 0,
    //         t: firstFrameIndex,
    //         z: 0,
    //         snippets: [
    //             {
    //                 source: bboxWithMargin,
    //                 destination,
    //             },
    //         ],
    //     },
    // ];

    layers.push(
        new CellSnippetsLayer({
            loader: pixelSource.value,
            id: 'looneage-view-gl-test-snippet-layer',
            contrastLimits: contrastLimit.value,
            selections,
            // selections: [
            //     {
            //         c: 0,
            //         t: 0,
            //         z: 0,
            //         snippets: [
            //             {
            //                 source: [100, 766, 152, 712],
            //                 destination: [0, 54, 52, 0],
            //             },
            //             {
            //                 source: [100, 766, 152, 712],
            //                 destination: [100, 54, 152, 0],
            //             },
            //         ],
            //     },
            //     {
            //         c: 0,
            //         t: 10,
            //         z: 0,
            //         snippets: [
            //             {
            //                 source: [100, 766, 152, 712],
            //                 destination: [-100, 54, -48, 0],
            //             },
            //         ],
            //     },
            // ],
            channelsVisible: [true],
            extensions: [colormapExtension],
            // @ts-ignore
            colormap: imageViewerStore.colormap,
        })
    );

    deckgl.setProps({
        layers,
        controller: true,
    });
    console.log('done: render test deckgl');
}
watch(dataPointSelection.$state, renderDeckGL);
watch(imageViewerStore.$state, renderDeckGL);
watch(contrastLimitSlider, renderDeckGL);
// renderDeckGL();
</script>

<template>
    <canvas id="looneage-deckgl-canvas" ref="deckGlContainer"></canvas>
</template>

<style scoped lang="scss"></style>
