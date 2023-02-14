import { ref, computed } from 'vue';
import { defineStore } from 'pinia';

export const useImageViewerStore = defineStore('imageViewerStore', () => {
    const colormap = ref<string>('jet');
    const colormapOptions = ['jet', 'bone', 'greys', 'rainbow'];
    const contrastLimitSlider = ref<{ min: number; max: number }>({
        min: 0,
        max: 0,
    });
    const contrastLimitExtentSlider = ref<{ min: number; max: number }>({
        min: 0,
        max: 0,
    });
    const contrastLimit = computed(() => {
        return [[contrastLimitSlider.value.min, contrastLimitSlider.value.max]];
    });

    const frameIndex = ref(0);
    const selections = computed(() => {
        return [{ c: 0, t: frameIndex.value, z: 0 }];
    });

    return {
        colormap,
        colormapOptions,
        contrastLimit,
        contrastLimitSlider,
        contrastLimitExtentSlider,
        frameIndex,
        selections,
    };
});
