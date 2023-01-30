import { ref, computed } from 'vue';
import { defineStore } from 'pinia';
import { v4 as uuidv4 } from 'uuid';

export interface ExperimentMetadata {
    name?: string; // user friendly name
    filename: string;
    headers: string[];
    specialHeaderMap?: { from: string; to: string }[]; // maps things like "Time (h)" to "time"
    valueRanges?: { string: { min: number; max: number } };
    // can precompute min/max for each column across experiments
    conditions?: string[];
    locationMetadataList: LocationMetadata[];
}

export interface LocationMetadata {
    // data related to a single imaging location
    id: string;
    tabularDataFilename: string;
    imageDataFilename?: string;
    name?: string; // user friendly name
    condition?: string; // experimental condition
    plate?: string;
    well?: string;
    location?: string;
}

export const useDatasetSelectionStore = defineStore('globalSettings', () => {
    const serverUrl = ref<string | null>(null);
    const entryPointFilename = '/aa_index.json';
    const experimentFilenameList = computed<string[]>(() => {
        // todo
        return [];
    });
    const currentExperimentFilename = ref<string | null>(null);
    const currentExperimentMetadata = computed<ExperimentMetadata | null>(
        () => {
            // todo
            return null;
        }
    );

    return {
        serverUrl,
        entryPointFilename,
        experimentFilenameList,
        currentExperimentFilename,
        currentExperimentMetadata,
    };
});
