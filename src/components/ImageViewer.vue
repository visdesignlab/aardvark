<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { storeToRefs } from 'pinia';
import {
    useCellMetaData,
    type Lineage,
    type Track,
    type Cell,
} from '@/stores/cellMetaData';
import { useDataPointSelection } from '@/stores/dataPointSelection';

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
import { Deck, OrthographicView, type PickingInfo } from '@deck.gl/core/typed';
import { GeoJsonLayer, LineLayer } from '@deck.gl/layers/typed';
import { TripsLayer } from '@deck.gl/geo-layers';

const INITIAL_VIEW_STATE = {
    zoom: 0,
    bearing: 0,
    target: [767 / 2, 767 / 2, 0],
};

const cellMetaData = useCellMetaData();

const dataPointSelection = useDataPointSelection();
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
            // [
            //     imageViewerStore.generateSelectionIndexRange(0, 2880),
            //     'https://127.0.0.1:9001/JZ_Loc_4_Well_23/images.tif',
            // ],
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
            // data: `https://127.0.0.1:9001/JZ_Loc_4_Well_23/images/${imageViewerStore.frameNumber}.json`,
            id: 'segmentations',
            opacity: 0.4,
            stroked: true,
            filled: true,
            getFillColor: (info) => {
                if (
                    info.properties?.ID?.toString() ===
                    cellMetaData.hoveredTrackId
                ) {
                    return [255, 255, 255, 128];
                }
                return [0, 0, 0, 0];
            },
            getLineColor: (info) => {
                if (
                    info.properties?.ID?.toString() ===
                    dataPointSelection.selectedTrackId
                ) {
                    return [0, 255, 0];
                }
                return [0, 0, 255];
            },
            getLineWidth: (info) => {
                if (
                    info.properties?.ID?.toString() ===
                    dataPointSelection.selectedTrackId
                ) {
                    return 2;
                }
                return 1;
            },
            pickable: true,
            onHover: onHover,
            onClick: onClick,
            updateTriggers: {
                getFillColor: cellMetaData.hoveredTrackId,
                getLineColor: dataPointSelection.selectedTrackId,
                getLineWidth: dataPointSelection.selectedTrackId,
            },
        });
    }

    interface GeoJsonFeature {
        type: 'Feature';
        bbox: [number, number, number, number]; // left, bottom, right, top
        properties: { ID: number }; // could be anything, but mine should have ID
    }

    function onHover(info: PickingInfo): void {
        if (!info.object) {
            cellMetaData.hoveredTrackId = null;
            return;
        }
        const geoJsonFeature = info.object as GeoJsonFeature;
        // console.log(geoJsonFeature);
        cellMetaData.hoveredTrackId = geoJsonFeature.properties.ID?.toString();
    }

    function onClick(info: PickingInfo): void {
        if (!info.object) {
            dataPointSelection.selectedTrackId = null;
            return;
        }
        const geoJsonFeature = info.object as GeoJsonFeature;
        dataPointSelection.selectedTrackId =
            geoJsonFeature.properties.ID?.toString();

        const lineageId = cellMetaData.getLineageId(
            cellMetaData.selectedTrack!
        );
        dataPointSelection.selectedLineageId = lineageId;
    }

    const lineageLineSegments = computed<Segment[]>(() => {
        console.log('computed lineageLineSegments');
        const segments: Segment[] = [];
        if (cellMetaData.selectedLineage == null) {
            console.log('null selectedLineage');
            return segments;
        }
        addSegmentsFromTrack(cellMetaData.selectedLineage.founder, segments);
        return segments;
    });

    interface Segment {
        trackId: string;
        from: [number, number];
        to: [number, number];
    }

    function addSegmentsFromTrack(track: Track, segments: Segment[]): void {
        for (let i = 0; i < track.cells.length - 1; i++) {
            const start = track.cells[i];
            const end = track.cells[i + 1];
            segments.push({
                trackId: track.trackId,
                from: cellMetaData.getPosition(start),
                to: cellMetaData.getPosition(end),
            });
        }
        if (!track.children) return;
        for (let child of track.children) {
            addSegmentsFromTrack(child, segments);
        }
    }

    function createTrajectoryLayer(): LineLayer {
        // const data = [
        //     { from: { coordinates: [0, 0] }, to: { coordinates: [200, 400] } },
        // ];
        // const data = cellMetaData.trackArray;
        // console.log('createTrajectoryLayer');
        return new LineLayer({
            id: 'line-layer',
            data: lineageLineSegments.value,
            pickable: false,
            getWidth: 3,
            getSourcePosition: (d: Segment) => d.from,
            getTargetPosition: (d: Segment) => d.to,
            // getColor: (d) => [Math.sqrt(d.inbound + d.outbound), 140, 0],
            getColor: [25, 228, 73],
        });
    }

    function createAnimatedTrajectoryLayer(): TripsLayer {
        return new TripsLayer({
            id: 'trips-layer',
            data: cellMetaData.trackArray,
            pickable: false,
            getWidth: 5,
            getPath: (d: Track) =>
                d.cells.map((cell: Cell) => cellMetaData.getPosition(cell)),
            // deduct start timestamp from each data point to avoid overflow
            getTimestamps: (d: Track) =>
                d.cells.map((cell: Cell) => cellMetaData.getFrame(cell)),
            getColor: [253, 128, 93],
            opacity: 0.8,
            // widthMinPixels: 5,
            rounded: true,
            fadeTrail: true,
            trailLength: 10,
            currentTime: imageViewerStore.frameNumber,
        });
    }

    const imageLayer = ref(createBaseImageLayer());

    const segmentationLayer = createSegmentationsLayer();
    const trajectoryLayer = createTrajectoryLayer();
    const animatedTrajectoryLayer = createAnimatedTrajectoryLayer();

    const deckgl = new Deck({
        initialViewState: INITIAL_VIEW_STATE,
        // @ts-ignore
        canvas: deckGlContainer.value?.id, // TODO: actually fix this ts error
        controller: true,
        layers: [
            imageLayer.value,
            segmentationLayer,
            // trajectoryLayer,
            animatedTrajectoryLayer,
        ],
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
        // console.count('update in subscribe');
        imageLayer.value?.state?.abortController?.abort();
        imageLayer.value = createBaseImageLayer();

        const segmentationLayer = createSegmentationsLayer();
        const trajectoryLayer = createTrajectoryLayer();
        const animatedTrajectoryLayer = createAnimatedTrajectoryLayer();

        deckgl.setProps({
            layers: [
                imageLayer.value,
                segmentationLayer,
                // trajectoryLayer,
                animatedTrajectoryLayer,
            ],
        });
    }

    const { hoveredTrackId } = storeToRefs(cellMetaData);
    watch(hoveredTrackId, renderDeckGL);
    watch(dataPointSelection.$state, renderDeckGL);
    watch(imageViewerStore.$state, renderDeckGL);
    watch(contrastLimitSlider, renderDeckGL);
});
</script>

<template>
    <canvas
        id="super-cool-unique-id"
        ref="deckGlContainer"
        :class="
            cellMetaData.hoveredTrackId !== null ? 'force-default-cursor' : ''
        "
    ></canvas>
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
            :max="2881"
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

.force-default-cursor {
    cursor: default !important;
}
</style>
