import { ref } from 'vue';
import { defineStore } from 'pinia';
import { useCellMetaData } from '@/stores/cellMetaData';

export const useDataPointSelectionUntrracked = defineStore(
    'dataPointSelectionUntrracked',
    () => {
        const cellMetaData = useCellMetaData();
        const hoveredTime = ref<number | null>(null);
        const hoveredTrackId = ref<string | null>(null);
        // the hovered cell is assumed to be in the hovered track, so we just need
        // the index of the cell within that track
        const hoveredCellIndex = ref<number | null>(null);

        function setHoveredCellIndex(time: number) {
            if (!cellMetaData.dataInitialized) return;
            const trackId = hoveredTrackId.value;
            if (!trackId) return;
            const track = cellMetaData.trackMap?.get(trackId);
            if (!track) return;
            const cellIndex = track.cells.findIndex(
                (cell) => cellMetaData.getTime(cell) === time
            );
            if (cellIndex === -1) {
                hoveredCellIndex.value = null;
            }
            hoveredCellIndex.value = cellIndex;
        }
        return {
            hoveredTime,
            hoveredTrackId,
            hoveredCellIndex,
            setHoveredCellIndex,
        };
    }
);
