<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { useElementSize } from '@vueuse/core';
import { useCellMetaData } from '@/stores/cellMetaData';
import { useGlobalSettings } from '@/stores/globalSettings';
import { useAggregateLineChartStore } from '@/stores/aggregateLineChartStore';
const cellMetaData = useCellMetaData();
const globalSettings = useGlobalSettings();
const aggregateLineChartStore = useAggregateLineChartStore();

const aggLineChartContainer = ref(null);
const { width: containerWidth, height: outerContainerHeight } = useElementSize(
    aggLineChartContainer
);

// container height must be less than the outer container height in order for
// height to shrink when the outer container is reduced in height. Without
// the -5 neither height will reduce.
const containerHeight = computed(() => outerContainerHeight.value - 5);
</script>

<template>
    <NoDataSplash></NoDataSplash>
    <div v-if="cellMetaData.dataInitialized" class="d-flex flex-column h-100">
        <div class="d-flex align-center">
            <span class="me-2">Show</span>
            <q-select
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
            ></svg>
        </div>
    </div>
</template>

<style scoped lang="scss"></style>
