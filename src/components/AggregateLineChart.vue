<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useElementSize } from '@vueuse/core';
import { useCellMetaData } from '@/stores/cellMetaData';
import { useGlobalSettings } from '@/stores/globalSettings';
import {
    useAggregateLineChartStore,
    type AggDataPoint,
    type AggLineData,
} from '@/stores/aggregateLineChartStore';
import { scaleLinear } from 'd3-scale';
import { extent, max, min } from 'd3-array';
import { area, line } from 'd3-shape';
import { axisBottom, axisLeft } from 'd3-axis';
import { select } from 'd3-selection';
import { format } from 'd3-format';
import { useDataPointSelectionUntrracked } from '@/stores/dataPointSelectionUntrracked';
import { useDataPointSelection } from '@/stores/dataPointSelection';

const cellMetaData = useCellMetaData();
const globalSettings = useGlobalSettings();
const aggregateLineChartStore = useAggregateLineChartStore();
const dataPointSelectionUntrracked = useDataPointSelectionUntrracked();
const dataPointSelection = useDataPointSelection();

const aggLineChartContainer = ref(null);
const { width: containerWidth, height: outerContainerHeight } = useElementSize(
    aggLineChartContainer
);

// container height must be less than the outer container height in order for
// height to shrink when the outer container is reduced in height. Without
// the -10 neither height will reduce.
const containerHeight = computed(() =>
    Math.max(outerContainerHeight.value - 10, 0)
);
const margin = ref({ top: 30, left: 50, bottom: 50, right: 30 });
const chartWidth = computed(
    () => containerWidth.value - margin.value.left - margin.value.right
);
const chartHeight = computed(
    () => containerHeight.value - margin.value.top - margin.value.bottom
);

const scaleX = computed(() => {
    let domain = extent(cellMetaData.timeList) as [number, number];
    if (
        aggregateLineChartStore.aggLineDataList &&
        aggregateLineChartStore.aggLineDataList.length > 0
    ) {
        const timeMin = min(
            aggregateLineChartStore.aggLineDataList,
            (agglineData) => {
                return min(
                    agglineData.data,
                    (aggPoint: AggDataPoint) => aggPoint.time
                );
            }
        );

        const timeMax = max(
            aggregateLineChartStore.aggLineDataList,
            (agglineData) => {
                return max(
                    agglineData.data,
                    (aggPoint: AggDataPoint) => aggPoint.time
                );
            }
        );
        if (timeMin != null && timeMax != null) {
            domain = [timeMin, timeMax];
        }
    }
    return scaleLinear().domain(domain).range([0, chartWidth.value]);
});

const scaleY = computed(() => {
    return scaleLinear()
        .domain(
            aggregateLineChartStore.aggLineDataListExtent as [number, number]
        )
        .range([chartHeight.value, 0]);
});

const temp = ref(0);

const areaGen = computed(() => {
    return area<AggDataPoint>()
        .x((aggPoint) => scaleX.value(aggPoint.time))
        .y0((aggPoint) =>
            scaleY.value(aggPoint.value + temp.value * aggPoint.count)
        )
        .y1((aggPoint) =>
            scaleY.value(aggPoint.value - temp.value * aggPoint.count)
        );
});

const lineGen = computed(() => {
    return line<AggDataPoint>()
        .x((aggPoint) => scaleX.value(aggPoint.time))
        .y((aggPoint) =>
            scaleY.value(aggPoint.value + temp.value * aggPoint.count)
        );
});

const hoveredTimeLineGen = computed(() => {
    return line<number>()
        .x(() => scaleX.value(dataPointSelectionUntrracked.hoveredTime ?? 0))
        .y((val) => scaleY.value(val));
});

const currentTimeLineGen = computed(() => {
    return line<number>()
        .x(() => scaleX.value(dataPointSelection.currentTime))
        .y((val) => scaleY.value(val));
});

const varianceAreaGen = computed(() => {
    return area<AggDataPoint>()
        .x((aggPoint) => scaleX.value(aggPoint.time))
        .y0((aggPoint) => scaleY.value(aggPoint.variance?.[0] ?? 0))
        .y1((aggPoint) => scaleY.value(aggPoint?.variance?.[1] ?? 0));
});

const yAxisContainer = ref<SVGGElement | null>(null);
const xAxisContainer = ref<SVGGElement | null>(null);
const xAxisGen = computed(() => {
    return axisBottom(scaleX.value).ticks(Math.max(1, chartWidth.value / 80));
});
const yAxisGen = computed(() => {
    return axisLeft(scaleY.value)
        .ticks(Math.max(1, chartHeight.value / 80))
        .tickFormat(format('~s'));
});

const axisPading = ref(8);

watch(xAxisGen, () => {
    if (!xAxisContainer.value) return;
    select(xAxisContainer.value).call(xAxisGen.value);
});

watch(yAxisGen, () => {
    if (!yAxisContainer.value) return;
    select(yAxisContainer.value).call(yAxisGen.value);
});
</script>

