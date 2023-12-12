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
import CellSnippetsLayer from './layers/CellSnippetsLayer';
import { useImageViewerStore } from '@/stores/imageViewerStore';
import { useImageViewerStoreUntrracked } from '@/stores/imageViewerStoreUntrracked';
import { useDatasetSelectionStore } from '@/stores/datasetSelectionStore';
import { useEventBusStore } from '@/stores/eventBusStore';
import { clamp } from 'lodash-es';
import { Pool } from 'geotiff';

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
const eventBusStore = useEventBusStore();

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

function createTestImageSnippetLayer(): any {
    console.log('create snippet layer');
    const dtype = pixelSource.value?.dtype;
    if (!dtype) {
        return null;
    }
    console.log(testRaster.value?.data);
    console.log(imageViewerStore.selections);
    console.log(contrastLimit.value);
    console.log('colormap:', imageViewerStore.colormap);
    console.log(dtype);
    const testData = getSnippetOfByteArray(
        testRaster.value?.data,
        767,
        767,
        [100, 766, 152, 712]
    );
    console.log({ testData });
    return new XRLayer({
        // loader: pixelSource.value,
        id: 'blargen-base-image-layer',
        contrastLimits: contrastLimit.value,
        // selections: imageViewerStore.selections,
        channelsVisible: [true],
        extensions: [colormapExtension],
        colormap: imageViewerStore.colormap,
        // onClick: () => console.log('click in base image layer'),
        // onViewportLoad: () => console.log('image viewport load'),
        dtype,
        bounds: [0, 54, 52, 0],
        // bounds: [0, 767, 767, 0],
        channelData: {
            data: [testData],
            width: 52,
            height: 54,
        },
        pickable: false,
        // autoHighlight: true,
        // highlightColor: [80, 80, 80, 50],
    } as any);
}

function createSameTypeArray(
    input: ArrayBufferView,
    length: number
): ArrayBufferView {
    // Mapping of typed array constructors
    const typedArrayConstructors: { [key: string]: any } = {
        Int8Array: Int8Array,
        Uint8Array: Uint8Array,
        Uint8ClampedArray: Uint8ClampedArray,
        Int16Array: Int16Array,
        Uint16Array: Uint16Array,
        Int32Array: Int32Array,
        Uint32Array: Uint32Array,
        Float32Array: Float32Array,
        Float64Array: Float64Array,
    };

    // Determine the type of the input array
    for (const key in typedArrayConstructors) {
        if (input instanceof typedArrayConstructors[key]) {
            // Create a new instance of the same type
            return new typedArrayConstructors[key](length);
        }
    }

    throw new Error('Unsupported typed array type');
}

function getSnippetOfByteArray(
    byteArray: ArrayBufferView,
    width: number,
    height: number,
    bbox: [number, number, number, number] // left, bottom, right, top
): ArrayBufferView {
    // create output byte array with the same type as byteArray
    const [left, bottom, right, top] = bbox;
    const outputWidth = right - left;
    const outputHeight = bottom - top;
    const outputByteArray = createSameTypeArray(
        byteArray,
        outputWidth * outputHeight
    );
    // byteArray is a flattened 1D array of pixel data, the snippet should
    // extract the values from the bbox and return them in a 1D flattened pixel array
    let i = 0;
    for (let y = top; y < bottom; y++) {
        for (let x = left; x < right; x++) {
            const index = y * width + x;
            // @ts-ignore: ignore because we know the type of the array should match
            outputByteArray[i++] = byteArray[index];
        }
    }

    return outputByteArray;
}

function renderDeckGL(): void {
    console.log('render test deckgl');
    if (deckgl == null) return;
    const layers = [];
    layers.push(createTestScatterLayer());
    // const testSnippetLayer = createTestImageSnippetLayer();
    // if (testSnippetLayer) {
    //     layers.push(testSnippetLayer);
    // } else {
    //     console.log('skip test layer');
    // }
    layers.push(
        new CellSnippetsLayer({
            loader: pixelSource.value,
            id: 'looneage-view-gl-test-snippet-layer',
            contrastLimits: contrastLimit.value,
            selections: imageViewerStore.selections,
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
