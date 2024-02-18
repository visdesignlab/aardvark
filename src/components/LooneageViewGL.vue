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
import { useLooneageViewStore } from '@/stores/looneageViewStore';

import { Pool } from 'geotiff';
import type { Feature } from 'geojson';
import { flextree, type LayoutNode } from 'd3-flextree';
import { hierarchy } from 'd3-hierarchy';
import {
    expandHeight,
    getMaxHeight,
    type BBox,
    getWidth,
    getHeight,
    getBBoxAroundPoint,
    overlaps,
} from '@/util/imageSnippets';

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
    PolygonLayer,
    ScatterplotLayer,
    SolidPolygonLayer,
    TextLayer,
} from '@deck.gl/layers/typed';

import HorizonChartLayer from './layers/HorizonChartLayer/HorizonChartLayer';

const cellMetaData = useCellMetaData();

const dataPointSelection = useDataPointSelection();
const imageViewerStore = useImageViewerStore();
const imageViewerStoreUntrracked = useImageViewerStoreUntrracked();
const datasetSelectionStore = useDatasetSelectionStore();
const { currentLocationMetadata } = storeToRefs(datasetSelectionStore);
const { contrastLimitSlider } = storeToRefs(imageViewerStoreUntrracked);
const { frameNumber } = storeToRefs(imageViewerStore);
const { selectedTrack } = storeToRefs(cellMetaData);
const eventBusStore = useEventBusStore();
const segmentationStore = useSegmentationStore();
const looneageViewStore = useLooneageViewStore();

const deckGlContainer = ref(null);
const { width: deckGlWidth, height: deckGlHeight } =
    useElementSize(deckGlContainer);

