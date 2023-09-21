<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
// import { useCellMetaData, type Lineage } from '@/stores/cellMetaData';
import { useGlobalSettings } from '@/stores/globalSettings';
import { useImageViewerStore } from '@/stores/imageViewerStore';
import { debounce } from 'lodash-es';
import { Pool } from 'geotiff';

import {
    loadMultiTiff,
    loadOmeTiff,
    getChannelStats,
    ImageLayer,
    AdditiveColormapExtension,
} from '@hms-dbmi/viv';

// import { AdditiveColormapExtension } from '../tempLib/viv/packages/extensions';

import type { PixelData, PixelSource } from '@vivjs/types';
import { Deck, OrthographicView } from '@deck.gl/core';
import { GeoJsonLayer } from '@deck.gl/layers';

const INITIAL_VIEW_STATE = {
    zoom: 0,
    bearing: 0,
    target: [767 / 2, 767 / 2, 0],
};

// const cellMetaData = useCellMetaData();
const globalSettings = useGlobalSettings();
const imageViewerStore = useImageViewerStore();

const deckGlContainer = ref(null);

const contrastLimitSlider = ref<{ min: number; max: number }>({
    min: 0,
    max: 0,
});
watch(
    contrastLimitSlider,
    debounce(() => {
        // only update store periodically so provStore is
        // not overwhelmed with new nodes
        imageViewerStore.contrastLimitSliderDebounced =
            contrastLimitSlider.value;
    }, 500)
);
watch(
    () => imageViewerStore.contrastLimitSliderDebounced,
    () => {
        // if the store changes (via a traversal in the prov tree)
        // update the slider
        contrastLimitSlider.value =
            imageViewerStore.contrastLimitSliderDebounced;
    }
);

const contrastLimit = computed<[number, number][]>(() => {
    return [[contrastLimitSlider.value.min, contrastLimitSlider.value.max]];
});

onMounted(async () => {
    // const loader = await loadOmeTiff(
    //     'https://localhost:9001/michael_pma_vs_hmgs2/pma_to_pma/20221122_fs051_p9_mediaswitch_homebrew_A1_4_Phase.companion.ome',
    //     { pool: new Pool() }
    // );

    const loader = await loadMultiTiff(
        [
            [
                imageViewerStore.generateSelectionIndexRange(0, 88),
                'https://127.0.0.1:9001/michael-2/20221122_fs051_p9_mediaswitch_homebrew_A1_4_Phase1.tif',
            ],
            [
                imageViewerStore.generateSelectionIndexRange(89, 177),
                'https://127.0.0.1:9001/michael-2/20221122_fs051_p9_mediaswitch_homebrew_A1_4_Phase2.tif',
            ],
            [
                imageViewerStore.generateSelectionIndexRange(178, 215),
                'https://127.0.0.1:9001/michael-2/20221122_fs051_p9_mediaswitch_homebrew_A1_4_Phase3.tif',
            ],
        ],
        { pool: new Pool() }
    );
    const raster: PixelData = await loader.data[0].getRaster({
        selection: { c: 0, t: 0, z: 0 },
    });
    const channelStats = getChannelStats(raster.data);
    contrastLimitSlider.value.min = channelStats.contrastLimits[0];
    contrastLimitSlider.value.max = channelStats.contrastLimits[1];
    imageViewerStore.contrastLimitExtentSlider.min = channelStats.domain[0];
    imageViewerStore.contrastLimitExtentSlider.max = channelStats.domain[1];
    const contrastLimits: [number, number][] = [
        channelStats.contrastLimits as [number, number],
    ];
    // console.log({ loader, channelStats, contrastLimits });
    const channelsVisible = [true];

    const pixelSource = loader.data[0] as PixelSource<any>;
    const colormapExtension = new AdditiveColormapExtension();

    function createBaseImageLayer(): typeof ImageLayer {
        return new ImageLayer({
            loader: pixelSource,
            id: 'base-image-layer',
            contrastLimits: contrastLimit.value,
            selections: imageViewerStore.selections,
            channelsVisible,
            extensions: [colormapExtension],
            // @ts-ignore
            colormap: imageViewerStore.colormap,
        });
    }

    function createSegmentationsLayer(): typeof GeoJsonLayer {
        return new GeoJsonLayer({
            data: `https://127.0.0.1:9001/michael_pma_vs_hmgs2/pma_to_pma/20221122_fs051_p9_mediaswitch_homebrew_A1_4_Phase/${imageViewerStore.frameNumber}.json`,
            id: 'segmentations',
            opacity: 0.4,
            stroked: true,
            filled: true,
            extruded: false,
            wireframe: false,
            //   getElevation: f => Math.sqrt(f.properties.valuePerSqm) * 10,
            getFillColor: [255, 0, 0, 128],
            getLineColor: [0, 0, 255, 255],
            pickable: true,
            onError: () => console.log('segmentation layer error'),
        });
    }

    const imageLayer = ref(createBaseImageLayer());

    const segmentationLayer = createSegmentationsLayer();

    const deckgl = new Deck({
        initialViewState: INITIAL_VIEW_STATE,
        // @ts-ignore
        canvas: deckGlContainer.value?.id, // TODO: actually fix this ts error
        controller: true,
        layers: [imageLayer.value, segmentationLayer],
        // layers: [segmentationLayer],
        views: [new OrthographicView({ id: 'ortho', controller: true })],
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
    function renderDeckGL(_state: any): void {
        console.count('update in subscribe');
        imageLayer.value?.state?.abortController?.abort();
        imageLayer.value = createBaseImageLayer();

        const segmentationLayer = createSegmentationsLayer();

        deckgl.setProps({
            layers: [imageLayer.value, segmentationLayer],
        });
    }

    watch(imageViewerStore.$state, renderDeckGL);
    watch(contrastLimitSlider, renderDeckGL);
});
</script>

<template>
    <canvas id="super-cool-unique-id" ref="deckGlContainer"></canvas>
    <div
        :class="`p-2 w-25 position-relative bg-opacity-75 bg-${globalSettings.btnLight}`"
    >
        <!-- <div class="d-flex align-center"> -->
        <!-- <h6>Colormap:</h6> -->
        <q-badge outline :color="globalSettings.normalizedBlack"
            >Colormap:</q-badge
        >
        <q-select
            v-model="imageViewerStore.colormap"
            :options="imageViewerStore.colormapOptions"
            :dark="globalSettings.darkMode"
            outlined
            dense
            class="mb-3"
        ></q-select>
        <!-- </div> -->

        <q-badge outline :color="globalSettings.normalizedBlack"
            >Dynamic Range:</q-badge
        >
        <q-range
            v-model="contrastLimitSlider"
            :min="imageViewerStore.contrastLimitExtentSlider.min"
            :max="imageViewerStore.contrastLimitExtentSlider.max"
            :step="1"
            label
            :dark="globalSettings.darkMode"
            class="mb-3"
        />

        <q-badge outline :color="globalSettings.normalizedBlack"
            >Frame:</q-badge
        >
        <q-slider
            class="force-repeat"
            v-model="imageViewerStore.frameNumber"
            :min="1"
            :max="212"
            snap
            label
            :dark="globalSettings.darkMode"
        />
    </div>
</template>

<style lang="scss">
.force-repeat * {
    background-repeat: repeat;
    // * {background-repeat: norepeat} on css reset is causing
    // slider to not show tick marks
}
</style>
