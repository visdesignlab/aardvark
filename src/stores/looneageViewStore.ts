import { ref, watch, computed } from 'vue';
import { defineStore } from 'pinia';
import { useCellMetaData, type Cell } from '@/stores/cellMetaData';
import { useSkipTrackingMap } from '@/stores/skipTrackingMap';
import { schemeReds, schemeBlues } from 'd3-scale-chromatic';
import { min as d3Min, max as d3Max } from 'd3-array';

const storeId = 'looneageViewStore';
export const useLooneageViewStore = defineStore(storeId, () => {
    const cellMetaData = useCellMetaData();
    const skipTrackingMap = useSkipTrackingMap();

    const attrKey = ref<string>(cellMetaData.headerKeys.mass); // Default to mass
    // console.log('atterKey default: ', attrKey.value);
    watch(() => cellMetaData.headerKeys, setDefaultAttrKey);
    watch(attrKey, setDefaultAttrKey);

    function setDefaultAttrKey() {
        if (!cellMetaData.dataInitialized) return;
        if (cellMetaData.headers?.includes(attrKey.value)) return;
        // console.count('setDefaultAttrKey.skip');
        skipTrackingMap.map.set(storeId, true);
        attrKey.value = cellMetaData.headerKeys.mass;
    }

    const minVal = computed<number>(() => {
        return (
            d3Min(
                cellMetaData.cellArray ?? [],
                (point: Cell) => point.attrNum[attrKey.value]
            ) ?? NaN
        );
    });

    const maxVal = computed<number>(() => {
        return (
            d3Max(
                cellMetaData.cellArray ?? [],
                (point: Cell) => point.attrNum[attrKey.value]
            ) ?? NaN
        );
    });

    const modHeight = ref<number>(100);
    const baseline = ref<number>(0);
    const showLines = ref<boolean>(true);

    function setReasonableModHeight() {
        if (!cellMetaData.dataInitialized) return;
        skipTrackingMap.map.set(storeId, true); // TODO: this logic I think is broken now.
        // console.count('setReasonableModHeight.skip');
        const extent = maxVal.value - minVal.value;
        if (extent === 0) {
            modHeight.value = 1;
            return;
        }
        modHeight.value = extent / 5;
    }
    watch(() => cellMetaData.headerKeys, setReasonableModHeight);
    watch(attrKey, setReasonableModHeight);

    const positiveColorScheme = ref({ label: 'Red', value: schemeReds });
    const negativeColorScheme = ref({ label: 'Blue', value: schemeBlues });

    return {
        attrKey,
        positiveColorScheme,
        negativeColorScheme,
        modHeight,
        baseline,
        showLines,
        maxVal,
        minVal,
    };
});
