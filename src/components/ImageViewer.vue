<template>
    <!-- <StubView></StubView> -->
    <canvas id="super-cool-unique-id" ref="deckGlContainer"></canvas>

    <!-- <q-btn @click="loadStuff">load stuff</q-btn> -->
    <div
        v-if="dataLoaded"
        style="outline: solid 4px purple; position: relative; height: 50%"
    >
        <VivViewerVue
            :layerProps="layoutConfig"
            :views="vivViews"
            :viewStates="vivViewStates"
        ></VivViewerVue>

        <!-- <DeckGLVue :ref="deckRef" :onViewStateChange="onViewStateChange"
        :controller="true" :viewState="viewState" :views="[new
        OrthographicView({ id: "ortho", controller: true })]} :layers="layers"
        /> -->
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
// import { useCellMetaData, type Lineage } from '@/stores/cellMetaData';
// import { useGlobalSettings } from '@/stores/globalSettings';
import {
    loadOmeTiff,
    loadMultiTiff,
    VivView,
    VivViewer,
    getChannelStats,
    getDefaultInitialViewState,
} from '@hms-dbmi/viv';

import { applyPureReactInVue, applyReactInVue } from 'veaury';
import { DeckGL } from 'deck.gl';
import type { PixelData } from '@vivjs/types';
import { Deck } from '@deck.gl/core';
import { ScatterplotLayer } from '@deck.gl/layers';

const INITIAL_VIEW_STATE = {
    latitude: 37.8,
    longitude: -122.45,
    zoom: 15,
};
const deckGlContainer = ref(null);

onMounted(() => {
    console.log({ el: deckGlContainer.value });
    const deckgl = new Deck({
        initialViewState: INITIAL_VIEW_STATE,
        // container: deckGlContainer.value.id,
        canvas: deckGlContainer.value.id,
        controller: true,
        layers: [
            new ScatterplotLayer({
                data: [
                    {
                        position: [-122.451, 37.8],
                        color: [255, 0, 0],
                        radius: 100,
                    },
                    {
                        position: [-122.45, 37.8],
                        color: [0, 255, 0],
                        radius: 100,
                    },
                ],
                getColor: (d: any) => d.color,
                getRadius: (d: any) => d.radius,
            }),
        ],
    });
});

const VivViewerVue = applyReactInVue(VivViewer);
const DeckGLVue = applyReactInVue(DeckGL);

// const cellMetaData = useCellMetaData();
// const globalSettings = useGlobalSettings();

const layoutConfig = ref();
const vivViews = ref();

const vivViewStates = ref();
const dataLoaded = ref(false);
// console.log('begin loadin ...');
async function loadStuff() {
    const loader = await loadMultiTiff(
        // 'http://localhost:9001/michael-2/20221122_fs051_p9_mediaswitch_homebrew_A1_4_Phase.companion.ome',
        [
            [
                { c: 0, t: 0, z: 0 },
                'http://localhost:9001/michael-2/20221122_fs051_p9_mediaswitch_homebrew_A1_4_Phase1.tif',
            ],
        ]
    );
    const raster: PixelData = await loader.data[0].getRaster({
        selection: { c: 0, t: 0, z: 0 },
    });
    const channelStats = getChannelStats(raster.data);

    // const contrastLimits = [channelStats.contrastLimits];
    const contrastLimits = [[153, 539]];
    console.log({ loader, channelStats, contrastLimits });
    const selections = [{ c: 0, t: 0, z: 0 }];
    const colors = [[255, 255, 255]];
    const channelsVisible = ref([true]);
    layoutConfig.value = [
        {
            loader: loader.data,
            selections,
            contrastLimits,
            colors,
            colormap: 'viridis',
            channelsVisible,
            width: 767,
            height: 767,
        },
    ];

    vivViews.value = [
        new VivView({
            id: 'test_viv_view',
            // loader: loader.data,
            x: 0,
            y: 0,
            width: 767,
            height: 767,
        }),
    ];

    vivViewStates.value = [
        { target: [350, 350, 1], zoom: -0.1, id: 'test_viv_view' },
        // getDefaultInitialViewState(loader.data, { width: 767, height: 767 }),
    ];
    dataLoaded.value = true;
}
</script>

<style scoped lang="scss"></style>
