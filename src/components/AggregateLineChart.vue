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
    <div>TODO: Implement</div>
</template>

<style scoped lang="scss"></style>