const tree = computed(() => {
    if (cellMetaData.selectedLineage == null) return null;
    return hierarchy<Track>(
        cellMetaData.selectedLineage.founder,
        (d: Track) => {
            if (d.attrNum['generation'] < looneageViewStore.maxDepth) {
                return d.children;
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

const layoutRoot = computed<LayoutNode<Track> | null>(() => {
    if (cellMetaData.selectedLineage == null) return null;
    return flextree<Track>({
        nodeSize: (node: LayoutNode<Track>) => {
            const timeWidth = getTimeDurationForLayout(node.data);
            return [looneageViewStore.rowHeight, timeWidth];
        },
        spacing: looneageViewStore.spacing,
    })(tree.value);
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

//////////////////////////
// end temp test code   //
//////////////////////////
let deckgl: any | null = null;
const initialViewState = {
    zoom: 0,
    target: [0, 0],
    minZoom: -8,
    maxZoom: 8,
};
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
        onViewStateChange: () => {
            // TODO: maybe refine this
            renderDeckGL();
        },
        // onInteractionStateChange: () => console.log('onInteractionStateChange'),
        // onLoad: () => console.log('onLoad'),
    });
    // renderDeckGL();
});

const testGeometry = computed<number[]>(() => {
    if (!cellMetaData.selectedTrack) return [];
    // const areaGen = area<Cell>()
    //     .x((d: Cell) => cellMetaData.getTime(d))
    //     .y1((d: Cell) => 10 * cellMetaData.getMass(d))
    //     .y0(0);

    const geometry: number[] = [];
    const key = looneageViewStore.attrKey;
    let x = 0;
    let y = 0;
    // min/max just for debugging
    let minY = Infinity;
    let maxY = -Infinity;

    let minX = Infinity;
    let maxX = -Infinity;

    const testBottom = -404.123456789;
    // this is a hack to make the shaders work correctly.
    // this value is used in the shaders to determine the non value side
    // of the geometry. If a data has this exact value there will be a
    // small visual bug. This value is arbitrary, but is less likely to
    // be found in data than 0.

    const firstX = cellMetaData.getTime(cellMetaData.selectedTrack.cells[0]);
    geometry.push(firstX, testBottom);
    for (const cell of cellMetaData.selectedTrack.cells) {
        y = cell.attrNum[key];
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);

        x = cellMetaData.getTime(cell); // TODO: maybe time is better
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);

        geometry.push(x, y);
        geometry.push(x, testBottom);
    }
    // console.log('YYY MIN MAX', minY, maxY);
    // console.log('XXX MIN MAX', minX, maxX);

    geometry.push(x, testBottom);
    return geometry;
});

function constructGeometry(track: Track): number[] {
    const geometry: number[] = [];
    const key = looneageViewStore.attrKey;

    const testBottom = -404.123456789;
    // this is a hack to make the shaders work correctly.
    // this value is used in the shaders to determine the non value side
    // of the geometry. If a data has this exact value there will be a
    // small visual bug. This value is arbitrary, but is less likely to
    // be found in data than 0.

    // TODO: return something reasonable if track.cells.length === 1

    const firstX = cellMetaData.getTime(track.cells[0]);
    geometry.push(firstX, testBottom);
    let x = 0;
    for (const cell of track.cells) {
        const y = cell.attrNum[key];

        x = cellMetaData.getTime(cell);

        geometry.push(x, y);
        geometry.push(x, testBottom);
    }

    geometry.push(x, testBottom);
    return geometry;
}

const testModOffests = computed(() => {
    // TODO: maybe need to calculate?

    return [-8, -7, -6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5];
});

// const destination = computed<[number, number, number, number]>(() => [
//     0,
//     0,
//     300,
//     looneageViewStore.rowHeight,
// ]);

const dataXExtent = computed<[number, number]>(() => {
    if (!cellMetaData.selectedTrack) return [0, 0];
    const minTime = cellMetaData.getFrame(cellMetaData.selectedTrack.cells[0]);
    const lastIndex = cellMetaData.selectedTrack.cells.length - 1;
    const maxTime = cellMetaData.getFrame(
        cellMetaData.selectedTrack.cells[lastIndex]
    );
    return [minTime, maxTime];
});

const imageOffset = ref(0);

function createHorizonChartLayers(): (
    | ScatterplotLayer
    | HorizonChartLayer
    | null
)[] {
    if (!cellMetaData.selectedTrack) return [];
    // if (!segmentationData.value) return [];
    if (!layoutRoot.value?.descendants()) return [];
    const layers: (ScatterplotLayer | HorizonChartLayer | null)[] = [];
    const testData = [];
    for (let node of layoutRoot.value.descendants()) {
        // if (node.depth > looneageViewStore.maxDepth) continue;
        layers.push(createHorizonChartLayer(node));
    }
    // layers.push(
    //     new ScatterplotLayer({
    //         id: 'looneage-test-scatterplot-layer',
    //         data: [
    //             [60, -83],
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
    //         getRadius: 10,
    //         getFillColor: [255, 0, 255, 200],
    //     })
    // );

    return layers;
}

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

function createKeyFrameSnippets(): CellSnippetsLayer | null {
    if (!layoutRoot.value) return null;
    const occupied: BBox[] = [];

    // add all horizon charts as occupied rectangles
    for (let node of layoutRoot.value.descendants()) {
        const track = node.data;
        const destWidth = getTimeDuration(track);
        const left = node.y + getTimeOffsetBetweenParentChild(track);
        const chartBBox: BBox = [
            left,
            node.x,
            left + destWidth,
            node.x - looneageViewStore.rowHeight,
        ];
        occupied.push(chartBBox);
    }

    const selections = [];
    for (let node of layoutRoot.value.descendants()) {
        const previousSnippets: BBox[] = [];
        const frameScores: number[] = [];
        const selectedIndices: number[] = [];
        const addToOccupied: BBox[] = [];

        // eslint-disable-next-line no-constant-condition
        while (true) {
            const nextSnippet = getNextSnippet(
                node,
                looneageViewStore.snippetDestSize,
                looneageViewStore.snippetDestSize,
                previousSnippets,
                occupied,
                frameScores,
                selectedIndices
            );
            if (nextSnippet === null) break;
            const { destination, index, shouldRender } = nextSnippet;
            if (!shouldRender) continue; // don't bother fetching data to render, it is offscreen
            const cell = node.data.cells[index];
            const t = cellMetaData.getFrame(cell) - 1; // convert frame number to index
            const [x, y] = cellMetaData.getPosition(cell);
            addToOccupied.push(destination);
            const source = getBBoxAroundPoint(
                x,
                y,
                looneageViewStore.snippetSourceSize,
                looneageViewStore.snippetSourceSize
            );

            selections.push({
                c: 0,
                z: 0,
                t,
                snippets: [{ source, destination }],
            });
        }

        occupied.push(...addToOccupied);
    }

    return new CellSnippetsLayer({
        loader: pixelSource.value,
        id: `key-frames-snippets-layer`,
        contrastLimits: contrastLimit.value,
        selections,
        channelsVisible: [true],
        extensions: [colormapExtension],
        colormap: imageViewerStore.colormap,
        onClick: () => {
            console.log('clicked');
        },
    });
}

function getKeyFrameIndices(node: LayoutNode<Track>, count: number): number[] {
    const track = node.data;
    count = Math.min(count, track.cells.length);
    const frameScores: number[] = [];
    const indices: number[] = [];

    for (let i = 0; i < count; i++) {
        getNextSnippet(node, 32, 32, [], [], frameScores, indices);
    }

    return indices;
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

function getNextSnippet(
    node: LayoutNode<Track>,
    width: number,
    height: number,
    currentTrackSnippets: BBox[],
    occupied: BBox[],
    frameScores: number[],
    selectedIndices: number[]
): { destination: BBox; index: number; shouldRender: boolean } | null {
    const track = node.data;
    if (frameScores.length === 0) {
        // populate with zeros without changing reference
        frameScores.length = track.cells.length;
        frameScores.fill(0);

        // initialize scores based on the change in the attribute value
        // the first and last frames should always be
        // selected as key frames, so they get a score of zero.
        frameScores[0] = Infinity;
        frameScores[track.cells.length - 1] = Infinity;
        const key = looneageViewStore.attrKey;
        const valExtent = valueExtent(track, looneageViewStore.attrKey);
        for (let i = 1; i < track.cells.length - 1; i++) {
            const prev = track.cells[i - 1];
            const next = track.cells[i + 1];
            const val =
                Math.abs(next.attrNum[key] - prev.attrNum[key]) / valExtent;
            frameScores[i] = val;
        }
    }

    const center = 1;
    const dropOff = 3;
    let maxIndex = -1;

    // select the frame with the smallest score that isn't already in indices
    // and does not overlap with any of the occupied regions
    // const zoom = deckgl.viewState?.looneageController?.zoom ?? 0;
    const destWidth = scaleForConstantVisualSize(width);
    const horizonSnippetPadding = scaleForConstantVisualSize(3);
    const destHeight = scaleForConstantVisualSize(height);
    let destY = node.x;
    const displayBelow = node.x > 0;
    if (displayBelow) {
        destY += destHeight;
        destY += horizonSnippetPadding;
    } else {
        destY -= looneageViewStore.rowHeight;
        destY -= horizonSnippetPadding;
    }
    // let destination: BBox = [0, 0, 0, 0];
    let maxScore = -Infinity;
    let maxDestination: BBox = [0, 0, 0, 0];
    for (let i = 0; i < frameScores.length; i++) {
        if (selectedIndices.includes(i)) continue;
        const cell = track.cells[i];
        const t = cellMetaData.getTime(cell);
        const destX =
            node.y +
            t -
            track.attrNum['min_time'] -
            destWidth / 2 +
            getTimeOffsetBetweenParentChild(track);
        const destination: BBox = [
            destX,
            destY,
            destX + destWidth,
            destY - destHeight,
        ];
        if (frameScores[i] > maxScore) {
            maxScore = frameScores[i];
            maxIndex = i;
            maxDestination = destination;
        }
    }
    if (
        currentTrackSnippets.some((bbox: BBox) =>
            overlaps(bbox, maxDestination)
        )
    ) {
        return null;
    }

    if (maxIndex === -1) return null;
    currentTrackSnippets.push(maxDestination);
    selectedIndices.push(maxIndex);
    // setting shouldRender is a performance optimization. We still want to include
    // the selection in occupied/selected indices so that the keyframe selections
    // do not change when different images go in and out of the viewport, or
    // horizon chart positions change
    const shouldRender =
        overlaps(viewportBBox(), maxDestination) &&
        !occupied.some((bbox: BBox) => overlaps(bbox, maxDestination));

    // increase the scores of nearby frames to encourage coverage
    for (let i = 0; i < frameScores.length; i++) {
        const dist = Math.abs(maxIndex - i);
        const coverageCost =
            (-center * (dist - dropOff)) / (center + Math.abs(dist - dropOff)) +
            center;
        frameScores[i] -= coverageCost;
    }

    // const cell = node.data.cells[maxIndex];
    // const t = cellMetaData.getTime(cell);

    // const zoom = deckgl.viewState?.looneageController?.zoom ?? 0;
    // const destWidth = width * 2 ** -zoom;
    // const destHeight = height * 2 ** -zoom;

    // const destX = node.y + t - node.data.attrNum['min_time'] - destWidth / 2;
    // const destY = node.x + -looneageViewStore.rowHeight - 3;
    // const destination: BBox = [
    //     destX,
    //     destY,
    //     destX + destWidth,
    //     destY - destHeight,
    // ];

    return {
        destination: maxDestination,
        index: maxIndex,
        shouldRender,
    };
}

const viewportBuffer = computed<number>(() => {
    // somewhat arbitrary buffer for viewport rendering filtering
    // for performance. Probably makes sense for this to depend
    // on the snippet destination size that way the number of
    // snippets "preloaded" around edges is constant.
    return looneageViewStore.snippetDestSize * 2;
});

function createHorizonChartLayer(
    node: LayoutNode<Track>
): HorizonChartLayer | null {
    if (!cellMetaData.selectedTrack) return null;
    const track = node.data;
    const left = node.y + getTimeOffsetBetweenParentChild(track);
    const width = getTimeDuration(track);

    const chartBBox: BBox = [
        left,
        node.x,
        left + width,
        node.x - looneageViewStore.rowHeight,
    ];
    if (!overlaps(chartBBox, viewportBBox())) return null;

    const destination: [number, number, number, number] = [
        node.x,
        left,
        width,
        looneageViewStore.rowHeight,
    ];

    // TODO: make these once
    const positiveColors = hexListToRgba(
        looneageViewStore.positiveColorScheme.value[6]
    );
    const negativeColors = hexListToRgba(
        looneageViewStore.negativeColorScheme.value[6]
    );

    const minTime = cellMetaData.getFrame(cellMetaData.selectedTrack.cells[0]);
    const lastIndex = cellMetaData.selectedTrack.cells.length - 1;
    const maxTime = cellMetaData.getFrame(
        cellMetaData.selectedTrack.cells[lastIndex]
    );

    // const placeholderThreshold = frameNumber.value;
    // const placeholderSize = getWidth(segmentationData.value[0].bbox as BBox);

    imageOffset.value =
        ((frameNumber.value - minTime) / (maxTime - minTime)) * 300;
    const horizonChartLayer = new HorizonChartLayer({
        id: `custom-horizon-chart-layer-${track.trackId}`,
        data: testModOffests.value,

        instanceData: constructGeometry(track),
        destination,
        dataXExtent: getTimeExtent(track),

        baseline: looneageViewStore.baseline,
        binSize: looneageViewStore.modHeight,
        // placeholderThreshold: 0,
        // placeholderSize: 0,
        getModOffset: (d: any) => d,
        positiveColors,
        negativeColors,
        updateTriggers: {
            instanceData: testGeometry.value,
        },
    });

    // const deltaData = [];
    // const valExtent = valueExtent(track, looneageViewStore.attrKey);
    // for (let i = 0; i < track.cells.length; i++) {
    //     const prevIndex = Math.max(i - 1, 0);
    //     const prev = track.cells[prevIndex];
    //     const cell = track.cells[i];
    //     const nextIndex = Math.min(i + 1, track.cells.length - 1);
    //     const next = track.cells[nextIndex];

    //     const position = [
    //         node.y + cellMetaData.getTime(cell) - track.attrNum['min_time'],
    //         node.x + 6,
    //     ];
    //     const key = looneageViewStore.attrKey;
    //     const val = Math.abs(next.attrNum[key] - prev.attrNum[key]) / valExtent;
    //     // ((next.attrNum[key] + prev.attrNum[key]) / 2);
    //     const color = [val * 1000, val * 1000, val * 200];
    //     deltaData.push({ position, color });
    // }
    // // const scatterplotLayer = new ScatterplotLayer({
    //     id: `delta-scatterplot-layer-${track.trackId}`,
    //     data: deltaData,
    //     pickable: true,
    //     opacity: 0.8,
    //     stroked: true,
    //     filled: true,
    //     radiusScale: 1,
    //     radiusMinPixels: 1,
    //     radiusMaxPixels: 100,
    //     lineWidthMinPixels: 0,
    //     getLineWidth: 0,
    //     getPosition: (d: any) => d.position,
    //     getRadius: 0.5,
    //     getFillColor: (d) => d.color,
    //     getLineColor: (d) => [0, 0, 0],
    // });

    // const keyIndices = getKeyFrameIndices(node, 17);
    // const textLayer = new TextLayer({
    //     id: `key-frames-text-layer-${track.trackId}`,
    //     data: keyIndices.map((value, index) => {
    //         const cell = track.cells[value];
    //         return {
    //             position: [
    //                 node.y +
    //                     cellMetaData.getTime(cell) -
    //                     track.attrNum['min_time'],
    //                 node.x + 3,
    //             ],
    //             text: index + 1,
    //         };
    //     }),
    //     getPosition: (d: any) => d.position,
    //     getText: (d: any) => d.text.toString(),
    //     getColor: [0, 0, 0],
    //     getSize: (d: any) => {
    //         if (d.text < 4) return 16;
    //         if (d.text < 8) return 12;
    //         // if (d.text < 12) return 8;

    //         return 8;
    //     },
    // });

    return horizonChartLayer; //, scatterplotLayer, textLayer];
}

// const segmentationData = ref<Feature[]>();

watch(selectedTrack, () => {
    renderDeckGL();
});

// watch(frameNumber, () => {
//     renderDeckGL();
// });

// function updateSnippet() {
//     if (cellMetaData.selectedTrack == null) return;

//     const dataRequests = [];

//     // TODO: this is not right
//     const frame = imageViewerStore.frameNumber;
//     const cell = cellMetaData.selectedTrack.cells.find(
//         (c) => cellMetaData.getFrame(c) === frame
//     );
//     if (!cell) return;

//     // const samples = [0, 0.25, 0.5, 0.75, 1];
//     // for (let sample of samples) {
//     //     const index = Math.round(
//     //         sample * (cellMetaData.selectedTrack.cells.length - 1)
//     //     );
//     dataRequests.push(segmentationStore.getCellSegmentation(cell));
//     // }

//     Promise.all(dataRequests).then((data) => {
//         segmentationData.value = data.filter((d) => d != null) as Feature[];
//         renderDeckGL();
//     });
// }

// function createTrackLayer(): CellSnippetsLayer | null {
//     if (!segmentationData.value) return null;
//     const selections = [];
//     let xOffset = imageOffset.value;
//     const yOffset = 0;
//     // console.log('xOffset', xOffset);
//     const padding = 6;
//     const maxHeight = getMaxHeight(segmentationData.value);
//     // console.log({ maxHeight });
//     for (let feature of segmentationData.value) {
//         if (!feature) continue;
//         if (!feature?.properties?.frame) continue;
//         if (!feature?.bbox) continue;
//         const t = feature.properties.frame - 1; // convert frame number to index
//         const source = expandHeight(feature.bbox as BBox, maxHeight);
//         const width = getWidth(source);
//         const height = getHeight(source);
//         const destination = [
//             xOffset,
//             yOffset,
//             xOffset + width,
//             yOffset - height,
//         ];
//         xOffset += width + padding;
//         selections.push({
//             c: 0,
//             z: 0,
//             t,
//             snippets: [{ source, destination }],
//         });
//     }

//     return new CellSnippetsLayer({
//         loader: pixelSource.value,
//         id: 'looneage-view-gl-test-snippet-layer',
//         contrastLimits: contrastLimit.value,
//         selections,
//         channelsVisible: [true],
//         extensions: [colormapExtension],
//         colormap: imageViewerStore.colormap,
//         onClick: () => {
//             console.log('clicked');
//         },
//     });
// }

function scaleForConstantVisualSize(size: number): number {
    const viewState = deckgl.viewState?.looneageController ?? initialViewState;
    const { zoom } = viewState;
    // scale the size based on the inverse of the zoom so the visual is consistent
    return size * 2 ** -zoom;
}

function viewportBBox(): BBox {
    const viewState = deckgl.viewState?.looneageController ?? initialViewState;
    const { zoom, target } = viewState;
    // const buffer = -300; // add buffer so data is fetched a bit before it is panned into view.
    const width = scaleForConstantVisualSize(
        deckGlWidth.value + viewportBuffer.value
    );
    const height = scaleForConstantVisualSize(
        deckGlHeight.value + viewportBuffer.value
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

function renderDeckGL(): void {
    if (deckgl == null) return;
    if (cellMetaData.selectedTrack == null) return;
    // if (segmentationData.value == null) return;
    const layers = [];

    layers.push(createHorizonChartLayers());
    if (looneageViewStore.showSnippets) {
        layers.push(createKeyFrameSnippets());
    }
    // layers.push(createTrackLayer());
    // layers.push(createTestScatterLayer());
    // layers.push(createViewportRectangleLayer());
    deckgl.setProps({
        layers,
        controller: true,
    });
    // console.log('done: render test deckgl');
}
watch(dataPointSelection.$state, renderDeckGL);
watch(imageViewerStore.$state, renderDeckGL);
watch(looneageViewStore.$state, renderDeckGL);
watch(contrastLimitSlider, renderDeckGL);
</script>

<template>
    <canvas id="looneage-deckgl-canvas" ref="deckGlContainer"></canvas>
</template>

<style scoped lang="scss"></style>
