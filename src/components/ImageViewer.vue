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

import { useImageViewerStore } from '@/stores/imageViewerStore';
import { useImageViewerStoreUntrracked } from '@/stores/imageViewerStoreUntrracked';
import { useDatasetSelectionStore } from '@/stores/datasetSelectionStore';
import { useEventBusStore } from '@/stores/eventBusStore';
import { clamp } from 'lodash-es';
import { Pool } from 'geotiff';

import {
    loadMultiTiff,
    loadOmeTiff,
    getChannelStats,
    ImageLayer,
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
import { TripsLayer } from '@deck.gl/geo-layers';

const cellMetaData = useCellMetaData();

const dataPointSelection = useDataPointSelection();
const imageViewerStore = useImageViewerStore();
const imageViewerStoreUntrracked = useImageViewerStoreUntrracked();
const datasetSelectionStore = useDatasetSelectionStore();
const { currentImageStackMetadata } = storeToRefs(datasetSelectionStore);
const { contrastLimitSlider } = storeToRefs(imageViewerStoreUntrracked);
const eventBusStore = useEventBusStore();

const deckGlContainer = ref(null);
const { width: containerWidth, height: containerHeight } =
    useElementSize(deckGlContainer);
const colormapExtension = new AdditiveColormapExtension();

const contrastLimit = computed<[number, number][]>(() => {
    return [[contrastLimitSlider.value.min, contrastLimitSlider.value.max]];
});

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
        canvas: deckGlContainer.value?.id, // TODO: actually fix this ts error
        controller: true,
        layers: [],
        views: [
            new OrthographicView({
                id: 'ortho',
                controller: true,
            }),
        ],
        onViewStateChange: ({ viewState }) => {
            // limit the camera to keep the image visible
            if (currentImageStackMetadata.value == null) return viewState;
            viewState.target[0] = clamp(
                viewState.target[0],
                0,
                currentImageStackMetadata.value.sizeX
            );
            viewState.target[1] = clamp(
                viewState.target[1],
                0,
                currentImageStackMetadata.value.sizeY
            );
            // viewState.zoom = clamp(viewState.zoom, -8, 8);
            return viewState;
        },
        debug: false,
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
    eventBusStore.emitter.on('resetImageView', resetView);
});

const loader = ref<any | null>(null);
const pixelSource = ref<any | null>(null);
watch(currentImageStackMetadata, async () => {
    if (currentImageStackMetadata.value == null) return;
    if (deckgl == null) return;
    // if (contrastLimitSlider == null) return;
    renderLoadingDeckGL();
    imageViewerStore.frameIndex = 0;
    pixelSource.value = null;

    // const loader = await loadOmeTiff(
    //     'https://localhost:9001/michael_pma_vs_hmgs2/pma_to_pma/20221122_fs051_p9_mediaswitch_homebrew_A1_4_Phase.companion.ome',
    //     { pool: new Pool() }
    // );
    const imageSources = [];
    for (let image of currentImageStackMetadata.value?.imageFrames ?? []) {
        imageSources.push([
            imageViewerStore.generateSelectionIndexRange(
                image.start,
                image.end
            ),
            datasetSelectionStore.getServerUrl(image.filename),
        ]);
    }

    loader.value = await loadMultiTiff(imageSources as any, {
        pool: new Pool(),
    });

    const raster: PixelData = await loader.value.data[0].getRaster({
        selection: { c: 0, t: 0, z: 0 },
    });
    const channelStats = getChannelStats(raster.data);
    contrastLimitSlider.value.min = channelStats.contrastLimits[0];
    contrastLimitSlider.value.max = channelStats.contrastLimits[1];
    imageViewerStore.contrastLimitExtentSlider.min = channelStats.domain[0];
    imageViewerStore.contrastLimitExtentSlider.max = channelStats.domain[1];
    // const contrastLimits: [number, number][] = [
    //     channelStats.contrastLimits as [number, number],
    // ];
    pixelSource.value = loader.value.data[0] as PixelSource<any>;
    resetView();
    renderDeckGL();
});
function createBaseImageLayer(): typeof ImageLayer {
    // console.log('create base image layer');
    return new ImageLayer({
        loader: pixelSource.value,
        id: 'base-image-layer',
        contrastLimits: contrastLimit.value,
        selections: imageViewerStore.selections,
        channelsVisible: [true],
        extensions: [colormapExtension],
        // @ts-ignore
        colormap: imageViewerStore.colormap,
        onClick: () => console.log('click in base image layer'),
        onViewportLoad: () => console.log('image viewport load'),
    });
}

