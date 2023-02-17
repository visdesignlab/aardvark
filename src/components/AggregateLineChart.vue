<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
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

const areaGen = computed(() => {
    return area<AggDataPoint>()
        .x((aggPoint) => scaleX.value(aggPoint.frame))
        .y((aggPoint) => scaleY.value(aggPoint.value));
});
</script>

<template>
    <NoDataSplash></NoDataSplash>
    <div v-if="cellMetaData.dataInitialized" class="d-flex flex-column h-100">
        <div class="d-flex align-center">
            <span class="me-2">Show</span>
            <q-select
                v-if="aggregateLineChartStore.targetKey !== 'cell tracks'"
                v-model="aggregateLineChartStore.aggregatorKey"
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
        </div>
        <div ref="aggLineChartContainer" class="mt-3 h-100">
            <svg
                :width="containerWidth"
                :height="containerHeight"
                class="border"
            >
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
.agg-line {
    stroke-width: 3px;
}

.dark {
    stroke: hsl(0, 0%, 10%);
}

.light {
    stroke: hsl(0, 0%, 90%);
}
</style>
