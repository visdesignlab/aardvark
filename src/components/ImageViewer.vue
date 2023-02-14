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
            v-model="imageViewerStore.contrastLimitSlider"
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
            :max="7"
            snap
            markers
            label
            :dark="globalSettings.darkMode"
        />
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
// import { useCellMetaData, type Lineage } from '@/stores/cellMetaData';
import { useGlobalSettings } from '@/stores/globalSettings';
import { useImageViewerStore } from '@/stores/imageViewerStore';
import {
    loadMultiTiff,
    getChannelStats,
    ImageLayer,
    AdditiveColormapExtension,
} from '@hms-dbmi/viv';

import type { PixelData, PixelSource } from '@vivjs/types';
import { Deck, OrthographicView } from '@deck.gl/core';

const INITIAL_VIEW_STATE = {
    zoom: 0,
    bearing: 0,
    target: [767 / 2, 767 / 2, 0],
};

// const cellMetaData = useCellMetaData();
const globalSettings = useGlobalSettings();
const imageViewerStore = useImageViewerStore();

const deckGlContainer = ref(null);
onMounted(async () => {
    const loader = await loadMultiTiff(
        // 'http://localhost:9001/michael-2/20221122_fs051_p9_mediaswitch_homebrew_A1_4_Phase.companion.ome',
        [
            [
                [
                    { c: 0, t: 0, z: 0 },
                    { c: 0, t: 1, z: 0 },
                    { c: 0, t: 2, z: 0 },
                    { c: 0, t: 3, z: 0 },
                    { c: 0, t: 4, z: 0 },
                    { c: 0, t: 5, z: 0 },
                    { c: 0, t: 6, z: 0 },
                ],
                'http://localhost:9001/michael-2/20221122_fs051_p9_mediaswitch_homebrew_A1_4_Phase1.tif',
            ],
        ]
    );
    const raster: PixelData = await loader.data[0].getRaster({
        selection: { c: 0, t: 0, z: 0 },
    });
    const channelStats = getChannelStats(raster.data);
    imageViewerStore.contrastLimitSlider.min = channelStats.contrastLimits[0];
    imageViewerStore.contrastLimitSlider.max = channelStats.contrastLimits[1];
    imageViewerStore.contrastLimitExtentSlider.min = channelStats.domain[0];
    imageViewerStore.contrastLimitExtentSlider.max = channelStats.domain[1];
    const contrastLimits: [number, number][] = [
        channelStats.contrastLimits as [number, number],
    ];
    // console.log({ loader, channelStats, contrastLimits });
    const channelsVisible = [true];

    const pixelSource = loader.data[0] as PixelSource<any>;
    const colormapExtension = new AdditiveColormapExtension();

    const imageLayer = new ImageLayer({
        loader: pixelSource,
        id: 'test-image-layer',
        contrastLimits,
        selections: imageViewerStore.selections,
        channelsVisible,
        extensions: [colormapExtension],
        colormap: imageViewerStore.colormap,
    });
    // console.log({ el: deckGlContainer.value });
    const deckgl = new Deck({
        initialViewState: INITIAL_VIEW_STATE,
        canvas: deckGlContainer.value.id,
        controller: true,
        layers: [imageLayer],
        views: [new OrthographicView({ id: 'ortho', controller: true })],
    });

    imageViewerStore.$subscribe(() => {
        deckgl.setProps({
            layers: [
                new ImageLayer({
                    loader: pixelSource,
                    id: 'test-image-layer',
                    contrastLimits: imageViewerStore.contrastLimit,
                    selections: imageViewerStore.selections,
                    channelsVisible,
                    extensions: [colormapExtension],
                    colormap: imageViewerStore.colormap,
                }),
            ],
        });
    });
});
</script>

<style lang="scss">
.force-repeat * {
    background-repeat: repeat;
    // * {background-repeat: norepeat} on css reset is causing
    // slider to not show tick marks
}
</style>
