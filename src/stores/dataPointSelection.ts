import { ref } from 'vue';
import { defineStore } from 'pinia';

export const useDataPointSelection = defineStore('dataPointSelection', () => {
    const selectedTrackId = ref<string | null>(null);
    const selectedLineageId = ref<string | null>(null);

    return {
        selectedTrackId,
        selectedLineageId,
    };
});
