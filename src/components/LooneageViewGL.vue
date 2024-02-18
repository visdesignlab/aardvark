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
    PathLayer,
    PolygonLayer,
    ScatterplotLayer,
    SolidPolygonLayer,
    TextLayer,
} from '@deck.gl/layers/typed';

import HorizonChartLayer from './layers/HorizonChartLayer/HorizonChartLayer';
import { faDownLeftAndUpRightToCenter } from '@fortawesome/free-solid-svg-icons';

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

        x = cellMetaData.getTime(cell);
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);

        geometry.push(x, y);
        geometry.push(x, testBottom);
    }

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

function createConnectingLinesLayer(): PathLayer | null {
    if (!layoutRoot.value?.descendants()) return null;
    const lines = [];
    for (const node of layoutRoot.value.descendants()) {
        if (!node.parent) continue;
        const childCenter = getMiddleVert(node);
        const parentRight = getRightPosition(node.parent);
        const a = [getLeftPosition(node), childCenter];
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
        jointRounded: true,
    });
}

function createTickMarksLayer(): PathLayer | null {
    if (!layoutRoot.value?.descendants()) return null;
    const padding = getHorizonSnippetPadding() / 2;
    const lines = [];
    let lastX = null;
    for (const node of layoutRoot.value.descendants()) {
        if (!horizonInViewport(node)) continue;
        for (const cell of node.data.cells) {
            const x =
                getLeftPosition(node) +
                cellMetaData.getTime(cell) -
                node.data.attrNum['min_time'];
            if (lastX !== null) {
                if (Math.abs(x - lastX) < 2 * padding) return null;
                // If the points are too close together,
                // skip rendering, it is worse visually and
                // is a performance hit.
            }
            lastX = x;
            const bottom = node.x + padding;
            const top = node.x - padding - looneageViewStore.rowHeight;
            const a = [x, bottom];
            const b = [x, top];
            lines.push([a, b]);
        }
    }
    return new PathLayer({
        id: 'horizon-tick-marks-layer',
        data: lines,
        getPath: (d: any) => d,
        getColor: [180, 180, 180],
        getWidth: padding,
    });
}

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

function getLeftPosition(node: LayoutNode<Track>): number {
    return node.y + getTimeOffsetBetweenParentChild(node.data);
}

function getRightPosition(node: LayoutNode<Track>): number {
    return getLeftPosition(node) + getTimeDuration(node.data);
}

function getMiddleVert(node: LayoutNode<Track>): number {
    return node.x - looneageViewStore.rowHeight / 2;
}

