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
import CellSnippetsLayer from './layers/CellSnippetsLayer';
import type { Selection } from './layers/CellSnippetsLayer';
import { useImageViewerStore } from '@/stores/imageViewerStore';
import { useImageViewerStoreUntrracked } from '@/stores/imageViewerStoreUntrracked';
import { useDatasetSelectionStore } from '@/stores/datasetSelectionStore';
import { useDatasetSelectionTrrackedStore } from '@/stores/datasetSelectionTrrackedStore';
import { useEventBusStore } from '@/stores/eventBusStore';
import {
    useLooneageViewStore,
    type SelectedSnippet,
} from '@/stores/looneageViewStore';
import { isEqual } from 'lodash-es';
import { useGlobalSettings } from '@/stores/globalSettings';

import { Pool } from 'geotiff';
import type { Feature } from 'geojson';
import { flextree, type LayoutNode } from 'd3-flextree';
import { hierarchy } from 'd3-hierarchy';
import {
    expandHeight,
    getMaxHeight,
    type BBox,
    type BetterBBox,
    getWidth,
    getHeight,
    getBBoxAroundPoint,
    overlaps,
    overlapAmount,
    outerBBox,
} from '@/util/imageSnippets';

import { LRUCache } from 'lru-cache';

import { useKeypress } from 'vue3-keypress';

import {
    loadOmeTiff,
    getChannelStats,
    AdditiveColormapExtension,
} from '@hms-dbmi/viv';

import type { PixelData, PixelSource } from '@vivjs/types';
import { Deck, OrthographicView, type PickingInfo } from '@deck.gl/core/typed';
import {
    GeoJsonLayer,
    LineLayer,
    PathLayer,
    PolygonLayer,
    ScatterplotLayer,
    // SolidPolygonLayer,
    TextLayer,
} from '@deck.gl/layers/typed';

import SnippetSegmentationLayer from './layers/SnippetSegmentationLayer/SnippetSegmentationLayer';
import SnippetSegmentationOutlineLayer from './layers/SnippetSegmentationOutlineLayer/SnippetSegmentationOutlineLayer';

import HorizonChartLayer from './layers/HorizonChartLayer/HorizonChartLayer';

const cellMetaData = useCellMetaData();
const globalSettings = useGlobalSettings();

const dataPointSelection = useDataPointSelection();
const imageViewerStore = useImageViewerStore();
const imageViewerStoreUntrracked = useImageViewerStoreUntrracked();
const datasetSelectionStore = useDatasetSelectionStore();
const datasetSelectionTrrackedStore = useDatasetSelectionTrrackedStore();
const { currentLocationMetadata } = storeToRefs(datasetSelectionStore);
const { contrastLimitSlider } = storeToRefs(imageViewerStoreUntrracked);
const { frameNumber } = storeToRefs(imageViewerStore);
const { selectedTrack, selectedLineage } = storeToRefs(cellMetaData);
const eventBusStore = useEventBusStore();
const segmentationStore = useSegmentationStore();
const looneageViewStore = useLooneageViewStore();
const { attrKey, spaceKeyframesEvenly } = storeToRefs(looneageViewStore);
const { darkMode } = storeToRefs(globalSettings);

const shiftDown = ref(false);
useKeypress({
    keyEvent: 'keydown',
    onAnyKey: (e: any) => {
        const event = e.event as KeyboardEvent;
        if (event.code === 'ShiftLeft' || event.code === 'ShiftRight') {
            onShiftDown();
        }
    },
    keyBinds: [],
});
useKeypress({
    keyEvent: 'keyup',
    onAnyKey: (e: any) => {
        const event = e.event as KeyboardEvent;
        if (event.code === 'ShiftLeft' || event.code === 'ShiftRight') {
            onShiftUp();
        }
    },
    keyBinds: [],
});

function onShiftDown() {
    shiftDown.value = true;
}

function onShiftUp() {
    shiftDown.value = false;
}

const deckGlContainer = ref(null);
const { width: deckGlWidth, height: deckGlHeight } =
    useElementSize(deckGlContainer);

const tree = computed(() => {
    if (cellMetaData.selectedLineage == null) return null;
    return hierarchy<Track | null>(
        cellMetaData.selectedLineage.founder,
        (d: Track | null) => {
            if (d == null) return null;
            if (d.attrNum['generation'] < looneageViewStore.maxDepth) {
                const children: (Track | null)[] = d.children;
                if (looneageViewStore.includeSiblingBuffer) {
                    // insert null into index 1
                    const withBufferNode = [...children];
                    withBufferNode.splice(1, 0, null);
                    return withBufferNode;
                }
                return children;
            }
            return null;
        }
    );
});
function getTimeExtent(track: Track): [number, number] {
    let minTime = track.attrNum['min_time'] ?? 0;
    let maxTime = track.attrNum['max_time'] ?? 0;
    return [minTime, maxTime];
}

function getTimeDuration(track: Track): number {
    let [minTime, maxTime] = getTimeExtent(track);
    return maxTime - minTime;
}

function getTimeDurationForLayout(track: Track): number {
    let [minTime, maxTime] = getTimeExtent(track);
    const parent = cellMetaData.getParent(track);
    if (parent) {
        minTime = parent.attrNum['max_time'];
    }
    return maxTime - minTime;
}

function getTimeOffsetBetweenParentChild(track: Track): number {
    return getTimeDurationForLayout(track) - getTimeDuration(track);
}

const layoutRoot = computed<LayoutNode<Track | null> | null>(() => {
    if (cellMetaData.selectedLineage == null) return null;
    return flextree<Track | null>({
        nodeSize: (node: LayoutNode<Track | null>) => {
            if (node.data == null)
                return [
                    looneageViewStore.rowHeight,
                    // looneageViewStore.rowBufferHeight -
                    //     2 * looneageViewStore.spacing,
                    cellMetaData.timestep,
                ];
            const timeWidth = getTimeDurationForLayout(node.data);
            return [looneageViewStore.rowHeight, timeWidth];
        },
        spacing: looneageViewStore.spacing,
    })(tree.value);
});

const treeBBox = computed<BetterBBox | null>(() => {
    if (layoutRoot.value == null) return null;
    let minX = 0;
    let maxX = 0;
    let minY = 0;
    let maxY = 0;
    for (let node of layoutRoot.value.descendants()) {
        if (node.data == null) continue;
        const left = getLeftPosition(node as LayoutNode<Track>);
        const right = getRightPosition(node as LayoutNode<Track>);
        const top = node.x;
        const bottom = node.x - looneageViewStore.rowHeight;
        minX = Math.min(minX, left);
        maxX = Math.max(maxX, right);
        minY = Math.min(minY, bottom);
        maxY = Math.max(maxY, top);
    }

    return { minX, maxX, minY, maxY };
});

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

eventBusStore.emitter.on('resetLooneageView', resetView);
function resetView() {
    if (deckgl == null) return;
    if (treeBBox.value == null) return;
    // console.log('resetting looneage view');
    // get center
    let { minX, maxX, minY, maxY } = treeBBox.value;
    const x = (minX + maxX) / 2 + Math.random() * 0.00001;
    // Why random? See https://github.com/visgl/deck.gl/issues/8198

    minY -= looneageViewStore.snippetDestSize + getHorizonSnippetPadding();
    const y = (minY + maxY) / 2;

    // get Scale X to fit width
    let zoomX = 1;
    const solverIterations = 10;
    for (let i = 0; i < solverIterations; i++) {
        // zoomX depends on zoomX. We are finding the solution iteratively.
        // Fortunately this converges quickly.
        zoomX =
            deckGlWidth.value /
            (maxX -
                minX +
                (3 * looneageViewStore.snippetDestSize +
                    5 * getBetweenSnippetPaddingXRaw()) /
                    zoomX);
    }
    // add margin
    // zoomX *= 0.9;

    // transform to log scale
    zoomX = Math.log2(zoomX);

    const newViewState = {
        zoom: [zoomX, 0],
        target: [x, y],
        minZoom: -8,
        maxZoom: 8,
    };
    viewStateMirror.value = newViewState;

    deckgl.setProps({ initialViewState: newViewState });
    renderDeckGL();
}

