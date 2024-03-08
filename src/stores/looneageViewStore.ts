import { ref, watch, computed } from 'vue';
import { defineStore } from 'pinia';
import { useCellMetaData, type Cell } from '@/stores/cellMetaData';
import { useSkipTrackingMap } from '@/stores/skipTrackingMap';
import { schemeReds, schemeBlues, schemeGreens } from 'd3-scale-chromatic';
import { min as d3Min, max as d3Max } from 'd3-array';

export interface SelectedSnippet {
    trackId: string;
    index: number;
    extraFrames: number;
}

interface PinnedSnippetLookup {
    [key: string]: SelectedSnippet;
}

export interface InnerHorizonChartSettings {
    attrKey: string;
    positiveColorScheme: {
        label: string;
        value: readonly (readonly string[])[];
    };
    negativeColorScheme: {
        label: string;
        value: readonly (readonly string[])[];
    };
    modHeight: number;
    baseline: number;
}

const storeId = 'looneageViewStore';
export const useLooneageViewStore = defineStore(storeId, () => {
    const cellMetaData = useCellMetaData();
    const skipTrackingMap = useSkipTrackingMap();

    const horizonChartSettingList = ref<InnerHorizonChartSettings[]>([]);

    function setDefaultHorizonChartSettingList() {
        const modHeight = getReasonableModHeight(attrKey.value);
        if (modHeight === null) return [];
        horizonChartSettingList.value = [
            {
                attrKey: cellMetaData.headerKeys.mass,
                positiveColorScheme: {
                    label: 'Reds',
                    value: schemeReds,
                },
                negativeColorScheme: {
                    label: 'Blues',
                    value: schemeBlues,
                },
                modHeight,
                baseline: 0,
            },
        ];
    }

    function addHorizonChart() {
        // duplicate the last item in horizonChartSettingList and add it to the end
        const lastItem = horizonChartSettingList.value.slice(-1)[0];
        horizonChartSettingList.value.push({
            attrKey: lastItem.attrKey,
            positiveColorScheme: lastItem.positiveColorScheme,
            negativeColorScheme: lastItem.negativeColorScheme,
            modHeight: lastItem.modHeight,
            baseline: lastItem.baseline,
        });
    }

    function removeHorizonChart(index: number) {
        horizonChartSettingList.value.splice(index, 1);
    }

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

    function getReasonableModHeight(key: string): number | null {
        if (!cellMetaData.dataInitialized) return null;
        const minValue =
            d3Min(
                cellMetaData.cellArray ?? [],
                (point: Cell) => point.attrNum[key] as number
            ) ?? 0;

        const maxValue =
            d3Max(
                cellMetaData.cellArray ?? [],
                (point: Cell) => point.attrNum[key] as number
            ) ?? 0;

        const extent = maxValue - minValue;
        if (extent === 0) {
            return 1;
        }
        return extent / 5;
    }

    watch(
        () => horizonChartSettingList.value.map((x) => x.attrKey),
        (newVal: string[], oldVal: string[]) => {
            if (newVal.length < oldVal.length) {
                // item deleted, no change needed.
                return;
            }
            let changedIndex = -1;
            if (newVal.length > oldVal.length) {
                // item added, use the last item
                changedIndex = newVal.length - 1;
            } else {
                // find the index that changed
                changedIndex = newVal.findIndex((x, i) => x !== oldVal[i]);
            }
            if (changedIndex < 0) {
                throw new Error('no changed index found');
            }
            const setting = horizonChartSettingList.value[changedIndex];
            const modHeight = getReasonableModHeight(setting.attrKey);
            if (modHeight === null) return;
            setting.modHeight = modHeight;
        }
    );

    watch(attrKey, setDefaultHorizonChartSettingList); // TODO: update to creat new default list of settings

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
        horizonChartSettingList,
        attrKey,
        // positiveColorScheme,
        // negativeColorScheme,
        modHeight,
        baseline,
        spacing,
        includeSiblingBuffer,
        rowHeight,
        // maxVal,
        // minVal,
        snippetSourceSize,
        snippetDestSize,
        snippetZoom,
        maxDepth,
        showSnippetImage,
        showSnippetOutline,
        connectingLineWidth,
        spaceKeyframesEvenly,
        // setReasonableModHeight,
        pinnedSnippets,
        revealPinnedSnippet,
        concealPinnedSnippet,
        getMatchingPinnedSnippet,
        getSnippet,
        setDefaultAttrKey,
        addHorizonChart,
        removeHorizonChart,
    };
});
