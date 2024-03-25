import { computed, ref, type ComputedRef } from 'vue';
import { defineStore } from 'pinia';
import { useCellMetaData } from '@/stores/cellMetaData';

export const useDataPointSelection = defineStore('dataPointSelection', () => {
    const cellMetaData = useCellMetaData();
    const selectedTrackId = ref<string | null>(null);
    const selectedLineageId = ref<string | null>(null);
    const currentFrameIndex = ref<number>(0);

    const currentTime: ComputedRef<number> = computed(() => {
        return cellMetaData.timeList[currentFrameIndex.value];
    });

    return {
        selectedTrackId,
        selectedLineageId,
        currentFrameIndex,
        currentTime,
    };
});