let deckgl: any | null = null;
const initialViewState = {
    zoom: [0, 0],
    target: [0, 0],
    minZoom: -8,
    maxZoom: 8,
};

const lruCache = new LRUCache({
    max: 250,
});
// this mirror is required because the deckgl viewstate is out of sync by one frame
// when we call renderDeckGL from onViewStateChange
const viewStateMirror = ref(initialViewState);
onMounted(() => {
    deckgl = new Deck({
        initialViewState,
        // @ts-ignore
        canvas: deckGlContainer.value?.id,
        views: new OrthographicView({
            id: 'looneageController',
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
        onViewStateChange: ({ viewState, oldViewState }) => {
            viewState.zoom[1] = 0;
            if (oldViewState && !isEqual(viewState.zoom, oldViewState.zoom)) {
                viewState.target[1] = oldViewState.target[1];
            }
            viewStateMirror.value = viewState as any;
            renderDeckGL();
            return viewState;
        },
        // onInteractionStateChange: () => console.log('onInteractionStateChange'),
        // onLoad: () => console.log('onLoad'),
    });
    // renderDeckGL();
});

// const testGeometry = computed<number[]>(() => {
//     if (!cellMetaData.selectedTrack) return [];
//     // const areaGen = area<Cell>()
//     //     .x((d: Cell) => cellMetaData.getTime(d))
//     //     .y1((d: Cell) => 10 * cellMetaData.getMass(d))
//     //     .y0(0);

//     const geometry: number[] = [];
//     const key = looneageViewStore.attrKey;
//     let x = 0;
//     let y = 0;
//     // min/max just for debugging
//     let minY = Infinity;
//     let maxY = -Infinity;

//     let minX = Infinity;
//     let maxX = -Infinity;

//     const testBottom = -404.123456789;
//     // this is a hack to make the shaders work correctly.
//     // this value is used in the shaders to determine the non value side
//     // of the geometry. If a data has this exact value there will be a
//     // small visual bug. This value is arbitrary, but is less likely to
//     // be found in data than 0.

//     const firstX = cellMetaData.getTime(cellMetaData.selectedTrack.cells[0]);
//     geometry.push(firstX, testBottom);
//     for (const cell of cellMetaData.selectedTrack.cells) {
//         y = cell.attrNum[key];
//         minY = Math.min(minY, y);
//         maxY = Math.max(maxY, y);

//         x = cellMetaData.getTime(cell);
//         minX = Math.min(minX, x);
//         maxX = Math.max(maxX, x);

//         geometry.push(x, y);
//         geometry.push(x, testBottom);
//     }

//     geometry.push(x, testBottom);
//     return geometry;
// });

function constructGeometry(track: Track): number[] {
    const geometry: number[] = [];
    const key = looneageViewStore.attrKey;

    const hackyBottom = -404.123456789;
    // this is a hack to make the shaders work correctly.
    // this value is used in the shaders to determine the non value side
    // of the geometry. If a data has this exact value there will be a
    // small visual bug. This value is arbitrary, but is less likely to
    // be found in data than 0.

    if (track.cells.length === 1) {
        const cell = track.cells[0];
        const x = cellMetaData.getTime(cell);
        const x1 = x - cellMetaData.timestep / 2;
        const x2 = x + cellMetaData.timestep / 2;
        const y = cell.attrNum[key];
        geometry.push(x1, hackyBottom);
        geometry.push(x1, y);
        geometry.push(x2, hackyBottom);
        geometry.push(x2, y);
        return geometry;
    }

    const firstX = cellMetaData.getTime(track.cells[0]);
    geometry.push(firstX, hackyBottom);
    let x = 0;
    for (const cell of track.cells) {
        const y = cell.attrNum[key];

        x = cellMetaData.getTime(cell);

        geometry.push(x, y);
        geometry.push(x, hackyBottom);
    }

    geometry.push(x, hackyBottom);
    return geometry;
}

const testModOffests = [-8, -7, -6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5];

// const destination = computed<[number, number, number, number]>(() => [
//     0,
//     0,
//     300,
//     looneageViewStore.rowHeight,
// ]);

// const dataXExtent = computed<[number, number]>(() => {
//     if (!cellMetaData.selectedTrack) return [0, 0];
//     const minTime = cellMetaData.getFrame(cellMetaData.selectedTrack.cells[0]);
//     const lastIndex = cellMetaData.selectedTrack.cells.length - 1;
//     const maxTime = cellMetaData.getFrame(
//         cellMetaData.selectedTrack.cells[lastIndex]
//     );
//     return [minTime, maxTime];
// });

const lineageMinTime = computed<number>(() => {
    if (!cellMetaData.selectedLineage) return 0;
    return cellMetaData.selectedLineage.founder.attrNum['min_time'];
});

function createConnectingLinesLayer(): PathLayer | null {
    if (!layoutRoot.value?.descendants()) return null;
    const lines = [];
    for (const node of layoutRoot.value.descendants()) {
        if (!node.parent) continue;
        if (node.data === null) continue;
        const nodeWithData = node as LayoutNode<Track>;
        const childCenter = getMiddleVert(nodeWithData);
        const parentRight = getRightPosition(node.parent);
        const a = [getLeftPosition(nodeWithData), childCenter];
        const b = [parentRight, childCenter];
        const c = [parentRight, getMiddleVert(node.parent)];
        // lines.push({ source: a, target: b });
        // lines.push({ source: b, target: c });
        lines.push([a, b, c]);
    }
    return new PathLayer({
        id: 'connecting-lines-layer',
        data: lines,
        getPath: (d: any) => d,
        // getTargetPosition: (d: any) => d.target,
        getColor: [180, 180, 180],
        getWidth: looneageViewStore.connectingLineWidth,
        widthUnits: 'pixels',
        jointRounded: true,
    });
}

function createTickMarksLayer(): PathLayer | null {
    if (!layoutRoot.value?.descendants()) return null;
    const height = getTickmarkHeight();
    const spaceThreshold = minTickMarkSpace();
    const lines = [];
    let lastX = null;
    for (const node of layoutRoot.value.descendants()) {
        if (node.data === null) continue;
        const nodeWithData = node as LayoutNode<Track>;
        if (!horizonInViewport(nodeWithData)) continue;
        for (const cell of node.data.cells) {
            const x =
                getLeftPosition(nodeWithData) +
                cellMetaData.getTime(cell) -
                node.data.attrNum['min_time'];
            if (lastX !== null) {
                if (Math.abs(x - lastX) < spaceThreshold) return null;
                // If the points are too close together,
                // skip rendering, it is worse visually and
                // is a performance hit.
            }
            lastX = x;
            const bottom = node.x + height;
            const top = node.x - height - looneageViewStore.rowHeight;
            const a = [x, bottom];
            const b = [x, top];
            lines.push([a, b]);
        }
    }
    return new PathLayer({
        id: 'horizon-tick-marks-layer',
        data: lines,
        getPath: (d: any) => d,
        getColor: darkMode.value ? [100, 100, 100] : [180, 180, 180],
        getWidth: getTickmarkWidth(),
        widthUnits: 'pixels',
    });
}

const hoveredTime = ref<number | null>(null);

function createHorizonChartLayers(): (
    | ScatterplotLayer
    | HorizonChartLayer
    | PolygonLayer
    | null
)[] {
    if (!cellMetaData.selectedLineage) return [];
    // if (!segmentationData.value) return [];
    if (!layoutRoot.value?.descendants()) return [];
    const layers: (
        | ScatterplotLayer
        | HorizonChartLayer
        | PolygonLayer
        | null
    )[] = [];
    const pickingLayer: {
        destination: [number, number, number, number];
        trackId: string;
    }[] = [];
    for (let node of layoutRoot.value.descendants()) {
        if (node.data === null) continue;
        const nodeWithData = node as LayoutNode<Track>;
        // if (node.depth > looneageViewStore.maxDepth) continue;
        layers.push(createHorizonChartLayer(nodeWithData));

        const track = node.data;
        let left = getLeftPosition(nodeWithData);
        let width = getTimeDuration(track);
        if (width === 0) {
            width = cellMetaData.timestep;
            left -= width / 2;
        }
        const destination: [number, number, number, number] = [
            node.x,
            left,
            width,
            looneageViewStore.rowHeight,
        ];
        pickingLayer.push({ destination, trackId: track.trackId });
    }
    const destinationLayer = new PolygonLayer({
        id: 'destination-rectangle-layer',
        data: pickingLayer,
        pickable: true,
        getPolygon: (pickingData: {
            destination: [number, number, number, number];
            trackId: string;
        }) => {
            const d = pickingData.destination;
            return [
                [d[1], d[0]],
                [d[1] + d[2], d[0]],
                [d[1] + d[2], d[0] - d[3]],
                [d[1], d[0] - d[3]],
            ];
        },
        getFillColor: [255, 0, 255, 0],
        getLineColor: [128, 128, 128, 255],
        getLineWidth: 0,
        onHover: (info: PickingInfo) => {
            if (!cellMetaData.trackMap) return;
            const { selectedSnippet, time } = processHorizonPickingInfo(info);
            if (isEqual(selectedSnippet, hoveredSnippet.value)) return;
            hoveredTime.value = time;
            hoveredSnippet.value = selectedSnippet;
            renderDeckGL();
        },
        onClick: (info: PickingInfo) => {
            if (!cellMetaData.trackMap) return;
            let { selectedSnippet } = processHorizonPickingInfo(info);
            if (!selectedSnippet) return;
            if (shiftDown.value) {
                selectedSnippet =
                    looneageViewStore.concealPinnedSnippet(selectedSnippet);
            } else {
                selectedSnippet =
                    looneageViewStore.revealPinnedSnippet(selectedSnippet);
            }
            if (selectedSnippet) {
                hoveredSnippet.value = { ...selectedSnippet };
                hoveredSnippet.value.extraFrames += 1;
            } else if (hoveredSnippet.value) {
                hoveredSnippet.value.extraFrames = 0;
            }
            renderDeckGL();
        },
    });
    layers.push(destinationLayer);

    // layers.push(
    //     new ScatterplotLayer({
    //         id: 'looneage-test-scatterplot-layer',
    //         data: [
    //             [0, 0],
    //             [-19, 44],
    //             // [85, -30],

    //             // [0, 0],
    //             // [85, -30],

    //             // [85, -59],
    //             // [172, -89],

    //             // [85, 59],
    //             // [172, 29],
    //         ],
    //         pickable: true,
    //         opacity: 0.8,
    //         stroked: true,
    //         filled: true,
    //         radiusScale: 1,
    //         radiusMinPixels: 1,
    //         radiusMaxPixels: 100,
    //         lineWidthMinPixels: 0,
    //         getLineWidth: 0,
    //         getPosition: (d: any) => d,
    //         getRadius: 5,
    //         getFillColor: [255, 0, 255, 200],
    //     })
    // );

    return layers;
}

interface HorizonPickingResult {
    selectedSnippet: SelectedSnippet | null;
    time: number | null;
}

function processHorizonPickingInfo(info: PickingInfo): HorizonPickingResult {
    const result: HorizonPickingResult = { selectedSnippet: null, time: null };
    if (!cellMetaData.trackMap) return result;
    if (!info.picked) {
        result.time = null;
        result.selectedSnippet = null;
        return result;
    }
    const xPos = info.coordinate?.[0] ?? null;
    const newTime =
        xPos !== null
            ? cellMetaData.getClosestTime(xPos + lineageMinTime.value)
            : null;
    result.time = newTime;

    const trackId = info.object.trackId;
    const track = cellMetaData.trackMap.get(trackId);
    if (!track) {
        console.error('track not found when hovering');
        return result;
    }
    const index = track.cells.findIndex(
        (cell) => cellMetaData.getTime(cell) === newTime
    );
    result.selectedSnippet = {
        trackId,
        index,
        extraFrames: 0,
    };
    return result;
}

const hoveredSnippet = ref<SelectedSnippet | null>(null);

function hexListToRgba(hexList: readonly string[]): number[] {
    const rgbaList: number[] = [];
    for (let colorHex of hexList) {
        // convert coloHex to rgba array all values [0-1]
        const color = [];
        for (let i = 0; i < 3; i++) {
            color.push(
                parseInt(colorHex.slice(1 + i * 2, 1 + i * 2 + 2), 16) / 255
            );
        }
        color.push(1.0);
        rgbaList.push(...color);
    }
    return rgbaList;
}

function getLeftPosition(node: LayoutNode<Track>): number {
    return node.y + getTimeOffsetBetweenParentChild(node.data);
}

function getRightPosition(node: LayoutNode<Track>): number {
    return getLeftPosition(node) + getTimeDuration(node.data);
}

function getMiddleVert(node: LayoutNode<Track>): number {
    return node.x - looneageViewStore.rowHeight / 2;
}

interface TickData {
    path: [number, number][];
    hovered: boolean;
    pinned: boolean;
    drawerLine: boolean;
}

interface SnippetRenderInfo {
    node: LayoutNode<Track>;
    displayBelow: boolean;
}

interface SnippetCellInfo {
    cell: Cell;
    destinationBottomLeft: [number, number];
    hovered: boolean;
}

interface KeyFrameSnippetsResult {
    snippetCellInfo: SnippetCellInfo[];
    imageLayer: CellSnippetsLayer | null;
    snippetTickLayer: PathLayer | null;
    hoverLayer: CellSnippetsLayer | null;
    pickingLayer: PolygonLayer;
}

function createKeyFrameSnippets(): KeyFrameSnippetsResult | null {
    if (!layoutRoot.value) return null;
    // used for collision detection, to prevent overlapping. The logic
    // is slightly different for the horizon charts and the user selected
    // snippets, which include hovered and pinned snippets
    const occupied: BBox[] = [];
    const userSelectedSnippetBBoxes: BBox[] = [];

    // set up a few variables that will be used in the loops
    const destWidth = scaleForConstantVisualSize(
        looneageViewStore.snippetDestSize,
        'x'
    );

    const destHeight = scaleForConstantVisualSize(
        looneageViewStore.snippetDestSize,
        'y'
    );

    const tickPadding = getHorizonSnippetPadding();
    const aboveOffset = looneageViewStore.rowHeight + tickPadding;
    const belowOffset = destHeight + tickPadding;

    const trackIdToRenderInfo = new Map<string, SnippetRenderInfo>();
    // this is needed to keep track of render info, so that user selected
    // snippets can be added after the auto selected snippets on the correct
    // side (above/below)

    // add horizon chart as occupied rectangle
    for (let node of layoutRoot.value.descendants()) {
        if (node.data === null) continue;
        const nodeWithData = node as LayoutNode<Track>;
        trackIdToRenderInfo.set(nodeWithData.data.trackId, {
            node: nodeWithData,
            displayBelow: false,
        });
        if (!horizonInViewport(nodeWithData)) continue; // for performance
        const left = getLeftPosition(nodeWithData);
        const right = getRightPosition(nodeWithData);
        const chartBBox: BBox = [
            left,
            node.x,
            right,
            node.x - looneageViewStore.rowHeight,
        ];
        occupied.push(chartBBox);
    }

    // get snippet placement for each horizon chart. All snippets will be placed
    // on the same side of the chart. Find the side with more free space, and prefer
    // the top in  at tie. This calculation should be done before the user selected snippets
    // it is jarring if hovering/selecting  causes the side to change.
    const selections: Selection[] = [];
    const hoverSelections: Selection[] = [];
    const snippetCellInfo: SnippetCellInfo[] = [];
    const addSelection = (selection: Selection, collection: Selection[]) => {
        const matchingSelection = collection.find(
            (s) =>
                s.c === selection.c &&
                s.z === selection.z &&
                s.t === selection.t
        );
        if (matchingSelection) {
            matchingSelection.snippets.push(...selection.snippets);
        } else {
            collection.push(selection);
        }
    };

    const snippetPickingData: {
        trackId: string;
        index: number;
        destination: BBox;
    }[] = [];

    const ticks: TickData[] = [];
    for (let node of layoutRoot.value.descendants()) {
        if (node.data === null) continue;
        const nodeWithData = node as LayoutNode<Track>;
        if (!horizonInViewport(nodeWithData)) continue; // for performance

        const centeredBBox: BBox = [
            getLeftPosition(nodeWithData) - destWidth / 2,
            node.x,
            getRightPosition(nodeWithData) + destHeight / 2,
            node.x - destHeight,
        ];
        const aboveBBox: BBox = [...centeredBBox];
        aboveBBox[1] -= aboveOffset;
        aboveBBox[3] -= aboveOffset;
        const belowBBox: BBox = [...centeredBBox];
        belowBBox[1] += belowOffset;
        belowBBox[3] += belowOffset;

        let aboveOverlap = 0;
        let belowOverlap = 0;
        for (const bbox of occupied) {
            aboveOverlap += overlapAmount(aboveBBox, bbox);
            belowOverlap += overlapAmount(belowBBox, bbox);
        }
        const displayBelow = aboveOverlap > belowOverlap;
        // preffer to display above
        // but if there is moe overlap above then place below
        const track = node.data;
        const renderInfo = trackIdToRenderInfo.get(track.trackId);
        if (renderInfo) {
            renderInfo.displayBelow = displayBelow;
        }
    }

    // add pinned snippets to user selected, and selections
    for (const snippet of Object.values(looneageViewStore.pinnedSnippets)) {
        const track = cellMetaData.trackMap?.get(snippet.trackId);
        if (!track) continue;
        const renderInfo = trackIdToRenderInfo.get(track.trackId);
        if (!renderInfo) {
            console.error('could not find render info');
            continue;
        }
        let outerPinnedBBox: BBox | null = null;
        const { displayBelow, node } = renderInfo;
        for (
            let indexOffset = -snippet.extraFrames;
            indexOffset <= snippet.extraFrames;
            indexOffset++
        ) {
            let index = snippet.index + indexOffset;
            index = Math.max(index, 0);
            index = Math.min(index, track.cells.length - 1);
            const cell = track.cells[index];
            let frameIndex = cellMetaData.getFrame(cell) - 1; // convert frame number to index
            // account for offset if past first/last frame
            const edgeIndexOffset = snippet.index + indexOffset - index;
            frameIndex += snippet.index + indexOffset - index;
            if (
                frameIndex < 0 ||
                frameIndex >= imageViewerStoreUntrracked.sizeT
            ) {
                continue;
            }
            const pinnedBbox = getSnippetBBox(
                snippet.index,
                node,
                displayBelow,
                aboveOffset,
                belowOffset,
                destWidth,
                destHeight,
                indexOffset
            );
            if (
                !overlaps(
                    pinnedBbox,
                    viewportBBox(),
                    getBetweenSnippetPaddingX(),
                    getBetweenSnippetPaddingY()
                )
            )
                continue;

            if (outerPinnedBBox === null) {
                outerPinnedBBox = [...pinnedBbox];
            } else {
                outerPinnedBBox = outerBBox(outerPinnedBBox, pinnedBbox);
            }

            const [x, y] = cellMetaData.getPosition(cell);
            const source = getBBoxAroundPoint(
                x,
                y,
                looneageViewStore.snippetSourceSize,
                looneageViewStore.snippetSourceSize
            );
            addSelection(
                {
                    c: 0,
                    z: 0,
                    t: frameIndex,
                    snippets: [{ source, destination: pinnedBbox }],
                },
                selections
            );
            if (edgeIndexOffset === 0) {
                // add for the cell boundary only if snippet is within track bounds
                snippetCellInfo.push({
                    cell,
                    destinationBottomLeft: [pinnedBbox[0], pinnedBbox[1]],
                    hovered: false,
                });
            }
            snippetPickingData.push({
                trackId: track.trackId,
                index: snippet.index,
                destination: pinnedBbox,
            });
            const tickData = getTickData(
                node,
                index,
                cell,
                tickPadding,
                displayBelow,
                false,
                true,
                edgeIndexOffset,
                indexOffset ? true : false
            );
            ticks.push(tickData);
        }
        if (outerPinnedBBox) {
            userSelectedSnippetBBoxes.push(outerPinnedBBox);
            if (snippet.extraFrames > 0) {
                const windowDrawerData = getWindowDrawer(
                    outerPinnedBBox,
                    displayBelow
                );
                ticks.push(windowDrawerData);
            }
        }
    }

    // add the hovered snippet to render, and to collisions
    if (hoveredSnippet.value && cellMetaData.trackMap != null) {
        const trackId = hoveredSnippet.value.trackId;
        const renderInfo = trackIdToRenderInfo.get(trackId);
        if (renderInfo) {
            let outerHoveredBBox: BBox | null = null;
            const { displayBelow, node } = renderInfo;
            for (
                let indexOffset = -hoveredSnippet.value.extraFrames;
                indexOffset <= hoveredSnippet.value.extraFrames;
                indexOffset++
            ) {
                const track = node.data;

                let index = hoveredSnippet.value.index + indexOffset;
                index = Math.max(index, 0);
                index = Math.min(index, track.cells.length - 1);

                // add hovered image snippet to selections
                const cell = track.cells[index];
                let frameIndex = cellMetaData.getFrame(cell) - 1; // convert frame number to index
                // account for offset if past first/last frame
                const edgeIndexOffset =
                    hoveredSnippet.value.index + indexOffset - index;
                frameIndex += hoveredSnippet.value.index + indexOffset - index;
                if (
                    frameIndex < 0 ||
                    frameIndex >= imageViewerStoreUntrracked.sizeT
                ) {
                    continue;
                }
                const hoveredBBox = getSnippetBBox(
                    hoveredSnippet.value.index,
                    node,
                    displayBelow,
                    aboveOffset,
                    belowOffset,
                    destWidth,
                    destHeight,
                    indexOffset
                );
                if (outerHoveredBBox === null) {
                    outerHoveredBBox = [...hoveredBBox];
                } else {
                    outerHoveredBBox = outerBBox(outerHoveredBBox, hoveredBBox);
                }

                const [x, y] = cellMetaData.getPosition(cell);
                const source = getBBoxAroundPoint(
                    x,
                    y,
                    looneageViewStore.snippetSourceSize,
                    looneageViewStore.snippetSourceSize
                );
                const destination = hoveredBBox;
                addSelection(
                    {
                        c: 0,
                        z: 0,
                        t: frameIndex,
                        snippets: [{ source, destination }],
                    },
                    hoverSelections
                );
                if (edgeIndexOffset === 0) {
                    // add for the cell boundary only if snippet is within track bounds
                    snippetCellInfo.push({
                        cell,
                        destinationBottomLeft: [hoveredBBox[0], hoveredBBox[1]],
                        hovered: true,
                    });
                }
                snippetPickingData.push({
                    trackId: track.trackId,
                    index: hoveredSnippet.value.index,
                    destination,
                });

                // add tick mark for hovered snippet
                const tickData = getTickData(
                    node,
                    index,
                    cell,
                    tickPadding,
                    displayBelow,
                    true,
                    false,
                    edgeIndexOffset,
                    indexOffset ? true : false
                );
                ticks.push(tickData);
            }
            if (outerHoveredBBox) {
                userSelectedSnippetBBoxes.push(outerHoveredBBox);
                if (hoveredSnippet.value.extraFrames > 0) {
                    const windowDrawerData = getWindowDrawer(
                        outerHoveredBBox,
                        displayBelow
                    );
                    ticks.push(windowDrawerData);
                }
            }
        }
    }

    // add the automatic snippets, avoiding horizons and user selected snippets
    for (const node of layoutRoot.value.descendants()) {
        if (node.data === null) continue;
        const nodeWithData = node as LayoutNode<Track>;
        const track = node.data;
        const renderInfo = trackIdToRenderInfo.get(track.trackId);
        if (!renderInfo) {
            console.error('could not find render info');
            continue;
        }
        const { displayBelow } = renderInfo;
        const keyframeOrder = getKeyFrameOrder(node.data);
        let newSnippetsOuterBBox: BBox | null = null;

        for (const { index, nearestDistance } of keyframeOrder) {
            // exit loop if this point would overlap existing points
            if (nearestDistance <= destWidth + getBetweenSnippetPaddingX())
                break;
            const destination: BBox = getSnippetBBox(
                index,
                nodeWithData,
                displayBelow,
                aboveOffset,
                belowOffset,
                destWidth,
                destHeight
            );

            if (
                !overlaps(
                    destination,
                    viewportBBox(),
                    getBetweenSnippetPaddingX(),
                    getBetweenSnippetPaddingY()
                ) ||
                occupied.some((bbox: BBox) =>
                    overlaps(
                        bbox,
                        destination,
                        getBetweenSnippetPaddingX(),
                        getBetweenSnippetPaddingY()
                    )
                ) ||
                userSelectedSnippetBBoxes.some((bbox: BBox) =>
                    overlaps(
                        bbox,
                        destination,
                        getBetweenSnippetPaddingX(),
                        getBetweenSnippetPaddingY()
                    )
                )
            ) {
                // this overlaps with existing occupied spaces, do not
                // add this snippet to render, but continue adding the
                // next keyframes until the distance is low enough.
                continue;
            }

            // update this track's snippets outer bounding box
            if (newSnippetsOuterBBox === null) {
                newSnippetsOuterBBox = [...destination];
            } else {
                newSnippetsOuterBBox = outerBBox(
                    newSnippetsOuterBBox,
                    destination
                );
            }

            const cell = track.cells[index];
            const [x, y] = cellMetaData.getPosition(cell);
            const source = getBBoxAroundPoint(
                x,
                y,
                looneageViewStore.snippetSourceSize,
                looneageViewStore.snippetSourceSize
            );
            addSelection(
                {
                    c: 0,
                    z: 0,
                    t: cellMetaData.getFrame(cell) - 1, // convert frame number to index
                    snippets: [{ source, destination }],
                },
                selections
            );
            snippetCellInfo.push({
                cell,
                destinationBottomLeft: [destination[0], destination[1]],
                hovered: false,
            });
            snippetPickingData.push({
                trackId: track.trackId,
                index,
                destination,
            });
            const tickData = getTickData(
                nodeWithData,
                index,
                cell,
                tickPadding,
                displayBelow,
                false,
                false
            );
            ticks.push(tickData);
        }
        if (newSnippetsOuterBBox !== null) {
            occupied.push(newSnippetsOuterBBox);
        }
    }

    // create the actual layers now the data is generated
    const snippetTickMarksLayer = new PathLayer({
        id: 'snippet-tick-marks-layer',
        data: ticks,
        getPath: (d: any) => d.path,
        getColor: (d: any) => {
            if (d.hovered | d.pinned) {
                return [130, 145, 170, 200];
            } else if (d.drawerLine) {
                if (globalSettings.darkMode) {
                    return [195, 217, 250, 200];
                } else {
                    return [65, 72, 85, 200];
                }
            } else {
                return [130, 145, 170, 150];
            }
        },
        // getColor: [255, 255, 255],
        getWidth: (d: any) => (d.hovered ? 3 : 1.5),
        widthUnits: 'pixels',
        capRounded: false,
    });
    const snippetLayer = new CellSnippetsLayer({
        loader: pixelSource.value,
        id: `key-frames-snippets-layer`,
        contrastLimits: contrastLimit.value,
        selections,
        channelsVisible: [true],
        extensions: [colormapExtension],
        colormap: imageViewerStore.colormap,
        cache: lruCache,
    });

    let hoverLayer = null;
    if (hoverSelections.length > 0) {
        hoverLayer = new CellSnippetsLayer({
            loader: pixelSource.value,
            id: `hovered-snippets-layer`,
            contrastLimits: contrastLimit.value,
            selections: hoverSelections,
            channelsVisible: [true],
            extensions: [colormapExtension],
            colormap: imageViewerStore.colormap,
            cache: lruCache,
        });
    }

    const snippetPickingLayer = new PolygonLayer({
        id: 'snippet-picking-layer',
        data: snippetPickingData,
        pickable: true,
        getPolygon: (pickingData: {
            destination: [number, number, number, number]; // left, top, right, bottom
            trackId: string;
            index: number;
        }) => {
            const d = pickingData.destination;
            return [
                [d[0], d[1]],
                [d[2], d[1]],
                [d[2], d[3]],
                [d[0], d[3]],
            ];
        },
        getFillColor: [255, 0, 255, 0],
        getLineColor: [20, 230, 20, 200],
        getLineWidth: (d: any) => {
            if (
                hoveredSnippet.value?.trackId === d.trackId &&
                hoveredSnippet.value?.index === d.index
            ) {
                return 1;
            }
            return 0;
        },

        lineWidthUnits: 'pixels',
        onHover: (info: PickingInfo) => {
            if (!cellMetaData.trackMap) return;
            if (!info.picked) {
                hoveredSnippet.value = null;
                hoveredTime.value = null;
                renderDeckGL();
                return;
            }
            const { trackId, index } = info.object;
            let selectedSnippet = looneageViewStore.getSnippet(trackId, index);

            const track = cellMetaData.trackMap.get(trackId);
            if (!track) return;
            const cell = track.cells[index];
            const time = cellMetaData.getTime(cell);
            hoveredTime.value = time;
            if (!selectedSnippet) {
                // not currently pinned auto placed snippet
                selectedSnippet = {
                    trackId,
                    index,
                    extraFrames: 1,
                };
                hoveredSnippet.value = selectedSnippet;
                hoveredTime.value = null;
                renderDeckGL();
                return;
            }
            if (isEqual(selectedSnippet, hoveredSnippet.value)) return;
            hoveredSnippet.value = { ...selectedSnippet };
            if (hoveredSnippet.value) {
                const matchingPinnedSnippet =
                    looneageViewStore.getMatchingPinnedSnippet(
                        hoveredSnippet.value
                    );
                if (matchingPinnedSnippet) {
                    hoveredSnippet.value.extraFrames =
                        matchingPinnedSnippet.extraFrames + 1;
                }
            }
            console.log('hover end');
            renderDeckGL();
        },
        onClick: (info: PickingInfo) => {
            if (!cellMetaData.trackMap) return;
            const { trackId, index } = info.object;
            let selectedSnippet = looneageViewStore.getSnippet(trackId, index);
            if (!selectedSnippet) {
                // not currently pinned a auto placed snippet
                selectedSnippet = {
                    trackId,
                    index,
                    extraFrames: 1,
                };
            }
            if (shiftDown.value) {
                selectedSnippet =
                    looneageViewStore.concealPinnedSnippet(selectedSnippet);
            } else {
                selectedSnippet =
                    looneageViewStore.revealPinnedSnippet(selectedSnippet);
            }
            if (selectedSnippet) {
                hoveredSnippet.value = { ...selectedSnippet };
            } else if (hoveredSnippet.value) {
                hoveredSnippet.value = null;
            }
            renderDeckGL();
        },
    });

    return {
        snippetCellInfo,
        imageLayer: snippetLayer,
        snippetTickLayer: snippetTickMarksLayer,
        hoverLayer,
        pickingLayer: snippetPickingLayer,
    };
}

function getSnippetBBox(
    index: number,
    node: LayoutNode<Track>,
    displayBelow: boolean,
    aboveOffset: number,
    belowOffset: number,
    destWidth: number,
    destHeight: number,
    indexOffset?: number
): BBox {
    let destY = node.x;
    if (displayBelow) {
        destY += belowOffset;
    } else {
        destY -= aboveOffset;
    }
    const track = node.data;
    const cell = track.cells[index];
    if (cell == null) {
        console.error('cell is null, can not get bbox');
        return [0, 0, 0, 0];
    }
    const t = cellMetaData.getTime(cell);

    let destX =
        getLeftPosition(node) + t - track.attrNum['min_time'] - destWidth / 2;
    if (indexOffset) {
        const offsetT = getOffsetTime(track, index, indexOffset);
        const evenDestX =
            destX + indexOffset * (destWidth + getBetweenSnippetPaddingX());
        const realDestX = destX + offsetT - t;
        if (indexOffset > 0) {
            destX = Math.max(evenDestX, realDestX);
        } else {
            destX = Math.min(evenDestX, realDestX);
        }
    }
    return [destX, destY, destX + destWidth, destY - destHeight];
}

function getTickData(
    node: LayoutNode<Track>,
    cellIndex: number,
    cell: Cell,
    tickPadding: number,
    displayBelow: boolean,
    hovered: boolean,
    pinned: boolean,
    indexOffset?: number,
    bufferTick = false
): TickData {
    let tickX = getLeftPosition(node) - node.data.attrNum['min_time'];
    let t = cellMetaData.getTime(cell);
    if (indexOffset) {
        t = getOffsetTime(node.data, cellIndex, indexOffset);
    }
    tickX += t;
    let tickSnippetY = node.x;
    let tickHorizonY = node.x;
    if (displayBelow) {
        tickSnippetY += tickPadding;
        tickHorizonY -= looneageViewStore.rowHeight;
        if (bufferTick) {
            tickSnippetY -= getSnippetDrawerLinePadding();
        } else {
            tickSnippetY += looneageViewStore.snippetDestSize / 2.0;
        }
    } else {
        tickSnippetY -= looneageViewStore.rowHeight + tickPadding;
        if (bufferTick) {
            tickSnippetY += getSnippetDrawerLinePadding();
        } else {
            tickSnippetY -= looneageViewStore.snippetDestSize / 2.0;
        }
    }
    return {
        path: [
            [tickX, tickSnippetY],
            [tickX, tickHorizonY],
        ],
        hovered,
        pinned,
        drawerLine: false,
    };
}

function getWindowDrawer(outerBBox: BBox, displayBelow: boolean): TickData {
    const [left, top, right, bottom] = outerBBox;
    const x1 = left - getBetweenSnippetPaddingX() / 2.0;
    const x2 = right + getBetweenSnippetPaddingX() / 2.0;
    let y1;
    let y2;
    if (displayBelow) {
        y1 = bottom - getSnippetDrawerLinePadding();
        y2 = y1 + 2 * getSnippetDrawerLinePadding();
    } else {
        y1 = top + getSnippetDrawerLinePadding();
        y2 = y1 - 2 * getSnippetDrawerLinePadding();
    }

    return {
        path: [
            [x1, y2],
            [x1, y1],
            [x2, y1],
            [x2, y2],
        ],
        hovered: false,
        pinned: false,
        drawerLine: true,
    };
}

function getOffsetTime(
    track: Track,
    cellIndex: number,
    offset: number
): number {
    const offsetCellIndex = cellIndex + offset;
    if (offsetCellIndex < 0 || offsetCellIndex >= track.cells.length) {
        const cell = track.cells[cellIndex];
        const t = cellMetaData.getTime(cell);
        const i = cellMetaData.timeList.findIndex((time) => time === t);
        if (i === -1) {
            console.error('could not find time in timeList');
            return -1;
        } else {
            return cellMetaData.timeList[i + offset];
        }
    } else {
        const cell = track.cells[offsetCellIndex];
        return cellMetaData.getTime(cell);
    }
}

function valueExtent(track: Track, key: string): number {
    let min = Infinity;
    let max = -Infinity;
    for (let cell of track.cells) {
        min = Math.min(min, cell.attrNum[key]);
        max = Math.max(max, cell.attrNum[key]);
    }
    return max - min;
}

function getHorizonSnippetPadding(): number {
    return scaleForConstantVisualSize(9, 'y');
}

function getTickmarkHeight(): number {
    return scaleForConstantVisualSize(3, 'y');
}

function getTickmarkWidth(): number {
    return 2; // expects pixel units
}

function minTickMarkSpace(): number {
    return scaleForConstantVisualSize(4.5, 'x');
}

function getSnippetDrawerLinePadding(): number {
    return scaleForConstantVisualSize(3, 'y');
}

function getBetweenSnippetPaddingXRaw(): number {
    return 8;
}
function getBetweenSnippetPaddingX(): number {
    return scaleForConstantVisualSize(getBetweenSnippetPaddingXRaw(), 'x');
}

function getBetweenSnippetPaddingY(): number {
    return scaleForConstantVisualSize(8, 'y');
}

interface KeyframeInfo {
    index: number;
    nearestDistance: number;
}

watch(attrKey, () => {
    keyframeOrderLookup.value = new Map();
});
watch(spaceKeyframesEvenly, () => {
    keyframeOrderLookup.value = new Map();
    renderDeckGL();
});
watch(datasetSelectionTrrackedStore.$state, () => {
    keyframeOrderLookup.value = new Map();
});
const keyframeOrderLookup = ref<Map<string, KeyframeInfo[]>>();
function getKeyFrameOrder(track: Track): KeyframeInfo[] {
    if (keyframeOrderLookup.value == null) {
        keyframeOrderLookup.value = new Map();
    }
    if (keyframeOrderLookup.value.has(track.trackId)) {
        return keyframeOrderLookup.value.get(track.trackId) as KeyframeInfo[];
    }

    // initialize scores based on the change in the attribute value
    // the first and last frames should always be
    // selected as key frames, so they get a score of zero.
    const frameScores: number[] = Array(track.cells.length).fill(0);
    frameScores[0] = Infinity;
    frameScores[track.cells.length - 1] = Infinity;
    if (!spaceKeyframesEvenly.value) {
        const key = looneageViewStore.attrKey;
        const valExtent = valueExtent(track, looneageViewStore.attrKey);
        for (let i = 1; i < track.cells.length - 1; i++) {
            if (valExtent === 0) {
                // avoid divide by zero, if vall extent is zero, then all
                // values are the same, so the scores should be equal.
                frameScores[i] = 0;
                continue;
            }
            const prev = track.cells[i - 1];
            const next = track.cells[i + 1];
            const val =
                Math.abs(next.attrNum[key] - prev.attrNum[key]) / valExtent;
            frameScores[i] = val;
        }
    }

    const frameDistances: number[] = Array(track.cells.length).fill(Infinity);

    const center = 1;
    const dropOff = 3;
    const keyframeOrder: KeyframeInfo[] = [];
    const timeExtent = getTimeDuration(track);
    for (let i = 0; i < track.cells.length; i++) {
        let maxIndex = -1;
        let maxScore = -Infinity;
        for (let i = 0; i < frameScores.length; i++) {
            if (frameDistances[i] === 0) continue;
            let coverageCost;
            if (frameDistances[i] === Infinity || timeExtent === 0) {
                coverageCost = 0;
            } else {
                const distNorm = (200 * frameDistances[i]) / timeExtent;
                coverageCost =
                    (-center * (distNorm - dropOff)) /
                        (center + Math.abs(distNorm - dropOff)) +
                    center;
            }
            const score = frameScores[i] - coverageCost;
            if (score > maxScore) {
                maxScore = score;
                maxIndex = i;
            }
        }
        keyframeOrder.push({
            index: maxIndex,
            nearestDistance: frameDistances[maxIndex],
        });

        // update the nearest distance values
        if (maxIndex === -1) {
            console.log('MAX INDEX', maxIndex);
        }
        const t1 = cellMetaData.getTime(track.cells[maxIndex]);

        // TODO: make d relative to tExtent, likely will have to update coverage function
        for (let i = maxIndex; i < frameDistances.length; i++) {
            const t2 = cellMetaData.getTime(track.cells[i]);
            const d = Math.abs(t1 - t2);
            if (frameDistances[i] < d) break;
            frameDistances[i] = d;
        }
        for (let i = maxIndex; i >= 0; i--) {
            const t2 = cellMetaData.getTime(track.cells[i]);
            const d = Math.abs(t1 - t2);
            if (frameDistances[i] < d) break;
            frameDistances[i] = d;
        }
    }
    keyframeOrderLookup.value.set(track.trackId, keyframeOrder);
    return keyframeOrder;
}

const viewportBuffer = computed<number>(() => {
    // somewhat arbitrary buffer for viewport rendering filtering
    // for performance. Probably makes sense for this to depend
    // on the snippet destination size that way the number of
    // snippets "preloaded" around edges is constant.
    return looneageViewStore.snippetDestSize;
});

function horizonInViewport(node: LayoutNode<Track>): boolean {
    const chartBBox: BBox = [
        getLeftPosition(node),
        node.x,
        getRightPosition(node),
        node.x - looneageViewStore.rowHeight,
    ];
    return overlaps(
        chartBBox,
        viewportBBox(),
        getBetweenSnippetPaddingX(),
        getBetweenSnippetPaddingY()
    );
}

const positiveColors = computed<number[]>(() => {
    return hexListToRgba(looneageViewStore.positiveColorScheme.value[6]);
});

const negativeColors = computed<number[]>(() => {
    return hexListToRgba(looneageViewStore.negativeColorScheme.value[6]);
});

function createHorizonChartLayer(
    node: LayoutNode<Track>
): HorizonChartLayer | null {
    if (!cellMetaData.selectedLineage) return null;
    const track = node.data;
    let left = getLeftPosition(node);
    let width = getTimeDuration(track);
    if (width === 0) {
        width = cellMetaData.timestep;
        left -= width / 2;
    }

    if (!horizonInViewport(node)) return null;

    // bottom, left, width, height
    const destination: [number, number, number, number] = [
        node.x,
        left,
        width,
        looneageViewStore.rowHeight,
    ];

    // const minTime = cellMetaData.getFrame(cellMetaData.selectedTrack.cells[0]);
    // const lastIndex = cellMetaData.selectedTrack.cells.length - 1;
    // const maxTime = cellMetaData.getFrame(
    //     cellMetaData.selectedTrack.cells[lastIndex]
    // );

    let dataXExtent = getTimeExtent(track);
    if (dataXExtent[0] === dataXExtent[1]) {
        // special case when there is a single cell in tracks
        dataXExtent = [dataXExtent[0] - width / 2, dataXExtent[0] + width / 2];
    }

    const geometryData = constructGeometry(track);
    const horizonChartLayer = new HorizonChartLayer({
        id: `custom-horizon-chart-layer-${track.trackId}`,
        data: testModOffests,

        instanceData: geometryData,
        destination,
        dataXExtent,

        baseline: looneageViewStore.baseline,
        binSize: looneageViewStore.modHeight,

        getModOffset: (d: any) => d,
        positiveColors: positiveColors.value,
        negativeColors: negativeColors.value,
        updateTriggers: {
            instanceData: geometryData,
        },
    });

    return horizonChartLayer; //, scatterplotLayer, textLayer];
}

// const segmentationData = ref<Feature[]>();

watch(selectedLineage, () => {
    looneageViewStore.setDefaultAttrKey();
    resetView(); // resetView  calls renderDeckGL
});

function scaleForConstantVisualSize(
    size: number,
    direction: 'x' | 'y'
): number {
    const { zoom } = viewStateMirror.value;
    const z = direction === 'x' ? zoom[0] : zoom[1];
    // scale the size based on the inverse of the zoom so the visual is consistent
    return size * 2 ** -z;
}

function viewportBBox(): BBox {
    const { target } = viewStateMirror.value;
    // const buffer = -300; // add buffer so data is fetched a bit before it is panned into view.
    const width = scaleForConstantVisualSize(
        deckGlWidth.value + viewportBuffer.value,
        'x'
    );
    const height = scaleForConstantVisualSize(
        deckGlHeight.value + viewportBuffer.value,
        'y'
    );
    const halfWidth = width / 2;
    const halfHeight = height / 2;

    const left = target[0] - halfWidth;
    const top = target[1] + halfHeight;
    const right = target[0] + halfWidth;
    const bottom = target[1] - halfHeight;
    // const topLeft = [target[0] - halfWidth, target[1] + halfHeight];
    // const topRight = [target[0] + halfWidth, target[1] + halfHeight];
    // const bottomRight = [target[0] + halfWidth, target[1] - halfHeight];
    // const bottomLeft = [target[0] - halfWidth, target[1] - halfHeight];

    return [left, top, right, bottom];
}

// function createViewportRectangleLayer(): PolygonLayer {
//     // console.log('view state');
//     // console.log(deckgl.viewState);
//     const viewState = deckgl.viewState?.looneageController ?? initialViewState;
//     // console.log('element', deckGlWidth.value, deckGlHeight.value);
//     // console.log('controller', viewState.width, viewState.height);
//     // const viewport =
//     const { zoom, target } = viewState;
//     // draw rectangle that covers the view port given the zoom, target, width, and height

//     const width = (deckGlWidth.value - 300) * 2 ** -zoom;
//     const height = (deckGlHeight.value - 300) * 2 ** -zoom;
//     const halfWidth = width / 2;
//     const halfHeight = height / 2;
//     const topLeft = [target[0] - halfWidth, target[1] + halfHeight];
//     const topRight = [target[0] + halfWidth, target[1] + halfHeight];
//     const bottomRight = [target[0] + halfWidth, target[1] - halfHeight];
//     const bottomLeft = [target[0] - halfWidth, target[1] - halfHeight];

//     return new PolygonLayer({
//         id: 'viewport-rectangle-layer',
//         data: [[topLeft, topRight, bottomRight, bottomLeft, topLeft]],
//         pickable: false,
//         stroked: true,
//         filled: true,
//         wireframe: false,
//         lineWidthMinPixels: 1,
//         getPolygon: (d) => d,
//         getFillColor: [0, 140, 0, 120],
//     });
// }

function createCurrentTimeLayer(): PathLayer | null {
    if (hoveredTime.value === null) return null;
    // we place the start time at x=0, so we need to subtract the start time
    const x = hoveredTime.value - lineageMinTime.value;
    const a = [x, 1000];
    const b = [x, -1000];
    return new PathLayer({
        id: 'current-time-layer',
        data: [[a, b]],
        getPath: (d: any) => d,
        getColor: [85, 77, 135],
        getWidth: 1,
        widthUnits: 'pixels',
    });
}

const currentSnippetCellInfo = ref<SnippetCellInfo[]>();
const cellSegmentationData = ref<Feature[]>();
watch(cellSegmentationData, () => {
    renderDeckGL();
});

interface BoundaryLayerResult {
    mainLayers:
        | (SnippetSegmentationLayer | SnippetSegmentationOutlineLayer)[]
        | null;
    hoveredLayers:
        | (SnippetSegmentationLayer | SnippetSegmentationOutlineLayer)[]
        | null;
}

function createCellBoundaryLayer(
    snippetCellInfo: SnippetCellInfo[]
): BoundaryLayerResult | null {
    // maybe need abort logic, deff need to avoid infinite loop here...
    // segmentationStore
    //     .getCellSegmentations(snippetCellInfo.map((info) => info.cell))
    //     .then((data) => {
    //         cellSegmentationData.value = data;
    //     });
    if (cellSegmentationData.value == null) return null;

    const data = snippetCellInfo
        .map((info) => {
            const cell = info.cell;
            const trackId = cell.trackId;
            const frame = cellMetaData.getFrame(cell);
            const [x, y] = info.destinationBottomLeft;
            const feature = cellSegmentationData.value?.find(
                (feature) =>
                    // TODO === should work, but JZ data still has id stored as number, when it should be a string
                    feature?.properties?.id == trackId &&
                    feature?.properties?.frame == frame
            );
            const [cellX, cellY] = cellMetaData.getPosition(cell);
            return {
                // @ts-ignore coordinates does exist on geometry
                polygon: feature?.geometry?.coordinates,
                hovered: info.hovered,
                center: [cellX, cellY],
                offset: [
                    x +
                        (looneageViewStore.snippetDestSize / 2) *
                            2 ** -viewStateMirror.value.zoom[0],
                    y - looneageViewStore.snippetDestSize / 2,
                ],
            };
        })
        .filter((d) => d.polygon !== undefined);

    const mainLayers = [];
    mainLayers.push(
        new SnippetSegmentationLayer({
            id: 'cell-boundary-layer',
            data: data.filter((d) => !d.hovered),
            getPolygon: (d: any) => d.polygon,
            getCenter: (d: any) => d.center,
            getTranslateOffset: (d: any) => d.offset,
            // getFillColor: [0, 55, 190, 100],
            getFillColor: [253, 227, 9, 185],
            // extruded: false,
            // material: false,
            // filled: true,
            // wireframe: false,
            zoomX: viewStateMirror.value.zoom[0],
            scale: looneageViewStore.snippetZoom,
            clipSize: looneageViewStore.snippetDestSize,
            clip: true,
            filled: !looneageViewStore.showSnippetImage, // only fill if not showing image
        })
    );

    mainLayers.push(
        new SnippetSegmentationOutlineLayer({
            id: 'cell-boundary-outline-layer',
            data: data.filter((d) => !d.hovered),
            getPath: (d: any) => d.polygon[0],
            getColor: [253, 227, 9, 255],
            getWidth: 1,
            widthUnits: 'pixels',
            jointRounded: true,
            getCenter: (d: any) => d.center,
            getTranslateOffset: (d: any) => d.offset,
            zoomX: viewStateMirror.value.zoom[0],
            scale: looneageViewStore.snippetZoom,
            clipSize: looneageViewStore.snippetDestSize,
            clip: true,
        })
    );

    const hoveredLayers = [];
    hoveredLayers.push(
        new SnippetSegmentationLayer({
            id: 'hovered-cell-boundary-layer',
            data: data.filter((d) => d.hovered),
            getPolygon: (d: any) => d.polygon,
            getCenter: (d: any) => d.center,
            getTranslateOffset: (d: any) => d.offset,
            getFillColor: [253, 227, 9, 185],
            zoomX: viewStateMirror.value.zoom[0],
            scale: looneageViewStore.snippetZoom,
            clipSize: looneageViewStore.snippetDestSize,
            clip: hoveredSnippet.value?.extraFrames ? true : false, // only clip if single hover frame is shown
            filled: !looneageViewStore.showSnippetImage, // only fill if not showing image
        })
    );

    hoveredLayers.push(
        new SnippetSegmentationOutlineLayer({
            id: 'hovered-cell-boundary-outline-layer',
            data: data.filter((d) => d.hovered),
            getPath: (d: any) => d.polygon[0],
            getColor: [253, 227, 9, 255],
            getWidth: 2,
            widthUnits: 'pixels',
            jointRounded: true,
            getCenter: (d: any) => d.center,
            getTranslateOffset: (d: any) => d.offset,
            zoomX: viewStateMirror.value.zoom[0],
            scale: looneageViewStore.snippetZoom,
            clipSize: looneageViewStore.snippetDestSize,
            clip: hoveredSnippet.value?.extraFrames ? true : false, // only clip if single hover frame is shown
        })
    );

    return { mainLayers, hoveredLayers };
}

function renderDeckGL(): void {
    if (deckgl == null) return;
    if (cellMetaData.selectedLineage == null) return;
    if (looneageViewStore.modHeight === 0) {
        looneageViewStore.setReasonableModHeight();
    }
    // if (segmentationData.value == null) return;
    const layers = [];

    // layers.push(createCurrentTimeLayer());
    layers.push(createConnectingLinesLayer());
    layers.push(createTickMarksLayer());
    layers.push(createHorizonChartLayers());
    if (
        looneageViewStore.showSnippetImage ||
        looneageViewStore.showSnippetOutline
    ) {
        const keyFrameSnippetsResult = createKeyFrameSnippets();
        if (keyFrameSnippetsResult) {
            const {
                snippetCellInfo,
                imageLayer: keyFrameSnippetLayer,
                snippetTickLayer,
                hoverLayer: snippetHoverLayer,
                pickingLayer,
            } = keyFrameSnippetsResult;
            layers.push(snippetTickLayer);
            if (looneageViewStore.showSnippetImage) {
                layers.push(keyFrameSnippetLayer);
            }
            if (!isEqual(currentSnippetCellInfo.value, snippetCellInfo)) {
                currentSnippetCellInfo.value = snippetCellInfo;
                segmentationStore
                    .getCellSegmentations(
                        snippetCellInfo.map((info) => info.cell)
                    )
                    .then((data) => {
                        cellSegmentationData.value = data;
                    });
            }
            const boundaryLayerResult =
                createCellBoundaryLayer(snippetCellInfo);
            if (boundaryLayerResult) {
                if (looneageViewStore.showSnippetOutline) {
                    layers.push(boundaryLayerResult.mainLayers);
                }
                if (looneageViewStore.showSnippetImage) {
                    layers.push(snippetHoverLayer);
                }
                if (looneageViewStore.showSnippetOutline) {
                    layers.push(boundaryLayerResult.hoveredLayers);
                }
            } else if (looneageViewStore.showSnippetImage) {
                layers.push(snippetHoverLayer);
            }
            layers.push(pickingLayer);
        }
    }

    // layers.push(createViewportRectangleLayer());
    deckgl.setProps({
        layers,
        controller: true,
    });
    // console.log('done: render test deckgl');
}
watch(darkMode, renderDeckGL);
watch(dataPointSelection.$state, renderDeckGL);
watch(imageViewerStore.$state, renderDeckGL);
watch(looneageViewStore.$state, renderDeckGL);
watch(contrastLimitSlider, renderDeckGL);
</script>

<template>
    <canvas id="looneage-deckgl-canvas" ref="deckGlContainer"></canvas>
</template>

<style scoped lang="scss"></style>
