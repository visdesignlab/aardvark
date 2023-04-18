<script setup lang="ts">
import { ref, computed } from 'vue';
import { min as d3Min, max as d3Max, extent as d3Extent } from 'd3-array';
import { scaleLinear } from 'd3-scale';
import { clamp, last } from 'lodash-es';
import HorizonChart, {
    type HorizonChartSettings,
} from '@/components/HorizonChart.vue';
import HorizonChartLegend from '@/components/HorizonChartLegend.vue';
import { hierarchy } from 'd3-hierarchy';
import { flextree, type LayoutNode } from 'd3-flextree';

import { useElementSize } from '@vueuse/core';
import { useCellMetaData, type Track, type Cell } from '@/stores/cellMetaData';
import { useGlobalSettings } from '@/stores/globalSettings';
import { useLooneageViewStore } from '@/stores/looneageViewStore';
import {
    schemeReds,
    schemeBlues,
    schemeGreens,
    schemeGreys,
    schemeOranges,
    schemePurples,
} from 'd3-scale-chromatic';

const looneageContainer = ref(null);

const cellMetaData = useCellMetaData();
const globalSettings = useGlobalSettings();
const looneageViewStore = useLooneageViewStore();

interface LooneageViewProps {
    encodeChildSplit?: boolean;
    initialSpacing?: number;
    initialRowHeight?: number;
    horizonChartSettings?: HorizonChartSettings;
}

const props = withDefaults(defineProps<LooneageViewProps>(), {
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
    return Math.round(props.initialSpacing * spacingScale(verticalScale.value));
});
const { width: containerWidth } = useElementSize(looneageContainer);
// const legendWidth = computed(() => Math.min(containerWidth.value, 300));
const legendWidth = computed(() => containerWidth.value);

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
const layoutRoot = computed<LayoutNode<Track> | null>(() => {
    if (cellMetaData.selectedLineage == null) return null;
    return flextree<Track>({
        nodeSize: (node: LayoutNode<Track>) => {
            const timeWidth = getWidth(node.data);
            return [rowHeight.value, timeWidth];
        },
        spacing: spacing.value,
    })(tree.value);
});

const scaleX = computed(() => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [minX, _minY, maxX, _maxY] = extent.value;
    return scaleLinear().domain([minX, maxX]).range([0, containerWidth.value]);
});

