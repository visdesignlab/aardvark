import { ref } from 'vue';
import { defineStore } from 'pinia';

export const useDataPointSelectionUntrracked = defineStore(
    'dataPointSelectionUntrracked',
    () => {
        const hoveredTime = ref<number | null>(null);
        const hoveredTrackId = ref<string | null>(null); //TODO: this is in cell metadata right now...
        return {
            hoveredTime,
            hoveredTrackId,
        };
    }
);
