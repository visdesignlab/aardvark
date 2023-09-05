<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useElementSize } from '@vueuse/core';
import { useCellMetaData } from '@/stores/cellMetaData';
import { useGlobalSettings } from '@/stores/globalSettings';
import {
    useAggregateLineChartStore,
    type AggDataPoint,
} from '@/stores/aggregateLineChartStore';
import { scaleLinear } from 'd3-scale';
import { extent } from 'd3-array';
import { area } from 'd3-shape';
import { axisBottom, axisLeft } from 'd3-axis';
import { select } from 'd3-selection';
import { format } from 'd3-format';

const cellMetaData = useCellMetaData();
const globalSettings = useGlobalSettings();
const aggregateLineChartStore = useAggregateLineChartStore();

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
    return scaleLinear()
        .domain(extent(cellMetaData.frameList) as [number, number])
        .range([0, chartWidth.value]);
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
        .x((aggPoint) => scaleX.value(aggPoint.frame))
        .y0((aggPoint) =>
            scaleY.value(aggPoint.value + temp.value * aggPoint.count)
        )
        .y1((aggPoint) =>
            scaleY.value(aggPoint.value - temp.value * aggPoint.count)
        );
});

const varianceAreaGen = computed(() => {
    return area<AggDataPoint>()
        .x((aggPoint) => scaleX.value(aggPoint.frame))
        .y0((aggPoint) => scaleY.value(aggPoint.variance?.[0] ?? 0))
        .y1((aggPoint) => scaleY.value(aggPoint?.variance?.[1] ?? 0));
});

const showVarianceBand = computed(() => {
    return (
        (aggregateLineChartStore.aggregatorKey == 'average' ||
            aggregateLineChartStore.aggregatorKey == 'median') &&
        aggregateLineChartStore.targetKey == 'entire location'
    );
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

const currentKey = computed({
    get() {
        return aggregateLineChartStore.aggregatorKey;
    },
    set(val: string) {
        aggregateLineChartStore.$patch(() => {
            // patch so prov store gets one update
            // this might trigger multiple otherwise due to dependencies
            aggregateLineChartStore.aggregatorKey = val;
        });
    },
});
</script>

<template>
    <NoDataSplash></NoDataSplash>
    <div
        v-if="cellMetaData.dataInitialized"
        class="d-flex flex-column h-100 p-3"
    >
        <div class="d-flex align-center">
            <span class="me-2">Show</span>
            <q-select
                v-if="aggregateLineChartStore.targetKey !== 'cell tracks'"
                v-model="currentKey"
                :options="aggregateLineChartStore.aggregatorOptions"
                :dark="globalSettings.darkMode"
                dense
                class="me-2"
            ></q-select>
            <q-select
                v-model="aggregateLineChartStore.attributeKey"
                :options="cellMetaData.cellNumAttributeHeaderNames"
                :dark="globalSettings.darkMode"
                dense
                class="me-2"
            ></q-select>
            <span class="me-2">for</span>
            <q-select
                v-model="aggregateLineChartStore.targetKey"
                :options="aggregateLineChartStore.targetOptions"
                :dark="globalSettings.darkMode"
                dense
                class="me-2"
            ></q-select>
            <span v-if="showVarianceBand" class="me-2">with</span>
            <q-select
                v-if="showVarianceBand"
                v-model="aggregateLineChartStore.varianceKey"
                :options="aggregateLineChartStore.varianceOptions"
                :dark="globalSettings.darkMode"
                dense
                class="me-2"
            ></q-select>
        </div>
        <div class="d-flex align-center">
            <span class="me-3">Smooth: </span>
            <q-slider
                v-model="aggregateLineChartStore.smoothWindowComputed"
                @change="aggregateLineChartStore.onSmoothWindowChange"
                :min="0"
                :max="20"
                label
                :dark="globalSettings.darkMode"
                class="mw-250"
            />
        </div>
        <div ref="aggLineChartContainer" class="mt-3 h-100">
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
                <g
                    v-if="showVarianceBand"
                    :transform="`translate(${margin.left},${margin.top})`"
                >
                    <path
                        :class="`variance-band ${globalSettings.normalizedDark}`"
                        v-for="(
                            aggLine, index
                        ) in aggregateLineChartStore.aggLineDataList"
                        :key="index"
                        :d="varianceAreaGen(aggLine) ?? ''"
                    ></path>
                </g>
                <g :transform="`translate(${margin.left},${margin.top})`">
                    <path
                        :class="`agg-line ${globalSettings.normalizedDark}`"
                        v-for="(
                            aggLine, index
                        ) in aggregateLineChartStore.aggLineDataList"
                        :key="index"
                        :d="areaGen(aggLine) ?? ''"
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
    stroke-width: 1px;
    stroke-linejoin: round;
    // opacity: 0.25;
}

.dark {
    stroke: hsl(0, 0%, 10%);
    fill: hsl(0, 0%, 10%);
}

.light {
    stroke: hsl(0, 0%, 90%);
    fill: hsl(0, 0%, 90%);
}

.mw-250 {
    max-width: 250px;
}
</style>
