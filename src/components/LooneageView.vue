<template>
    <NoDataSplash></NoDataSplash>
    <div v-if="cellMetaData.dataInitialized" ref="looneageContainer">
        <q-select
            label="Attribute"
            v-model="attrKey"
            :options="attrOptions"
            :dark="globalSettings.darkMode"
            class="mb-1"
        />
        <!-- <button @click="verticalScale -= 0.1">decrease</button>
        <button @click="verticalScale += 0.1">increase</button> -->
        <svg :width="containerWidth" :height="containerHeight">
            <g :transform="`translate(0,${-extent[1]})`">
                <g
                    v-for="node in layoutRoot.descendants()"
                    :key="node.data.trackId"
                    :transform="`translate(${scaleX(node.y)},${node.x})`"
                    :class="`n-${node.depth}`"
                >
                    <HorizonChart
                        :chartWidth="scaleX(getWidth(node.data))"
                        :chartHeight="rowHeight"
                        :data="node.data.cells"
                        :settings="{
                            baseline: 0,
                            modHeight: reasonableModH,
                            mirrorNegative: false,
                            includeBinLine: true,
                        }"
                        :timeAccessor="cellMetaData.getTime"
                        :valueAccessor="(cell: Cell) => cellMetaData.getNumAttr(cell, attrKey)"
                        :info="node.data.trackId"
                    ></HorizonChart>
                </g>
                <line
                    v-for="({ source, target }, i) in layoutRoot.links()"
                    :key="i"
                    :x1="scaleX(source.y + getWidth(source.data))"
                    :y1="source.x + rowHeight / 2"
                    :x2="scaleX(target.y)"
                    :y2="target.x + rowHeight / 2"
                    :stroke-width="
                        2 + 36 * getSplitWeight(source.data, target.data)
                    "
                ></line>
            </g>
        </svg>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { min as d3Min, max as d3Max, extent as d3Extent } from 'd3-array';
import { scaleLinear } from 'd3-scale';
import { clamp, last, sortBy } from 'lodash-es';
import HorizonChart, {
    type HorizonChartSettings,
} from '@/components/HorizonChart.vue';
import { hierarchy } from 'd3-hierarchy';
import { flextree, type LayoutNode } from 'd3-flextree';

import { useElementSize } from '@vueuse/core';
import { useCellMetaData, type Track, type Cell } from '@/stores/cellMetaData';
import { useGlobalSettings } from '@/stores/globalSettings';
import { useDatasetSelectionStore } from '@/stores/datasetSelectionStore';

const looneageContainer = ref(null);

const cellMetaData = useCellMetaData();
const globalSettings = useGlobalSettings();
const datasetSelectionStore = useDatasetSelectionStore();

const attrKey = ref<string>(cellMetaData.headerKeys.mass); // Default to mass
watch(
    // todo  - this mostly works, but also is triggered on locastion change...
    () => cellMetaData.headerKeys,
    () => (attrKey.value = cellMetaData.headerKeys.mass)
);
const attrOptions = computed<string[]>(() => {
    const numericalHeaders = cellMetaData?.cellAttributeHeaders.filter(
        (header) => header.type === 'number'
    );
    return numericalHeaders.map((header) => header.text);
});
// const attrKey = computed(() => cellMetaData.headerKeys.mass);

interface LooneageViewProps {
    // attrKey: string;
    // containerWidth: number;
    encodeChildSplit?: boolean;
    initialSpacing?: number;
    initialRowHeight?: number;
    horizonChartSettings?: HorizonChartSettings;
}

const props = withDefaults(defineProps<LooneageViewProps>(), {
    // containerWidth: 800,
    encodeChildSplit: false,
    initialSpacing: 2,
    initialRowHeight: 16,
});

const verticalScale = ref(1);

const rowHeight = computed(() => {
    return Math.round(props.initialRowHeight * verticalScale.value);
});

const spacingScale = scaleLinear().domain([1, 8]).range([1, 4]);
const spacing = computed(() => {
    // return props.initialSpacing;
    return Math.round(props.initialSpacing * spacingScale(verticalScale.value));
    // return Math.round(props.initialSpacing * verticalScale.value);
});
const { width: containerWidth } = useElementSize(looneageContainer);
// const containerWidth = computed(() => {
//     const { width } = useElementSize(looneageContainer);
//     // console.log('CONTAINER WIDTH: ', width);
//     return 800;
// });

