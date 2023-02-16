<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { useCellMetaData } from '@/stores/cellMetaData';
import { useGlobalSettings } from '@/stores/globalSettings';
import { useAggregateLineChartStore } from '@/stores/aggregateLineChartStore';
const cellMetaData = useCellMetaData();
const globalSettings = useGlobalSettings();
const aggregateLineChartStore = useAggregateLineChartStore();
</script>

<template>
    <NoDataSplash></NoDataSplash>
    <div v-if="cellMetaData.dataInitialized">
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
    </div>
</template>

<style scoped lang="scss"></style>
