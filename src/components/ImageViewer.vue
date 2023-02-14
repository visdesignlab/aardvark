<template>
    <!-- <StubView></StubView> -->
    <canvas id="super-cool-unique-id" ref="deckGlContainer"></canvas>
    <div class="w-25">
        <q-select
            v-model="imageViewerStore.colormap"
            :options="imageViewerStore.colormapOptions"
            :dark="globalSettings.darkMode"
            class="mb-2"
        ></q-select>

        <q-range
            v-model="imageViewerStore.contrastLimitSlider"
            :min="imageViewerStore.contrastLimitExtentSlider.min"
            :max="imageViewerStore.contrastLimitExtentSlider.max"
            :step="1"
            label-always
            :dark="globalSettings.darkMode"
            class="mb-2"
        />

        <q-slider
            v-model="imageViewerStore.frameIndex"
            :min="0"
            :max="5"
            :dark="globalSettings.darkMode"
        />
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { cloneDeep } from 'lodash';
// import { useCellMetaData, type Lineage } from '@/stores/cellMetaData';
import { useGlobalSettings } from '@/stores/globalSettings';
import { useImageViewerStore } from '@/stores/imageViewerStore';
import {
    loadOmeTiff,
    loadMultiTiff,
    VivView,
    VivViewer,
    getChannelStats,
    getDefaultInitialViewState,
    ImageLayer,
    AdditiveColormapExtension,
} from '@hms-dbmi/viv';

import { applyPureReactInVue, applyReactInVue } from 'veaury';
import { DeckGL } from 'deck.gl';
import type { PixelData, PixelSource, TiffPixelSource } from '@vivjs/types';
import { Deck, OrthographicView } from '@deck.gl/core';
import { ScatterplotLayer } from '@deck.gl/layers';

import { Matrix4 } from '@math.gl/core';

const INITIAL_VIEW_STATE = {
    zoom: 0,
    bearing: 0,
    target: [767 / 2, 767 / 2, 0],
};

// const cellMetaData = useCellMetaData();
const globalSettings = useGlobalSettings();
const imageViewerStore = useImageViewerStore();

const vivViewStates = ref();

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
    const contrastLimits: [number, number][] = [channelStats.contrastLimits];
    // const contrastLimits: [number, number][] = [[153, 539]];
    // const contrastLimits = [{ begin: 153, end: 539 }];
    console.log({ loader, channelStats, contrastLimits });
    // const selections = [{ c: 0, t: 0, z: 0 }];
    const colors = [[255, 255, 255]];
    const channelsVisible = [true];
    // layoutConfig.value = [
    //     {
    //         loader: loader.data,
    //         selections,
    //         contrastLimits,
    //         colors,
    //         colormap: 'viridis',
    //         channelsVisible,
    //         width: 767,
    //         height: 767,
    //     },
    // ];

    vivViewStates.value = [
        { target: [350, 350, 1], zoom: -0.1, id: 'test_viv_view' },
        // getDefaultInitialViewState(loader.data, { width: 767, height: 767 }),
    ];

    const z = 1;
    const overviewScale = 1;
    const pixelSource = loader.data[0] as PixelSource<any>;
    const colormapExtension = new AdditiveColormapExtension();
    // colormapExtension.updateState({ props: { colormap: 'jet' } });

    // colormapExtension.colormap =
    const imageLayer = new ImageLayer({
        loader: pixelSource,
        // modelMatrix: new Matrix4().scale(2 ** z * overviewScale),
        id: 'test-image-layer',
        contrastLimits,
        selections: imageViewerStore.selections,
        channelsVisible,
        extensions: [colormapExtension],
        colormap: imageViewerStore.colormap,
    });
    console.log({ el: deckGlContainer.value });
    const deckgl = new Deck({
        initialViewState: INITIAL_VIEW_STATE,
        // container: deckGlContainer.value.id,
        canvas: deckGlContainer.value.id,
        controller: true,
        layers: [
            imageLayer.value,
            // new ScatterplotLayer({
            //     id: 'test-scatterplot-layer',
            //     data: [
            //         {
            //             position: [-122.451, 37.8],
            //             color: [255, 0, 0],
            //             radius: 10,
            //         },
            //         {
            //             position: [-122.45, 37.8],
            //             color: [0, 255, 0],
            //             radius: 10,
            //         },
            //         {
            //             position: [0, 0],
            //             color: [0, 0, 255],
            //             radius: 10,
            //         },
            //         {
            //             position: [767, 767],
            //             color: [255, 255, 0],
            //             radius: 10,
            //         },
            //     ],
            //     getColor: (d: any) => d.color,
            //     getRadius: (d: any) => d.radius,
            // }),
        ],

        views: [new OrthographicView({ id: 'ortho', controller: true })],
    });
    imageViewerStore.$subscribe(() => {
        // console.log('image view store changed');
        // console.log(cloneDeep(imageLayer.value));
        // deckgl.redraw(true);
        // const pixelSource = loader.data[0] as PixelSource<any>;
        // const selections = [{ c: 0, t: imageViewerStore.frameIndex, z: 0 }];
        // imageLayer.value.props = {
        //     loader: pixelSource,
        //     // modelMatrix: new Matrix4().scale(2 ** z * overviewScale),
        //     id: 'test-image-layer',
        //     contrastLimits: imageViewerStore.contrastLimit,
        //     selections,
        //     channelsVisible,
        //     extensions: [colormapExtension],
        //     colormap: imageViewerStore.colormap,
        // };
        deckgl.setProps({
            layers: [
                new ImageLayer({
                    loader: pixelSource,
                    // modelMatrix: new Matrix4().scale(2 ** z * overviewScale),
                    id: 'test-image-layer',
                    contrastLimits: imageViewerStore.contrastLimit,
                    selections: imageViewerStore.selections,
                    channelsVisible,
                    extensions: [colormapExtension],
                    colormap: imageViewerStore.colormap,
                }),
            ],
        });
        // colormapExtension.setProps({ colormap: imageViewerStore.colormap });
        // colormapExtension.updateState({
        //     props: { colormap: imageViewerStore.colormap },
        //     oldProps: {},
        //     changeFlags: true,
        // });
    });
});
</script>

<style scoped lang="scss"></style>
