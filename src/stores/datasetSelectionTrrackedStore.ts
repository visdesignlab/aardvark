import { ref } from 'vue';
import { defineStore } from 'pinia';
import { useStorage } from '@vueuse/core';

export interface SelectedLocationIds {
    [index: string]: boolean;
}

export const useDatasetSelectionTrrackedStore = defineStore(
    'datasetSelectionTrrackedStore',
    () => {
        const serverUrl = useStorage<string | null>('serverUrl', null);
        const entryPointFilename = '/aa_index.json';
        const currentExperimentFilename = ref<string | null>(null);
        const selectedLocationIds = ref<SelectedLocationIds>({});

        return {
            serverUrl,
            entryPointFilename,
            currentExperimentFilename,
            selectedLocationIds,
        };
    }
);
