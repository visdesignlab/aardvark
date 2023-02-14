import { ref, computed } from 'vue';
import { defineStore } from 'pinia';

export const useImageViewerStore = defineStore('imageViewerStore', () => {
    const colormap = ref<string>('jet');
    const colormapOptions = [
        'jet',
        'bone',
        'greys',
        'hsv',
        'hot',
        'cool',
        'copper',
        'blackbody',
        'earth',
        'electric',
        'magma',
        'oxygen',
        'temperature',
        'cubehelix',
        'rainbow',
    ];
    // all options: https://github.com/glslify/glsl-colormap#glsl-colormap
    const contrastLimitSlider = ref<{ min: number; max: number }>({
        min: 0,
        max: 0,
    });
    const contrastLimitExtentSlider = ref<{ min: number; max: number }>({
        min: 0,
        max: 0,
    });
    const contrastLimit = computed<[number, number][]>(() => {
        return [[contrastLimitSlider.value.min, contrastLimitSlider.value.max]];
    });

    const frameIndex = ref(0);
    const frameNumber = computed({
        get() {
            return frameIndex.value + 1;
        },
        set(val) {
            frameIndex.value = val - 1;
        },
    });
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
        frameNumber,
        selections,
    };
});
