import { computed, ref, type ComputedRef, watch } from 'vue';
import { defineStore, storeToRefs } from 'pinia';
import { useCellMetaData } from '@/stores/cellMetaData';
import { useDatasetSelectionTrrackedStore } from './datasetSelectionTrrackedStore';

export const useDataPointSelection = defineStore('dataPointSelection', () => {
    const cellMetaData = useCellMetaData();
    const datasetSelectionTrrackedStore = useDatasetSelectionTrrackedStore();
    const selectedTrackId = ref<string | null>(null);
    const selectedLineageId = ref<string | null>(null);
    const currentFrameIndex = ref<number>(0);

    watch(datasetSelectionTrrackedStore.$state, () => {
        if (!cellMetaData.dataInitialized) return;
        currentFrameIndex.value = 0;
        selectedTrackId.value = null;
        selectedLineageId.value = null;
    });

    const currentTime: ComputedRef<number> = computed(() => {
        return cellMetaData.timeList[currentFrameIndex.value];
    });

    function setCurrentFrameIndex(time: number) {
        const index = cellMetaData.timeList.findIndex((t) => t === time);
        if (index !== -1) {
            currentFrameIndex.value = index;
        }
    }

    return {
        selectedTrackId,
        selectedLineageId,
        currentFrameIndex,
        currentTime,
        setCurrentFrameIndex,
    };
});
