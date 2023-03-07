import { ref } from 'vue';
import { defineStore } from 'pinia';
// import type { Track, Lineage } from './cellMetaData';

export const useDataPointSelection = defineStore('dataPointSelection', () => {
    const selectedTrackId = ref<string | null>(null);
    const selectedLineageId = ref<string | null>(null);

    return {
        selectedTrackId,
        selectedLineageId,
    };
});
