<template>
    <!-- <StubView></StubView> -->
    <q-btn @click="loadStuff">load stuff</q-btn>
    <div
        v-if="dataLoaded"
        style="outline: solid 4px purple; position: relative; height: 50%"
    >
        <VivViewerVue
            :layerProps="layoutConfig"
            :views="vivViews"
            :viewStates="vivViewStates"
        ></VivViewerVue>
    </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
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
import type { PixelData } from '@vivjs/types';

const VivViewerVue = applyReactInVue(VivViewer);

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
