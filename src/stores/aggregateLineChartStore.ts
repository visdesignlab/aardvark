import { ref, computed } from 'vue';
import { defineStore } from 'pinia';
import { useCellMetaData } from '@/stores/cellMetaData';

function storeSetup() {
    // the only reason I've separated this function is to reduce indendation :shrug:
    const cellMetaData = useCellMetaData();

    const aggregatorKey = ref<string>('total');
    const aggregatorOptions = ['average', 'total', 'min', 'median', 'max'];

    const attributeKey = ref<string>(cellMetaData.headerKeys.mass);
    const targetKey = ref<string>('entire location');

    const targetOptions = [
        'cell tracks',
        'cell lineages',
        'entire location',
        'entire condition',
    ];

    return {
        aggregatorKey,
        aggregatorOptions,
        attributeKey,
        targetKey,
        targetOptions,
    };
}

export const useAggregateLineChartStore = defineStore(
    'aggregateLineChartStore',
    storeSetup
);
