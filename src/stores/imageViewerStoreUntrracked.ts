import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useImageViewerStoreUntrracked = defineStore(
    'imageViewerStoreUntrracked',
    () => {
        const contrastLimitSlider = ref<{ min: number; max: number }>({
            min: 0,
            max: 0,
        });

        return { contrastLimitSlider };
    }
);