<template>
    <NoDataSplash></NoDataSplash>
    <div v-if="cellMetaData.dataInitialized" class="d-flex flex-column h-100">
        <div ref="aggLineChartContainer" class="h-100">
            <svg :width="containerWidth" :height="containerHeight">
                <g
                    ref="yAxisContainer"
                    class="no-select"
                    :transform="`translate(${margin.left - axisPading}, ${
                        margin.top
                    })`"
                ></g>
                <g
                    ref="xAxisContainer"
                    class="no-select"
                    :transform="`translate(${margin.left}, ${
                        margin.top + chartHeight + axisPading
                    })`"
                ></g>
                <g :transform="`translate(${margin.left},${margin.top})`">
                    <path
                        :class="`current time agg-line ${globalSettings.normalizedDark}`"
                        :d="currentTimeLineGen(scaleY.domain()) ?? ''"
                    ></path>
                </g>
                <g :transform="`translate(${margin.left},${margin.top})`">
                    <path
                        :class="`hovered time agg-line ${globalSettings.normalizedDark}`"
                        v-if="dataPointSelectionUntrracked.hoveredTime !== null"
                        :d="hoveredTimeLineGen(scaleY.domain()) ?? ''"
                    ></path>
                </g>
                <g
                    v-if="aggregateLineChartStore.showVarianceBand"
                    :transform="`translate(${margin.left},${margin.top})`"
                >
                    <path
                        :class="`variance-band ${globalSettings.normalizedDark}`"
                        v-for="(
                            aggLine, index
                        ) in aggregateLineChartStore.aggLineDataList"
                        :key="index"
                        :d="varianceAreaGen(aggLine.data) ?? ''"
                    ></path>
                </g>
                <g :transform="`translate(${margin.left},${margin.top})`">
                    <path
                        :class="`muted agg-line ${globalSettings.normalizedDark}`"
                        v-for="(
                            aggLine, index
                        ) in aggregateLineChartStore.aggLineDataList.filter(
                            (d) => d.muted
                        )"
                        :key="index"
                        :d="areaGen(aggLine.data) ?? ''"
                    ></path>
                </g>
                <g :transform="`translate(${margin.left},${margin.top})`">
                    <path
                        :class="`agg-line ${globalSettings.normalizedDark}`"
                        v-for="(
                            aggLine, index
                        ) in aggregateLineChartStore.aggLineDataList.filter(
                            (d) => !d.muted
                        )"
                        :key="index"
                        :d="areaGen(aggLine.data) ?? ''"
                    ></path>
                </g>
                <g :transform="`translate(${margin.left},${margin.top})`">
                    <path
                        :class="`selected agg-line ${globalSettings.normalizedDark}`"
                        v-if="aggregateLineChartStore.selectedLineData"
                        :d="
                            areaGen(aggregateLineChartStore.selectedLineData) ??
                            ''
                        "
                    ></path>
                </g>
                <g :transform="`translate(${margin.left},${margin.top})`">
                    <path
                        :class="`connection agg-line ${globalSettings.normalizedDark}`"
                        v-for="(
                            aggLine, index
                        ) in aggregateLineChartStore.extendedSelectedLineLineageConnections"
                        :key="index"
                        :d="lineGen(aggLine) ?? ''"
                    ></path>
                </g>
                <g :transform="`translate(${margin.left},${margin.top})`">
                    <path
                        :class="`connection selected agg-line ${globalSettings.normalizedDark}`"
                        v-for="(
                            aggLine, index
                        ) in aggregateLineChartStore.selectedLineLineageConnections"
                        :key="index"
                        :d="lineGen(aggLine) ?? ''"
                    ></path>
                </g>
                <g :transform="`translate(${margin.left},${margin.top})`">
                    <path
                        :class="`hovered agg-line ${globalSettings.normalizedDark}`"
                        v-if="aggregateLineChartStore.hoveredLineData"
                        :d="
                            areaGen(aggregateLineChartStore.hoveredLineData) ??
                            ''
                        "
                    ></path>
                </g>
            </svg>
        </div>
    </div>
</template>

<style scoped lang="scss">
.variance-band {
    stroke-width: 1px;
    stroke-linejoin: round;
    opacity: 0.25;
}
.agg-line {
    stroke-width: 3px;
    stroke-linejoin: round;
    opacity: 0.95;
}
.muted.agg-line {
    stroke-width: 1px;
    opacity: 0.6;
}
.selected.agg-line {
    stroke-width: 4px;
}
.hovered.agg-line {
    stroke-width: 6px;
}
.connection.agg-line {
    stroke-dasharray: 4.5 6;
    stroke-width: 1.5px;
    opacity: 0.7;
}
.hovered.time.agg-line {
    stroke-width: 0.5px;
    // stroke-dasharray: 1 2;
    stroke: rgb(130, 130, 130);
    fill: rgb(130, 130, 130);
}

.current.time.agg-line {
    stroke-width: 1.5px;
    stroke: rgb(130, 130, 130);
    fill: rgb(130, 130, 130);
}

.dark {
    stroke: #377eb8;
    fill: #377eb8;
}

.dark.selected {
    stroke: #e29609;
    fill: #e29609;
}

.dark.hovered,
.light.hovered {
    stroke: #ffcf76;
    fill: #ffcf76;
}

.light {
    stroke: #377eb8;
    fill: #377eb8;
}

.light.selected {
    fill: #fde309;
    stroke: #fde309;
}

.mw-250 {
    max-width: 250px;
}
</style>
