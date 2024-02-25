import { ref, watch, computed } from 'vue';
import { defineStore } from 'pinia';
import { useCellMetaData, type Cell } from '@/stores/cellMetaData';
import { useSkipTrackingMap } from '@/stores/skipTrackingMap';
import { schemeReds, schemeBlues } from 'd3-scale-chromatic';
import { min as d3Min, max as d3Max } from 'd3-array';

export interface SelectedSnippet {
    trackId: string;
    index: number;
    extraFrames: number;
}

interface PinnedSnippetLookup {
    [key: string]: SelectedSnippet;
}

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

    const modHeight = ref<number>(0);
    const baseline = ref<number>(0);
    const spacing = ref<number>(82);
    const includeSiblingBuffer = ref<boolean>(true);
    const rowHeight = ref<number>(32);
    const snippetSourceSize = ref<number>(32);
    const snippetDestSize = ref<number>(64);
    const maxDepth = ref<number>(3);
    const showSnippets = ref<boolean>(true);
    const connectingLineWidth = ref<number>(1);
    const spaceKeyframesEvenly = ref<boolean>(false);

    function setReasonableModHeight() {
        if (!cellMetaData.dataInitialized) return;
        baseline.value = 0;
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

    const pinnedSnippets = ref<PinnedSnippetLookup>({});

    function togglePinnedSnippet(snippet: SelectedSnippet) {
        const key = snippet.trackId + '-' + snippet.index;
        if (key in pinnedSnippets.value) {
            delete pinnedSnippets.value[key];
        } else {
            pinnedSnippets.value[key] = snippet;
        }
    }

    return {
        attrKey,
        positiveColorScheme,
        negativeColorScheme,
        modHeight,
        baseline,
        spacing,
        includeSiblingBuffer,
        rowHeight,
        maxVal,
        minVal,
        snippetSourceSize,
        snippetDestSize,
        maxDepth,
        showSnippets,
        connectingLineWidth,
        spaceKeyframesEvenly,
        setReasonableModHeight,
        pinnedSnippets,
        togglePinnedSnippet,
    };
});
