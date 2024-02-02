import { ref } from 'vue';
import { defineStore } from 'pinia';
import { useCellMetaData, type Cell, type Track } from '@/stores/cellMetaData';
import { useDatasetSelectionStore } from '@/stores/datasetSelectionStore';
import type { Feature } from 'geojson';

/**
 * Custom store for managing segmentations.
 * @returns An object containing functions to retrieve segmentations.
 */
export const useSegmentationStore = defineStore('segmentationStore', () => {
    const datasetSelectionStore = useDatasetSelectionStore();
    const cellMetaData = useCellMetaData();

    /**
     * Get segmentations for a specific frame.
     * @param frame - The frame number, not the index, so the this is 1-based.
     * @returns An array of GeoJson features representing the segmentations.
     */
    function getFrameSegmentations(frame: number): Feature[] {
        // Implementation goes here
    }

    /**
     * Get segmentations for a specific track.
     * @param track - The track object.
     * @returns An array of GeoJson features representing the segmentations.
     */
    function getTrackSegmentations(track: Track): Feature[] {
        // Implementation goes here
    }

    /**
     * Get segmentations for a specific cell.
     * @param cell - The cell object.
     * @returns A GeoJson feature representing the segmentation.
     */
    function getCellSegmentations(cell: Cell): Feature {
        // Implementation goes here
    }

    return {
        getFrameSegmentations,
        getTrackSegmentations,
        getCellSegmentations,
    };
});
