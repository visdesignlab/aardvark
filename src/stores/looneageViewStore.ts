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
    const snippetSourceSize = ref<number>(64);
    const snippetDestSize = ref<number>(64);
    const snippetZoom = computed<number>(() => {
        return snippetDestSize.value / snippetSourceSize.value;
    });
    const maxDepth = ref<number>(2);
    const showSnippetImage = ref<boolean>(true);
    const showSnippetOutline = ref<boolean>(true);
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

    function revealPinnedSnippet(snippet: SelectedSnippet): SelectedSnippet {
        const key = getSnippetKey(snippet);
        if (key in pinnedSnippets.value) {
            pinnedSnippets.value[key].extraFrames += 1;
        } else {
            pinnedSnippets.value[key] = snippet;
        }
        return pinnedSnippets.value[key];
    }

    function concealPinnedSnippet(
        snippet: SelectedSnippet
    ): SelectedSnippet | null {
        const key = getSnippetKey(snippet);
        if (key in pinnedSnippets.value) {
            pinnedSnippets.value[key].extraFrames -= 1;
            if (pinnedSnippets.value[key].extraFrames < 0) {
                delete pinnedSnippets.value[key];
                return null;
            } else {
                return pinnedSnippets.value[key];
            }
        }
        return null;
    }

    function getMatchingPinnedSnippet(
        snippet: SelectedSnippet
    ): SelectedSnippet | null {
        const key = getSnippetKey(snippet);

        if (!(key in pinnedSnippets.value)) {
            return null;
        }
        return pinnedSnippets.value[key];
    }

    function getSnippetKey(snippet: SelectedSnippet): string {
        return snippet.trackId + '-' + snippet.index;
    }

    function getSnippet(
        trackId: string,
        index: number
    ): SelectedSnippet | null {
        const key = trackId + '-' + index;
        if (key in pinnedSnippets.value) {
            return pinnedSnippets.value[key];
        } else {
            return null;
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
        snippetZoom,
        maxDepth,
        showSnippetImage,
        showSnippetOutline,
        connectingLineWidth,
        spaceKeyframesEvenly,
        setReasonableModHeight,
        pinnedSnippets,
        revealPinnedSnippet,
        concealPinnedSnippet,
        getMatchingPinnedSnippet,
        getSnippet,
        setDefaultAttrKey,
    };
});