function createKeyFrameSnippets(): CellSnippetsLayer | null {
    if (!layoutRoot.value) return null;
    const occupied: BBox[] = [];

    // add all horizon charts as occupied rectangles
    for (let node of layoutRoot.value.descendants()) {
        if (!horizonInViewport(node)) continue; // for performance
        const left = getLeftPosition(node);
        const right = getRightPosition(node);
        const chartBBox: BBox = [
            left,
            node.x,
            right,
            node.x - looneageViewStore.rowHeight,
        ];
        occupied.push(chartBBox);
    }

    const selections = [];
    const ticks: [number, number][][] = [];
    const tickPadding = getHorizonSnippetPadding();
    for (let node of layoutRoot.value.descendants()) {
        if (!horizonInViewport(node)) continue; // for performance
        const previousSnippets: BBox[] = [];
        const frameScores: number[] = [];
        const frameDistances: number[] = [];
        let newSnippetsOuterBBox: BBox | null = null;

        // eslint-disable-next-line no-constant-condition
        while (true) {
            const nextSnippet = getNextSnippet(
                node,
                looneageViewStore.snippetDestSize,
                looneageViewStore.snippetDestSize,
                previousSnippets,
                occupied,
                frameScores,
                frameDistances
            );
            if (nextSnippet === null) break;
            const { destination, index, shouldRender, displayBelow } =
                nextSnippet;
            if (!shouldRender) continue; // don't bother fetching data to render, it is offscreen
            const cell = node.data.cells[index];
            const t = cellMetaData.getFrame(cell) - 1; // convert frame number to index
            const [x, y] = cellMetaData.getPosition(cell);
            if (newSnippetsOuterBBox === null) {
                newSnippetsOuterBBox = [...destination];
            } else {
                newSnippetsOuterBBox[0] = Math.min(
                    newSnippetsOuterBBox[0],
                    destination[0]
                );
                newSnippetsOuterBBox[1] = Math.max(
                    newSnippetsOuterBBox[1],
                    destination[1]
                );
                newSnippetsOuterBBox[2] = Math.max(
                    newSnippetsOuterBBox[2],
                    destination[2]
                );
                newSnippetsOuterBBox[3] = Math.min(
                    newSnippetsOuterBBox[3],
                    destination[3]
                );
            }

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

            const tickX =
                getLeftPosition(node) +
                cellMetaData.getTime(cell) -
                node.data.attrNum['min_time'];
            let tickSnippetY = node.x;
            let tickHorizonY = node.x;
            if (displayBelow) {
                tickSnippetY += tickPadding;
            } else {
                tickSnippetY -= looneageViewStore.rowHeight + tickPadding;
                tickHorizonY -= looneageViewStore.rowHeight;
            }
            ticks.push([
                [tickX, tickSnippetY],
                [tickX, tickHorizonY],
            ]);
        }
        if (newSnippetsOuterBBox) {
            occupied.push(newSnippetsOuterBBox);
        }
    }

    const snippetLayer = new CellSnippetsLayer({
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

    const snippetTickMarksLayer = new PathLayer({
        id: 'snippet-tick-marks-layer',
        data: ticks,
        getPath: (d: any) => d,
        getColor: [100, 100, 100],
        getWidth: tickPadding / 2,
        capRounded: false,
    });
    return [snippetLayer, snippetTickMarksLayer];
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
    return scaleForConstantVisualSize(6);
}

function getNextSnippet(
    node: LayoutNode<Track>,
    width: number,
    height: number,
    currentTrackSnippets: BBox[],
    occupied: BBox[],
    frameScores: number[],
    frameDistances: number[]
): {
    destination: BBox;
    index: number;
    shouldRender: boolean;
    displayBelow: boolean;
} | null {
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
    if (frameDistances.length === 0) {
        frameDistances.length = track.cells.length;
        frameDistances.fill(Infinity);
    }

    const center = 1;
    const dropOff = 3;
    let maxIndex = -1;

    // select the frame with the smallest score that isn't already in indices
    // and does not overlap with any of the occupied regions
    // const zoom = deckgl.viewState?.looneageController?.zoom ?? 0;
    const destWidth = scaleForConstantVisualSize(width);
    const horizonSnippetPadding = getHorizonSnippetPadding();
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
        if (frameDistances[i] === 0) continue;
        const cell = track.cells[i];
        const t = cellMetaData.getTime(cell);
        const destX =
            getLeftPosition(node) +
            t -
            track.attrNum['min_time'] -
            destWidth / 2;
        const destination: BBox = [
            destX,
            destY,
            destX + destWidth,
            destY - destHeight,
        ];
        let coverageCost =
            (-center * (frameDistances[i] - dropOff)) /
                (center + Math.abs(frameDistances[i] - dropOff)) +
            center;
        if (frameDistances[i] === Infinity) {
            coverageCost = 0;
        }
        // console.log(frameScores[i], coverageCost, frameDistances[i]);
        const score = frameScores[i] - coverageCost;
        if (score > maxScore) {
            maxScore = score;
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
    // selectedIndices.push(maxIndex);
    // setting shouldRender is a performance optimization. We still want to include
    // the selection in occupied/selected indices so that the keyframe selections
    // do not change when different images go in and out of the viewport, or
    // horizon chart positions change
    const shouldRender =
        overlaps(viewportBBox(), maxDestination) &&
        !occupied.some((bbox: BBox) => overlaps(bbox, maxDestination));

    // update the nearest distance values

    for (let i = maxIndex; i < frameDistances.length; i++) {
        const d = Math.abs(maxIndex - i);
        if (frameDistances[i] < d) break;
        frameDistances[i] = d;
    }
    for (let i = maxIndex; i >= 0; i--) {
        const d = Math.abs(maxIndex - i);
        if (frameDistances[i] < d) break;
        frameDistances[i] = d;
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
        displayBelow,
    };
}

const viewportBuffer = computed<number>(() => {
    // somewhat arbitrary buffer for viewport rendering filtering
    // for performance. Probably makes sense for this to depend
    // on the snippet destination size that way the number of
    // snippets "preloaded" around edges is constant.
    return looneageViewStore.snippetDestSize * 2;
});

function horizonInViewport(node: LayoutNode<Track>): boolean {
    const chartBBox: BBox = [
        getLeftPosition(node),
        node.x,
        getRightPosition(node),
        node.x - looneageViewStore.rowHeight,
    ];
    return overlaps(chartBBox, viewportBBox());
}

function createHorizonChartLayer(
    node: LayoutNode<Track>
): HorizonChartLayer | null {
    if (!cellMetaData.selectedTrack) return null;
    const track = node.data;
    const left = getLeftPosition(node);
    const width = getTimeDuration(track);

    if (!horizonInViewport(node)) return null;

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

        getModOffset: (d: any) => d,
        positiveColors,
        negativeColors,
        updateTriggers: {
            instanceData: testGeometry.value,
        },
    });

    return horizonChartLayer; //, scatterplotLayer, textLayer];
}

// const segmentationData = ref<Feature[]>();

watch(selectedTrack, () => {
    renderDeckGL();
});

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

    layers.push(createConnectingLinesLayer());
    layers.push(createTickMarksLayer());
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
