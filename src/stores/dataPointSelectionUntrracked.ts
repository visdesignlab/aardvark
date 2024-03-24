import { ref } from 'vue';
import { defineStore } from 'pinia';

export const useDataPointSelectionUntrracked = defineStore(
    'dataPointSelectionUntrracked',
    () => {
        const hoveredTime = ref<number | null>(null);
        const hoveredTrackId = ref<string | null>(null);
        return {
            hoveredTime,
            hoveredTrackId,
        };
    }
);