const extent = computed<[number, number, number, number]>(() => {
    if (!cellMetaData.dataInitialized || layoutRoot.value === null)
        return [0, 0, 100, 100];
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
    const lastVal = last(source.cells)?.attrNum[looneageViewStore.attrKey] ?? 1;
    const firstVal = target.cells[0].attrNum[looneageViewStore.attrKey];
    const basicWeight = firstVal / lastVal;
    return clamp(basicWeight - 0.5, 0, 1);
}

function onHorizonChartClick(node: LayoutNode<Track> | null): void {
    if (node === null) {
        cellMetaData.selectTrack(null);
    } else {
        cellMetaData.selectTrack(node.data);
    }
    // console.log('hr clicked!', { node });
}

const selectedNodes = computed(() => {
    if (layoutRoot.value === null) return [];
    return layoutRoot.value
        .descendants()
        .filter(
            (node) => node.data.trackId !== cellMetaData.selectedTrack?.trackId
        );
});
const unselectedNodes = computed(() => {
    if (layoutRoot.value === null) return [];
    return layoutRoot.value
        .descendants()
        .filter(
            (node) => node.data.trackId === cellMetaData.selectedTrack?.trackId
        );
});

const colorSchemeOptions = [
    { label: 'Red', value: schemeReds },
    { label: 'Blue', value: schemeBlues },
    { label: 'Green', value: schemeGreens },
    { label: 'Grey', value: schemeGreys },
    { label: 'Orange', value: schemeOranges },
    { label: 'Purple', value: schemePurples },
];

const maxBands = 15;
const minModHeight = computed(() => {
    return (looneageViewStore.maxVal - looneageViewStore.minVal) / maxBands;
});
const modHeightValidate = computed({
    get() {
        return looneageViewStore.modHeight;
    },
    set(value) {
        looneageViewStore.modHeight = Math.max(value, minModHeight.value);
    },
});
</script>

<template>
    <NoDataSplash></NoDataSplash>
    <div v-if="cellMetaData.dataInitialized" ref="looneageContainer">
        <q-select
            label="Attribute"
            v-model="looneageViewStore.attrKey"
            :options="cellMetaData.cellNumAttributeHeaderNames"
            :dark="globalSettings.darkMode"
            class="mb-1"
        />
        <q-select
            label="Negative Color Scale"
            v-model="looneageViewStore.negativeColorScheme"
            :options="colorSchemeOptions"
            :dark="globalSettings.darkMode"
            class="mb-1"
        />
        <q-select
            label="Positive Color Scale"
            v-model="looneageViewStore.positiveColorScheme"
            :options="colorSchemeOptions"
            :dark="globalSettings.darkMode"
            class="mb-1"
        />
        <q-input
            label="Bin Size"
            v-model.number="modHeightValidate"
            type="number"
            :dark="globalSettings.darkMode"
            debounce="400"
        />

        <!-- <button @click="verticalScale -= 0.1">decrease</button>
        <button @click="verticalScale += 0.1">increase</button> -->
        <div v-if="cellMetaData.selectedLineage !== null">
            <svg
                :width="containerWidth"
                :height="containerHeight"
                @click="() => onHorizonChartClick(null)"
            >
                <g :transform="`translate(0,${-extent[1]})`">
                    <g
                        v-for="node in selectedNodes"
                        :key="node.data.trackId"
                        :transform="`translate(${scaleX(node.y)},${node.x})`"
                        :class="`n-${node.depth}`"
                        @click.stop="() => onHorizonChartClick(node)"
                    >
                        <HorizonChart
                            :chartWidth="scaleX(getWidth(node.data))"
                            :chartHeight="rowHeight"
                            :data="node.data.cells"
                            :selected="
                                node.data.trackId ===
                                cellMetaData.selectedTrack?.trackId
                            "
                            :settings="{
                                baseline: 0,
                                modHeight: looneageViewStore.modHeight,
                                mirrorNegative: false,
                                includeBinLine: true,
                                positiveColorScheme:
                                    looneageViewStore.positiveColorScheme.value,
                                negativeColorScheme:
                                    looneageViewStore.negativeColorScheme.value,
                            }"
                            :timeAccessor="cellMetaData.getTime"
                            :valueAccessor="(cell: Cell) => cellMetaData.getNumAttr(cell, looneageViewStore.attrKey)"
                            :info="node.data.trackId"
                        ></HorizonChart>
                    </g>

                    <line
                        v-for="({ source, target }, i) in layoutRoot?.links()"
                        :key="i"
                        :x1="scaleX(source.y + getWidth(source.data))"
                        :y1="source.x + rowHeight / 2"
                        :x2="scaleX(target.y)"
                        :y2="target.x + rowHeight / 2"
                        :stroke-width="
                            2 + 36 * getSplitWeight(source.data, target.data)
                        "
                    ></line>
                    <g
                        v-for="node in unselectedNodes"
                        :key="node.data.trackId"
                        :transform="`translate(${scaleX(node.y)},${node.x})`"
                        :class="`n-${node.depth}`"
                        @click.stop="() => onHorizonChartClick(node)"
                    >
                        <HorizonChart
                            :chartWidth="scaleX(getWidth(node.data))"
                            :chartHeight="rowHeight"
                            :data="node.data.cells"
                            :selected="
                                node.data.trackId ===
                                cellMetaData.selectedTrack?.trackId
                            "
                            :settings="{
                                baseline: 0,
                                modHeight: looneageViewStore.modHeight,
                                mirrorNegative: false,
                                includeBinLine: true,
                                positiveColorScheme: schemeReds,
                                negativeColorScheme: schemeBlues,
                            }"
                            :timeAccessor="cellMetaData.getTime"
                            :valueAccessor="(cell: Cell) => cellMetaData.getNumAttr(cell, looneageViewStore.attrKey)"
                            :info="node.data.trackId"
                        ></HorizonChart>
                    </g>
                </g>
            </svg>
            <HorizonChartLegend
                :containerWidth="containerWidth"
                :chartWidth="legendWidth"
                :chartHeight="rowHeight"
                :includeNegatives="looneageViewStore.minVal < 0"
            ></HorizonChartLegend>
        </div>
        <q-banner
            v-else
            rounded
            :class="globalSettings.darkMode ? 'm-3 bg-grey-9' : 'm-3 bg-grey-3'"
            >Select lineage to visualize.</q-banner
        >
    </div>
</template>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss">
svg {
    overflow: visible !important;
}

line {
    stroke: #525252;
    stroke-linecap: round;
}
</style>
