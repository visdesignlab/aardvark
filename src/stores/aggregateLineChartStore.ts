import { ref, computed, watch } from 'vue';
import { defineStore } from 'pinia';
import { useCellMetaData, type Cell } from '@/stores/cellMetaData';
import { min, max, mean, sum, median } from 'd3-array';

export interface AggLineData extends Array<AggDataPoint> {}
export interface AggDataPoint {
    frame: number;
    value: number; // avg or total or median or ...
    count: number;
    // todo some measure of variance? std dev, extent etc.
}

function storeSetup() {
    // the only reason I've separated this function is to reduce indendation :shrug:
    const cellMetaData = useCellMetaData();

    const aggregatorKey = ref<string>('average');
    const aggregatorOptions = ['average', 'total', 'min', 'median', 'max'];

    const attributeKey = ref<string>(cellMetaData.headerKeys.mass);
    watch(
        // todo  - this mostly works, but also is triggered on location change...
        () => cellMetaData.headerKeys,
        () => (attributeKey.value = cellMetaData.headerKeys.mass)
    );
    const targetKey = ref<string>('entire location');

    const targetOptions = [
        'entire condition',
        'entire location',
        'cell lineages',
        'cell tracks',
    ];

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

    const accessor = computed(() => {
        return (cell: Cell) => cell.attrNum[attributeKey.value];
    });

    const aggLineDataList = computed<AggLineData[]>(() => {
        switch (targetKey.value) {
            case 'entire condition': {
                // todo
                return [];
            }
            case 'entire location': {
                const singleLine: AggLineData = [];
                for (const frame of cellMetaData?.frameList ?? []) {
                    const cellsAtFrame = cellMetaData.frameMap.get(frame);
                    if (!cellsAtFrame) continue;
                    const count = cellsAtFrame.length;
                    if (!aggregator.value) continue;
                    const value = aggregator.value(cellsAtFrame);
                    if (!value) continue;
                    singleLine.push({ frame, value, count });
                }
                return [singleLine];
            }
            case 'cell lineages': {
                const result: AggLineData[] = [];
                // for (const lineage of cellMetaData?.lineageArray) {

                // }
                // todo
                return result;
            }
            case 'cell tracks': {
                const result: AggLineData[] = [];
                if (!cellMetaData?.trackArray) return [];
                for (const track of cellMetaData.trackArray) {
                    const aggLineData: AggLineData = [];
                    for (const cell of track.cells) {
                        const frame = cellMetaData.getFrame(cell);
                        const value = accessor.value(cell);
                        const count = 1;
                        aggLineData.push({ frame, value, count });
                    }
                    result.push(aggLineData);
                }
                return result;
            }
        }
        return [];
    });

    const aggLineDataListExtent = computed(() => {
        const minVal = min(
            aggLineDataList.value,
            (aggLineData: AggLineData) => {
                return min(aggLineData, (point) => point.value);
            }
        );
        const maxVal = max(
            aggLineDataList.value,
            (aggLineData: AggLineData) => {
                return max(aggLineData, (point) => point.value);
            }
        );
        return [minVal, maxVal] as const;
    });

    return {
        aggregatorKey,
        aggregatorOptions,
        attributeKey,
        targetKey,
        targetOptions,
        aggLineDataList,
        aggLineDataListExtent,
    };
}

export const useAggregateLineChartStore = defineStore(
    'aggregateLineChartStore',
    storeSetup
);