const tree = computed(() => {
    if (cellMetaData.selectedLineage == null) return null;
    return hierarchy<Track>(cellMetaData.selectedLineage.founder);
});
function getWidth(node: Track): number {
    let [minTime, maxTime] = d3Extent<Cell, number>(
        node.cells,
        cellMetaData.getTime
    );
    minTime = minTime ?? 0;
    maxTime = maxTime ?? 0;
    const timeWidth = maxTime - minTime;
    return timeWidth;
}
const layoutRoot = computed<LayoutNode<Track>>(() => {
    return flextree<Track>({
        nodeSize: (node: LayoutNode<Track>) => {
            const timeWidth = getWidth(node.data);
            return [rowHeight.value, timeWidth];
        },
        spacing: spacing.value,
    })(tree.value);
});

// function getReasonableModH(): number {
//     if (!cellMetaData.dataInitialized) return 100;
//     const minVal = d3Min(
//         layoutRoot.value.descendants(),
//         (node: LayoutNode<Track>) =>
//             d3Min(
//                 node.data.cells,
//                 (point: Cell) => point.attrNum[attrKey.value]
//             )
//     ) as unknown as number;
//     const maxVal = d3Max(
//         layoutRoot.value.descendants(),
//         (node: LayoutNode<Track>) =>
//             d3Max(
//                 node.data.cells,
//                 (point: Cell) => point.attrNum[attrKey.value]
//             )
//     ) as unknown as number;
//     return (maxVal - minVal) / 5;
// }

const reasonableModH = computed(() => {
    if (!cellMetaData.dataInitialized) return 100;
    const minVal = d3Min(
        layoutRoot.value.descendants(),
        (node: LayoutNode<Track>) =>
            d3Min(
                node.data.cells,
                (point: Cell) => point.attrNum[attrKey.value]
            )
    ) as unknown as number;
    const maxVal = d3Max(
        layoutRoot.value.descendants(),
        (node: LayoutNode<Track>) =>
            d3Max(
                node.data.cells,
                (point: Cell) => point.attrNum[attrKey.value]
            )
    ) as unknown as number;
    return (maxVal - minVal) / 5;
});

// const defaultSettings = {
//     modHeight: reasonableModH,
//     includeBinLine: true,
// };

// const mergedHorizonChartSettings = computed(() => {
//     return { ...defaultSettings, ...props.horizonChartSettings };
// });

const scaleX = computed(() => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [minX, _minY, maxX, _maxY] = extent.value;
    return scaleLinear().domain([minX, maxX]).range([0, containerWidth.value]);
});

const extent = computed<[number, number, number, number]>(() => {
    if (!cellMetaData.dataInitialized) return [0, 0, 100, 100];
    const minX = d3Min(
        layoutRoot.value.descendants(),
        (n: LayoutNode<Track>) => n.y
    ) as unknown as number;

    const maxX = d3Max(
        layoutRoot.value.descendants(),
        (n: LayoutNode<Track>) => n.y + getWidth(n.data)
    ) as unknown as number;

    const minY = d3Min(
        layoutRoot.value.descendants(),
        (n: LayoutNode<Track>) => n.x
    ) as unknown as number;

    const maxY = d3Max(
        layoutRoot.value.descendants(),
        (n: LayoutNode<Track>) => n.x + rowHeight.value
    ) as unknown as number;

    return [minX, minY, maxX, maxY];
});

const containerHeight = computed<number>(() => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [_minX, minY, _maxX, maxY] = extent.value;
    return maxY - minY;
});

function getSplitWeight(source: Track, target: Track): number {
    if (!props.encodeChildSplit) return 0;
    const lastVal = last(source.cells)?.attrNum[attrKey.value] ?? 1;
    const firstVal = target.cells[0].attrNum[attrKey.value];
    const basicWeight = firstVal / lastVal;
    return clamp(basicWeight - 0.5, 0, 1);
}
// const imageFrames = computed<number[]>(() => {
//     const keyFrames = new Set<number>();
//     function addKeyFrames(node: Track, set: Set<number>) {
//         set.add(node.cells[0].attrNum['frame'] + 1);
//         set.add(node.cells[node.cells.length - 1].attrNum['frame'] + 1);
//         if (node.children) {
//             for (const child of node.children) {
//                 addKeyFrames(child, set);
//             }
//         }
//     }
//     addKeyFrames(props.dataRoot, keyFrames);
//     let keyFrameList: number[] = Array.from(keyFrames);
//     keyFrameList = sortBy(keyFrameList);
//     // console.log({ keyFrameList: keyFrameList });

//     return keyFrameList;
// });
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss">
line {
    stroke: #525252;
    stroke-linecap: round;
}

// svg {
// border: solid green 3px;
// }

// .image-container {
// border: solid black 3px;
// overflow: hidden;
// }
</style>