function createSegmentationsLayer(): typeof GeoJsonLayer {
    const folderUrl = datasetSelectionStore.getServerUrl(
        datasetSelectionStore.currentLocationMetadata?.segmentationsFolder ??
            'UNKNOWN'
    );
    // console.log(folderUrl);
    return new GeoJsonLayer({
        data: folderUrl + `${imageViewerStore.frameNumber}.json`,
        lineWidthUnits: 'pixels',
        id: 'segmentations',
        opacity: 0.4,
        stroked: true,
        filled: true,
        getFillColor: (info) => {
            if (
                info.properties?.ID?.toString() === cellMetaData.hoveredTrackId
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
                return [77, 175, 74];
            }
            return [55, 126, 184];
        },
        getLineWidth: (info) => {
            if (
                info.properties?.ID?.toString() ===
                dataPointSelection.selectedTrackId
            ) {
                return 4;
            }
            return 2;
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

    const lineageId = cellMetaData.getLineageId(cellMetaData.selectedTrack!);
    dataPointSelection.selectedLineageId = lineageId;
}

const lineageLayout = computed<LineageLayout>(() => {
    // console.log('computed lineageLineSegments');
    const layout: LineageLayout = { points: [], lines: [] };
    for (const lineage of currentLineageArray.value) {
        addSegmentsFromTrack(lineage.founder, layout);
    }
    return layout;
});

interface LineageLayout {
    lines: Segment[];
    points: LineagePoint[];
}

interface Segment {
    from: [number, number];
    to: [number, number];
}

interface LineagePoint {
    position: [number, number];
    trackId: string;
    internal: boolean;
}

function addSegmentsFromTrack(
    track: Track,
    layout: LineageLayout
): [number, number] | null {
    let { lines, points } = layout;
    if (currentCellMap.value.has(track.trackId)) {
        const position = cellMetaData.getPosition(
            currentCellMap.value.get(track.trackId)!
        );
        points.push({
            position,
            internal: false,
            trackId: track.trackId,
        });
        return position;
    }
    const childPositions: [number, number][] = [];
    const accumChildPositions: [number, number] = [0, 0];
    for (let child of track.children) {
        const childPos = addSegmentsFromTrack(child, layout);
        if (childPos === null) continue;
        childPositions.push(childPos);
        accumChildPositions[0] += childPos[0];
        accumChildPositions[1] += childPos[1];
    }
    if (childPositions.length === 0) return null;
    accumChildPositions[0] /= childPositions.length;
    accumChildPositions[1] /= childPositions.length;

    for (let childPos of childPositions) {
        lines.push({
            from: accumChildPositions,
            to: childPos,
        });
    }
    points.push({
        position: accumChildPositions,
        internal: true,
        trackId: track.trackId,
    });

    return accumChildPositions;

    // for (let i = 0; i < track.cells.length - 1; i++) {
    // const start = track.cells[0];
    // const end = track.cells[track.cells.length - 1];
    // if (cellMetaData.getFrame(end) >= imageViewerStore.frameNumber) {
    //     return;
    // }
    // segments.push({
    //     trackId: track.trackId,
    //     from: cellMetaData.getPosition(start),
    //     to: cellMetaData.getPosition(end),
    // });
    // // }
    // if (!track.children) return;
    // for (let child of track.children) {
    //     addSegmentsFromTrack(child, segments);
    // }
}

function createLineageLayer(): LineLayer {
    return new LineLayer({
        id: 'line-layer',
        widthUnits: 'pixels',
        data: lineageLayout.value.lines,
        pickable: false,
        getWidth: 5,
        getSourcePosition: (d: Segment) => d.from,
        getTargetPosition: (d: Segment) => d.to,
        // getColor: (d) => [Math.sqrt(d.inbound + d.outbound), 140, 0],
        getColor: [228, 26, 28, 125],
    });
}

function createCenterPointLayer(): ScatterplotLayer {
    return new ScatterplotLayer({
        id: 'scatterplot-layer',
        lineWidthUnits: 'pixels',
        radiusUnits: 'pixels',
        data: lineageLayout.value.points,
        pickable: false,
        opacity: 1,
        stroked: true,
        filled: true,
        getPosition: (d) => d.position,
        getRadius: (d) => (d.internal ? 6 : 4),
        getFillColor: (d) =>
            d.internal ? [228, 26, 28, 125] : [228, 26, 28, 0],
        getLineColor: [228, 26, 28],
        getStrokeWidth: 1,
    });
}

// list of lineages present at the current frame
const currentLineageArray = computed<Lineage[]>(() => {
    const lineages: Lineage[] = [];
    const lineageIds = new Set<string>();
    for (let track of currentTrackArray.value) {
        const lineage = cellMetaData.getLineage(track);
        if (lineageIds.has(lineage.lineageId)) continue;
        lineageIds.add(lineage.lineageId);
        lineages.push(lineage);
    }

    return lineages;
});

// tracks that are only present at the current time point
const currentTrackArray = computed<Track[]>(() => {
    if (!cellMetaData.trackArray) return [];
    return cellMetaData.trackArray.filter((track: Track) => {
        const first = track.cells[0];
        const last = track.cells[track.cells.length - 1];
        return (
            cellMetaData.getFrame(first) <= imageViewerStore.frameNumber &&
            imageViewerStore.frameNumber <= cellMetaData.getFrame(last)
        );
    });
});

// cells that are at the current frame
const currentCellMap = computed<Map<string, Cell>>(() => {
    const cellMap = new Map<string, Cell>();
    if (!cellMetaData.cellArray) return cellMap;
    for (let cell of cellMetaData.cellArray) {
        if (cellMetaData.getFrame(cell) == imageViewerStore.frameNumber) {
            cellMap.set(cell.trackId, cell);
        }
    }
    return cellMap;
});

function createTrajectoryGhostLayer(): TripsLayer {
    return new TripsLayer({
        id: 'trips-layer',
        widthUnits: 'pixels',
        data: currentTrackArray.value,
        pickable: false,
        getWidth: 3,
        getPath: (d: Track) =>
            d.cells.map((cell: Cell) => cellMetaData.getPosition(cell)),
        // deduct start timestamp from each data point to avoid overflow
        getTimestamps: (d: Track) =>
            d.cells.map((cell: Cell) => cellMetaData.getFrame(cell)),
        getColor: [152, 78, 163],
        opacity: 0.6,
        // widthMinPixels: 5,
        rounded: true,
        fadeTrail: true,
        trailLength: imageViewerStore.effectiveTrailLength,
        currentTime: imageViewerStore.frameNumber,
    });
}

const imageLayer = ref();
function renderDeckGL(): void {
    if (deckgl == null) return;
    const layers = [];
    if (imageViewerStore.showImageLayer) {
        if (pixelSource.value == null) return;
        imageLayer.value?.state?.abortController?.abort();
        imageLayer.value = createBaseImageLayer();
        layers.push(imageLayer.value);
    }
    if (imageViewerStore.showCellBoundaryLayer) {
        layers.push(createSegmentationsLayer());
    }
    if (imageViewerStore.showTrailLayer) {
        layers.push(createTrajectoryGhostLayer());
    }
    if (imageViewerStore.showLineageLayer) {
        layers.push(createLineageLayer());
        layers.push(createCenterPointLayer());
    }
    deckgl.setProps({
        layers,
        controller: true,
    });
}

function renderLoadingDeckGL(): void {
    if (deckgl == null) return;
    deckgl.setProps({
        layers: [
            new TextLayer({
                id: 'loading-screen-layer',
                data: ['Loading...'], // one hardcoded item
                pickable: false,
                getPosition: [0, 0],
                getText: (d) => d,
                getSize: 32,
                getAngle: 0,
                getTextAnchor: 'middle',
                getAlignmentBaseline: 'center',
            }),
        ],
        initialViewState: {
            zoom: 0,
            target: [0, 0, 0],
            minZoom: 0,
            maxZoom: 0,
        },
        controller: {
            scrollZoom: false,
            dragPan: false,
            dragRotate: false,
            doubleClickZoom: false,
            touchZoom: false,
            touchRotate: false,
            keyboard: false,
        }, // controller: false didn't seem to work..
    });
}

function resetView() {
    if (currentImageStackMetadata.value == null) return;
    const zoomX = containerWidth.value / currentImageStackMetadata.value.sizeX;
    const zoomY = containerHeight.value / currentImageStackMetadata.value.sizeY;
    const zoomPercent = 0.9 * Math.min(zoomX, zoomY);
    // console.log('reset');
    // ensure the image fills the space
    deckgl.setProps({
        initialViewState: {
            zoom: Math.log2(zoomPercent),
            target: [
                currentImageStackMetadata.value.sizeX / 2 +
                    Math.random() * 0.001, // hack since it will only reset if viewState is different
                // see https://github.com/visgl/deck.gl/issues/8198
                currentImageStackMetadata.value.sizeY / 2 +
                    Math.random() * 0.001,
                0,
            ],
            minZoom: -8,
            maxZoom: 8,
        },
    });
}

const { hoveredTrackId } = storeToRefs(cellMetaData);
watch(hoveredTrackId, renderDeckGL);
watch(dataPointSelection.$state, renderDeckGL);
watch(imageViewerStore.$state, renderDeckGL);
watch(contrastLimitSlider, renderDeckGL);
</script>

<template>
    <canvas
        id="super-cool-unique-id"
        ref="deckGlContainer"
        :class="
            cellMetaData.hoveredTrackId !== null ? 'force-default-cursor' : ''
        "
        @reset-image-view="resetView"
    ></canvas>
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
