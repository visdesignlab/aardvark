import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import { useCellMetaData } from '@/stores/cellMetaData';

export const useDataPointSelection: ReturnType<typeof defineStore> =
    defineStore('dataPointSelection', () => {
        const cellMetaData = useCellMetaData();
        const selectedTrackId = ref<string | null>(null);
        const selectedLineageId = ref<string | null>(null);
        const currentFrameIndex = ref<number>(0);

        const currentTime = computed(() => {
            return cellMetaData.timeList[currentFrameIndex.value];
        });

        return {
            selectedTrackId,
            selectedLineageId,
            currentFrameIndex,
            currentTime,
        };
    });
