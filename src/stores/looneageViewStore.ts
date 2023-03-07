import { ref, watch } from 'vue';
import { defineStore } from 'pinia';
import { useCellMetaData } from '@/stores/cellMetaData';
import { useSkipTrackingMap } from '@/stores/skipTrackingMap';

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
        skipTrackingMap.map.set(storeId, true);
        attrKey.value = cellMetaData.headerKeys.mass;
    }

    return {
        attrKey,
    };
});
