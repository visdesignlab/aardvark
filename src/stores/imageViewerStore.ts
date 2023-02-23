import { ref, computed } from 'vue';
import { defineStore } from 'pinia';
import { debounce } from 'lodash-es';

export interface SelectionIndex {
    c: number;
    t: number;
    z: number;
}

export const useImageViewerStore = defineStore('imageViewerStore', () => {
    const colormap = ref<string>('jet');
    const colormapOptions = [
        'jet',
        'viridis',
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
    // maybe move the computed prop to the view?
    // const contrastLimitSlider = computed<{ min: number; max: number }>({
    //     get() {
    //         return contrastLimitSliderRaw.value;
    //     },
    //     set: debounce((newVal) => {
    //         console.log('update raw: ', newVal);
    //         contrastLimitSliderRaw.value = newVal;
    //     }, 250),
    // });

    const contrastLimitExtentSlider = ref<{ min: number; max: number }>({
        // TODO: this should be handled more gracefully, this is causing
        // this to be stored in the trrack state.
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

    function generateSelectionIndexRange(
        minT: number,
        maxT: number
    ): SelectionIndex[] {
        const selectionIndexRange: SelectionIndex[] = [];
        for (let i = minT; i <= maxT; i++) {
            selectionIndexRange.push({
                c: 0,
                t: i,
                z: 0,
            });
        }
        //console.log({ selectionIndexRange });
        return selectionIndexRange;
    }

    return {
        colormap,
        colormapOptions,
        contrastLimit,
        contrastLimitSlider,
        contrastLimitExtentSlider,
        frameIndex,
        frameNumber,
        selections,
        generateSelectionIndexRange,
    };
});
