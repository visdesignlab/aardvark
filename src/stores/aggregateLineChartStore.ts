import { ref, computed, watch } from 'vue';
import { defineStore } from 'pinia';
import { useCellMetaData, type Cell, type Track } from '@/stores/cellMetaData';
import { useSkipTrackingMap } from '@/stores/skipTrackingMap';
import { useDataPointSelection } from '@/stores/dataPointSelection';
import { useLooneageViewStore } from './looneageViewStore';

import { min, max, mean, sum, median, quantile, deviation } from 'd3-array';
import { useDataPointSelectionUntrracked } from './dataPointSelectionUntrracked';

export interface AggLineData extends Array<AggDataPoint> {}
export interface AggDataPoint {
    time: number;
    value: number; // avg or total or median or ...
    count: number;
    variance?: [number, number];
}

function storeSetup() {
    // the only reason I've separated this function is to reduce indendation :shrug:
    const cellMetaData = useCellMetaData();
    const skipTrackingMap = useSkipTrackingMap();
    const dataPointSelection = useDataPointSelection();
    const looneageViewStore = useLooneageViewStore();
    const dataPointSelectionUntrracked = useDataPointSelectionUntrracked();

    const aggregatorKey = ref<string>('average');
    const aggregatorOptions = ['average', 'total', 'min', 'median', 'max'];

    const varianceKey = ref<string>('one standard deviation');
    const averageVarianceOptions = [
        'one standard deviation',
        'two standard deviations',
        'three standard deviations',
        'standard error',
    ];

    const medianVarianceOptions = [
        '90/10 percentile',
        '95/5 percentile',
        '99/1 percentile',
        '100/0 percentile',
    ];
    const varianceOptions = computed(() => {
        if (aggregatorKey.value == 'average') {
            return averageVarianceOptions;
        } else if (aggregatorKey.value == 'median') {
            return medianVarianceOptions;
        }
        return [];
    });
    watch(varianceOptions, () => {
        if (
            aggregatorKey.value == 'average' ||
            aggregatorKey.value == 'median'
        ) {
            varianceKey.value = varianceOptions.value[0];
        }
    });

    const attributeKey = ref<string>(cellMetaData.headerKeys.mass);
    watch(() => cellMetaData.headerKeys, setDefaultAttrKey);
    watch(attributeKey, setDefaultAttrKey);
    function setDefaultAttrKey() {
        if (!cellMetaData.dataInitialized) return;
        if (cellMetaData.headers?.includes(attributeKey.value)) return;
        skipTrackingMap.map.set(storeId, true);
        attributeKey.value = cellMetaData.headerKeys.mass;
    }

    const targetKey = ref<string>('selected lineage');

    const targetOptions = [
        'selected lineage',
        'entire location combined',
        'cell lineages combined',
        'individual cell tracks',
    ];

    const smoothWindow = ref(0);
    const smoothWindowComputed = computed({
        get() {
            return smoothWindow.value;
        },
        set(val) {
            skipTrackingMap.map.set(storeId, true);
            smoothWindow.value = val;
        },
    });
    function onSmoothWindowChange() {
        // hack to trigger a $subscribe and subsequent
        // update in provenance store
        const val = smoothWindow.value;
        smoothWindow.value = -1;
        smoothWindow.value = val;
    }

    const aggregator = computed(() => {
        switch (aggregatorKey.value) {
            case 'average':
                return (cellList: Cell[]) => {
                    return mean(cellList, accessor.value);
                };
            case 'total':
                return (cellList: Cell[]) => {
                    return sum(cellList, accessor.value);
                };
            case 'min':
                return (cellList: Cell[]) => {
                    return min(cellList, accessor.value);
                };
            case 'median':
                return (cellList: Cell[]) => {
                    return median(cellList, accessor.value);
                };
            case 'max':
                return (cellList: Cell[]) => {
                    return max(cellList, accessor.value);
                };
        }
        return null;
    });

    const varianceCalculator = computed(() => {
        switch (varianceKey.value) {
            case 'one standard deviation':
                return (cellList: Cell[], value: number) => {
                    const std = deviation(cellList, accessor.value) ?? 0;
                    return [value - std, value + std] as const;
                };

            case 'two standard deviations':
                return (cellList: Cell[], value: number) => {
                    const std = deviation(cellList, accessor.value) ?? 0;
                    return [value - 2 * std, value + 2 * std] as const;
                };

            case 'three standard deviations':
                return (cellList: Cell[], value: number) => {
                    const std = deviation(cellList, accessor.value) ?? 0;
                    return [value - 3 * std, value + 3 * std] as const;
                };
            case 'standard error':
                return (cellList: Cell[], value: number) => {
                    const std = deviation(cellList, accessor.value) ?? 0;
                    const se = std / Math.sqrt(cellList.length);
                    return [value - se, value + se] as const;
                };
            case '90/10 percentile':
                return (cellList: Cell[], value: number) => {
                    return [
                        quantile(cellList, 0.1, accessor.value),
                        quantile(cellList, 0.9, accessor.value),
                    ] as const;
                };
            case '95/5 percentile':
                return (cellList: Cell[], value: number) => {
                    return [
                        quantile(cellList, 0.05, accessor.value),
                        quantile(cellList, 0.95, accessor.value),
                    ] as const;
                };
            case '99/1 percentile':
                return (cellList: Cell[], value: number) => {
                    return [
                        quantile(cellList, 0.01, accessor.value),
                        quantile(cellList, 0.98, accessor.value),
                    ] as const;
                };
            case '100/0 percentile':
                return (cellList: Cell[], value: number) => {
                    return [
                        min(cellList, accessor.value),
                        max(cellList, accessor.value),
                    ] as const;
                };
        }
        return () => undefined;
    });

    const accessor = computed(() => {
        return (cell: Cell) => cell.attrNum[attributeKey.value];
    });

    const extendedSelectedLineLineageConnections = computed<AggLineData[]>(
        () => {
            if (targetKey.value !== 'selected lineage') {
                return [];
            }
            const trackId = dataPointSelection.selectedTrackId;
            if (trackId === null) {
                return [];
            }
            const selectedTrack = cellMetaData.trackMap?.get(trackId);
            if (!selectedTrack) {
                return [];
            }
            const result: AggLineData[] = [];

            let child = cellMetaData.getParent(selectedTrack);
            let parent: Track | null = null;

            // start with parent/grandparent connection and move up since this is the extended connections
            if (child) {
                parent = cellMetaData.getParent(child);
            }
            while (parent && child) {
                const parentSelectedLine: AggLineData = [];
                parentSelectedLine.push(getLastPoint(parent));
                parentSelectedLine.push(getFirstPoint(child));
                result.push(parentSelectedLine);
                child = parent;
                parent = cellMetaData.getParent(child);
            }

            // next add lines between the children of selected and grandchildren
            for (const child of selectedTrack.children) {
                for (const grandchild of child.children) {
                    const childSelectedLine: AggLineData = [];
                    childSelectedLine.push(getLastPoint(child));
                    childSelectedLine.push(getFirstPoint(grandchild));
                    result.push(childSelectedLine);
                }
            }

            return result;
        }
    );

    const selectedLineLineageConnections = computed<AggLineData[]>(() => {
        if (targetKey.value !== 'selected lineage') {
            return [];
        }
        const trackId = dataPointSelection.selectedTrackId;
        if (trackId === null) {
            return [];
        }
        const selectedTrack = cellMetaData.trackMap?.get(trackId);
        if (!selectedTrack) {
            return [];
        }
        const result: AggLineData[] = [];
        const parent = cellMetaData.getParent(selectedTrack);
        if (parent) {
            const parentSelectedLine: AggLineData = [];
            parentSelectedLine.push(getLastPoint(parent));

            parentSelectedLine.push(getFirstPoint(selectedTrack));
            result.push(parentSelectedLine);
        }
        const lastCell = getLastPoint(selectedTrack);
        for (const child of selectedTrack.children) {
            const selectedChildLine: AggLineData = [];
            selectedChildLine.push(getFirstPoint(child));
            selectedChildLine.push(lastCell);
            result.push(selectedChildLine);
        }
        return result;
    });

    function getFirstPoint(track: Track, count = 1): AggDataPoint {
        const firstCell = track.cells[0];
        const time = cellMetaData.getTime(firstCell);
        const value = accessor.value(firstCell);
        return {
            time,
            value,
            count,
        };
    }

    function getLastPoint(track: Track, count = 1): AggDataPoint {
        const lastCell = track.cells[track.cells.length - 1];
        const time = cellMetaData.getTime(lastCell);
        const value = accessor.value(lastCell);
        return {
            time,
            value,
            count,
        };
    }

    const hoveredLineData = computed<{ data: AggLineData; trackId: string }>(
        () => {
            // if (targetKey.value !== 'selected lineage') {
            //     return [];
            // }
            const trackId = dataPointSelectionUntrracked.hoveredTrackId;
            if (trackId === null) {
                return { data: [], trackId: '' };
            }
            const selectedTrack = cellMetaData.trackMap?.get(trackId);
            if (!selectedTrack) {
                return { data: [], trackId: '' };
            }
            const aggLineData: AggLineData = [];
            for (const cell of selectedTrack.cells) {
                const time = cellMetaData.getTime(cell);
                const value = accessor.value(cell);
                const count = 1;
                aggLineData.push({ time, value, count });
            }

            const data: AggLineData = medianFilterSmooth(aggLineData);
            return { data, trackId };
        }
    );

    const selectedLineData = computed<{ data: AggLineData; trackId: string }>(
        () => {
            if (targetKey.value !== 'selected lineage') {
                return { data: [], trackId: '' };
            }
            const trackId = dataPointSelection.selectedTrackId;
            if (trackId === null) {
                return { data: [], trackId: '' };
            }
            const selectedTrack = cellMetaData.trackMap?.get(trackId);
            if (!selectedTrack) {
                return { data: [], trackId: '' };
            }
            const aggLineData: AggLineData = [];
            for (const cell of selectedTrack.cells) {
                const time = cellMetaData.getTime(cell);
                const value = accessor.value(cell);
                const count = 1;
                aggLineData.push({ time, value, count });
            }
            const data: AggLineData = medianFilterSmooth(aggLineData);
            return { data, trackId };
        }
    );

    const aggLineDataList = computed<
        { data: AggLineData; muted: boolean; trackId: string }[]
    >(() => {
        switch (targetKey.value) {
            case 'selected lineage': {
                const lineageId = dataPointSelection.selectedLineageId;
                if (!lineageId) return [];
                const lineage = cellMetaData.lineageMap?.get(lineageId);
                if (!lineage) return [];

                const trackId = dataPointSelection.selectedTrackId;
                const selectedTrack =
                    trackId === null
                        ? null
                        : cellMetaData.trackMap?.get(trackId);

                const result: {
                    data: AggLineData;
                    muted: boolean;
                    trackId: string;
                }[] = [];
                for (const track of cellMetaData.makeLineageTrackIterator(
                    lineage.founder,
                    looneageViewStore.maxDepth
                )) {
                    const aggLineData: AggLineData = [];
                    for (const cell of track.cells) {
                        const time = cellMetaData.getTime(cell);
                        const value = accessor.value(cell);
                        const count = 1;
                        aggLineData.push({ time, value, count });
                    }
                    const muted = selectedTrack
                        ? !cellMetaData.isDirectRelation(track, selectedTrack)
                        : false;
                    result.push({
                        data: medianFilterSmooth(aggLineData),
                        muted,
                        trackId: track.trackId,
                    });
                }
                return result;
            }
            case 'entire location combined': {
                const singleLine: AggLineData = [];
                for (const time of cellMetaData?.timeList ?? []) {
                    const cellsAtTime = cellMetaData.timeMap.get(time);
                    if (!cellsAtTime) continue;
                    const count = cellsAtTime.length;
                    if (!aggregator.value) continue;
                    const value = aggregator.value(cellsAtTime);
                    if (!value) continue;
                    const variance = varianceCalculator.value(
                        cellsAtTime,
                        value
                    ) as [number, number] | undefined;
                    singleLine.push({ time, value, count, variance });
                }
                return [
                    {
                        data: medianFilterSmooth(singleLine),
                        muted: false,
                        trackId: '',
                    },
                ];
            }
            case 'cell lineages combined': {
                if (!cellMetaData?.lineageArray) return [];

                const result: {
                    data: AggLineData;
                    muted: boolean;
                    trackId: string;
                }[] = [];

                for (const lineage of cellMetaData.lineageArray) {
                    const aggLineData: AggLineData = [];
                    const cells = cellMetaData.makeLineageCellIterator(
                        lineage.founder
                    );
                    const lineageTimeMap = cellMetaData.createTimeMap(cells);
                    const timeList = cellMetaData.getSortedKeys(lineageTimeMap);
                    for (const time of timeList) {
                        const cellsAtTime = lineageTimeMap.get(time);
                        if (!cellsAtTime) continue;
                        const count = cellsAtTime.length;
                        if (!aggregator.value) continue;
                        const value = aggregator.value(cellsAtTime);
                        if (!value) continue;
                        aggLineData.push({ time, value, count });
                    }
                    result.push({
                        data: medianFilterSmooth(aggLineData),
                        muted: false,
                        trackId: lineage.lineageId,
                    });
                }
                return result;
            }
            case 'individual cell tracks': {
                if (!cellMetaData?.trackArray) return [];
                const result: {
                    data: AggLineData;
                    muted: boolean;
                    trackId: string;
                }[] = [];
                for (const track of cellMetaData.trackArray) {
                    const aggLineData: AggLineData = [];
                    for (const cell of track.cells) {
                        const time = cellMetaData.getTime(cell);
                        const value = accessor.value(cell);
                        const count = 1;
                        aggLineData.push({ time, value, count });
                    }
                    result.push({
                        data: medianFilterSmooth(aggLineData),
                        muted: true,
                        trackId: track.trackId,
                    });
                }
                return result;
            }
        }
        return [];
    });

    const aggLineDataListExtent = computed(() => {
        const minVal = min(aggLineDataList.value, (aggLineData) => {
            return min(aggLineData.data, (point) => {
                if (point.variance) return point.variance[0];
                return point.value;
            });
        });
        const maxVal = max(aggLineDataList.value, (aggLineData) => {
            return max(aggLineData.data, (point) => {
                if (point.variance) return point.variance[1];
                return point.value;
            });
        });
        return [minVal, maxVal] as const;
    });

    function medianFilterSmooth(points: AggDataPoint[]): AggDataPoint[] {
        if (smoothWindow.value <= 0) return points;
        return points.map((point, index) => {
            const start = Math.max(0, index - smoothWindow.value);
            const end = Math.min(points.length, index + smoothWindow.value + 1);
            const slice = points.slice(start, end);
            const newVal = median(slice, (point) => point.value) ?? point.value;
            return { ...point, value: newVal };
        });
    }
    const showVarianceBand = computed(() => {
        return (
            (aggregatorKey.value == 'average' ||
                aggregatorKey.value == 'median') &&
            targetKey.value == 'entire location combined'
        );
    });

    return {
        aggregatorKey,
        aggregatorOptions,
        attributeKey,
        targetKey,
        targetOptions,
        varianceKey,
        varianceOptions,
        smoothWindow,
        smoothWindowComputed,
        onSmoothWindowChange,
        aggLineDataList,
        aggLineDataListExtent,
        hoveredLineData,
        selectedLineData,
        selectedLineLineageConnections,
        extendedSelectedLineLineageConnections,
        showVarianceBand,
    };
}
const storeId = 'aggregateLineChartStore';
export const useAggregateLineChartStore = defineStore(storeId, storeSetup);
