import { ref, computed, watch, nextTick } from 'vue';
import { defineStore } from 'pinia';
import { v4 as uuidv4 } from 'uuid';
import { useStorage } from '@vueuse/core';
import { parse, type ParseResult } from 'papaparse';

import { useCellMetaData, type AnyAttributes } from '@/stores/cellMetaData';
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
    show?: boolean; // if true, include data in interface
}
export const useDatasetSelectionStore = defineStore(
    'datasetSelectionStore',
    () => {
        const cellMetaData = useCellMetaData();
        const entryPointFilename = '/aa_index.json';

        const serverUrlValid = ref(true);
        const fetchingEntryFile = ref(false);
        const fetchingTabularData = ref(false);
        const errorMessage = ref('default error message');
        let controller: AbortController;

        const experimentFilenameList = ref<string[]>([]);
        const currentExperimentFilename = ref<string | null>(null);
        const currentExperimentMetadata = ref<ExperimentMetadata | null>(null);
        const currentLocationMetadata = ref<LocationMetadata | null>(null); // todo - update to support multi-location

        const serverUrl = useStorage<string | null>('serverUrl', null);
        if (serverUrl.value !== null && serverUrl.value !== '') {
            fetchEntryFile();
        }
        watch(serverUrl, async () => {
            fetchEntryFile();
        });

        async function fetchEntryFile(): Promise<void> {
            console.log('data url change');
            console.log({ url: serverUrl.value });
            const fullURL = 'http://' + serverUrl.value + entryPointFilename;
            if (controller) {
                console.log('abort called');
                controller.abort('stale request'); // cancel last fetch if it's still trying
            }
            controller = new AbortController();
            fetchingEntryFile.value = true;
            const response = await fetch(fullURL, {
                signal: controller.signal, // link controller so can cancel if need to
            }).catch((error: Error) => {
                handleFetchEntryError(
                    `Could not access ${fullURL}. "${error.message}"`
                );
            });
            if (response == null) return;
            if (!response.ok) {
                handleFetchEntryError(
                    `Server Error. "${response.status}: ${response.statusText}"`
                );
                return;
            }
            fetchingEntryFile.value = false;
            serverUrlValid.value = true;
            console.log({ response });
            const data = await response.json();
            console.log({ data });
            experimentFilenameList.value = data.experiments;
        }

        function handleFetchEntryError(message: string): void {
            // console.log('ERROR', errorMessage);
            errorMessage.value = message;
            serverUrlValid.value = false;
            fetchingEntryFile.value = false;
        }

        watch(currentExperimentFilename, async () => {
            fetchCurrentExperimentFile();
        });

        async function fetchCurrentExperimentFile(): Promise<void> {
            console.log('experiment change');
            console.log({ file: currentExperimentFilename.value });
            const fullURL =
                'http://' +
                serverUrl.value +
                '/' +
                currentExperimentFilename.value;
            // if (controller) {
            //     console.log('abort called');
            //     controller.abort('stale request'); // cancel last fetch if it's still trying
            // }
            // controller = new AbortController();
            // fetchingEntryFile.value = true;
            const response = await fetch(fullURL, {
                // signal: controller.signal, // link controller so can cancel if need to
            });
            // .catch((error: Error) => {
            //     handleFetchExperimentError(
            //         `Could not access ${fullURL}. "${error.message}"`
            //     );
            // });
            // if (response == null) return;
            // if (!response.ok) {
            //     handleFetchExperimentError(
            //         `Server Error. "${response.status}: ${response.statusText}"`
            //     );
            //     return;
            // }
            // fetchingEntryFile.value = false;
            // serverUrlValid.value = true;
            console.log({ response });
            const data = await response.json();
            console.log({ data });
            currentExperimentMetadata.value = data;
        }

        function selectImagingLocation(location: LocationMetadata): void {
            if (currentExperimentMetadata.value == null) return;
            currentLocationMetadata.value = location;
            for (const loc of currentExperimentMetadata.value
                .locationMetadataList) {
                loc.show = false;
            }
            // location.show = true;
            currentLocationMetadata.value.show = true;
        }

        watch(currentLocationMetadata, () => {
            const url =
                'http://' +
                serverUrl.value +
                '/' +
                currentLocationMetadata.value?.tabularDataFilename;
            console.log(url);
            // this will probably break if you spam the data selections
            // could just add a spinner and call it a day 🤷
            fetchingTabularData.value = true;
            parse(url, {
                header: true,
                dynamicTyping: true,
                skipEmptyLines: true,
                download: true,
                worker: true,
                complete: (results: ParseResult<AnyAttributes>, file) => {
                    cellMetaData.init(
                        results.data,
                        results.meta.fields as string[]
                    );
                    console.log({ results, file });
                    fetchingTabularData.value = false;
                },
            });
        });

        // function handleFetchExperimentError(message: string): void {
        //     // console.log('ERROR', errorMessage);
        //     errorMessage.value = message;
        //     serverUrlValid.value = false;
        //     fetchingEntryFile.value = false;
        // }

        return {
            serverUrl,
            serverUrlValid,
            errorMessage,
            fetchingEntryFile,
            entryPointFilename,
            experimentFilenameList,
            currentExperimentFilename,
            currentExperimentMetadata,
            fetchingTabularData,
            fetchEntryFile,
            selectImagingLocation,
        };
    }
);
