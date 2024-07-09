import { ref, computed } from 'vue';
import { defineStore } from 'pinia';
import {
    createLoonAxiosInstance,
    type ProcessResponseData,
    type StatusResponseData,
    type CreateExperimentResponseData,
} from '@/util/axios';

import type { ProgressRecord } from '@/components/upload/LoadingProgress.vue';

export interface LocationFiles {
    locationId: string;
    table: FileToUpload;
    images: FileToUpload;
    segmentations: FileToUpload;
}

export interface FileToUpload {
    file: File | null;
    checkForUpdates?: boolean;
    uploading: 0 | 1 | 2 | 3 | -1;
    processing: 0 | 1 | 2 | 3 | -1;
    processedData?: Record<string, any>;
}

export interface LocationConfig {
    id: string;
    tabularDataFilename: string;
    imageDataFilename: string;
    segmentationsFolder: string;
}

export interface OverallProgress {
    status: -1 | 0 | 1 | 2; // Failed, not started, running, succeeded
    message?: string;
}

export interface WorkflowConfiguration {
    code: string;
    skip_lines: number;
}

type FileType = 'metadata' | 'cell_images' | 'segmentations';

const initialState = () => ({
    currentWorkflowConfig: ref<WorkflowConfiguration>({
        code: 'live_cyte',
        skip_lines: 1,
    }),
    experimentName: ref<string>(''),
    overallProgress: ref<OverallProgress>({
        status: 1,
    }),
    experimentCreated: ref(false),
    columnMappings: ref<Record<string, string> | null>(null),
    columnNames: ref<string[]>([]),
    step: ref<string>('metadata'),
    locationFileList: ref<LocationFiles[]>([
        {
            locationId: '1',
            table: {
                file: null,
                checkForUpdates: true,
                uploading: 0,
                processing: 0,
            },
            images: {
                file: null,
                checkForUpdates: true,
                uploading: 0,
                processing: 0,
            },
            segmentations: {
                file: null,
                checkForUpdates: true,
                uploading: 0,
                processing: 0,
            },
        },
    ]),
});

export const useUploadStore = defineStore('uploadStore', () => {
    // const currBaseUrl = window.location.origin;
    const loonAxios = createLoonAxiosInstance({
        baseURL: `${window.location.origin}/api`,
    });

    const {
        currentWorkflowConfig,
        experimentName,
        locationFileList,
        overallProgress,
        experimentCreated,
        columnMappings,
        columnNames,
        step,
    } = initialState();

    function resetState(): void {
        const newState = initialState();
        currentWorkflowConfig.value = newState.currentWorkflowConfig.value;
        currentWorkflowConfig.value = newState.currentWorkflowConfig.value;
        experimentName.value = newState.experimentName.value;
        locationFileList.value = newState.locationFileList.value;
        overallProgress.value = newState.overallProgress.value;
        experimentCreated.value = newState.experimentCreated.value;
        columnMappings.value = newState.columnMappings.value;
        columnNames.value = newState.columnNames.value;
        step.value = newState.step.value;
    }

    function validExperimentName(): boolean {
        // TODO: this should maybe check if the name is already used?
        return experimentName.value.length > 0;
    }

    const experimentConfig = computed<LocationConfig[] | null>(() => {
        // Computes all values once all is processed. If any remain to be processed, return null instead.

        const locationConfig: LocationConfig[] = [];
        for (let i = 0; i < locationFileList.value.length; i++) {
            const locationFiles = locationFileList.value[i];
            if (
                locationFiles.images.processedData &&
                locationFiles.segmentations.processedData &&
                locationFiles.table.processedData
            ) {
                const imageDataFilename = `${locationFiles.images.processedData.base_file_location}${locationFiles.images.processedData.companion_ome}`;
                const segmentationsFolder =
                    `${locationFiles.segmentations.processedData.base_file_location}`.replace(
                        /\/$/,
                        ''
                    );
                const tabularDataFilename = `${
                    locationFiles.table.processedData.base_file_location
                }${locationFiles.table.file!.name}`;
                locationConfig.push({
                    id: locationFiles.locationId,
                    tabularDataFilename,
                    imageDataFilename,
                    segmentationsFolder,
                });
            } else {
                return null;
            }
        }
        return locationConfig;
    });

    function _listsAreIdentical(arr1: string[], arr2: string[]): boolean {
        if (arr1.length !== arr2.length) return false;
        for (let i = 0; i < arr1.length; i++) {
            if (arr1[i] !== arr2[i]) return false;
        }
        return true;
    }

    const experimentHeaders = computed<string[] | null>(() => {
        let prevHeaders: string[] | null = null;
        locationFileList.value.forEach((locationFile: LocationFiles) => {
            if (locationFile.table.processedData) {
                const currHeaders = locationFile.table.processedData.headers;
                if (prevHeaders) {
                    if (!_listsAreIdentical(currHeaders, prevHeaders)) {
                        return null;
                    }
                } else {
                    prevHeaders = currHeaders;
                }
            }
        });
        return prevHeaders;
    });

    const numberOfLocations = computed<number>(() => {
        return locationFileList.value.length;
    });

    function addLocation() {
        locationFileList.value.push({
            locationId: (locationFileList.value.length + 1).toString(),
            table: {
                file: null,
                checkForUpdates: true,
                uploading: 0,
                processing: 0,
            },
            images: {
                file: null,
                checkForUpdates: true,
                uploading: 0,
                processing: 0,
            },
            segmentations: {
                file: null,
                checkForUpdates: true,
                uploading: 0,
                processing: 0,
            },
        });
    }

    function removeLocation(index: number) {
        locationFileList.value.splice(index, 1);
    }

    function allFilesPopulated(): boolean {
        for (const locationFiles of locationFileList.value) {
            if (
                !locationFiles.table.file ||
                !locationFiles.images.file ||
                !locationFiles.segmentations.file
            ) {
                return false;
            }
        }
        return true;
    }

    function locationIdsUnique(): boolean {
        const locationIds = new Set<string>();
        for (const locationFiles of locationFileList.value) {
            if (locationIds.has(locationFiles.locationId)) {
                return false;
            }
            locationIds.add(locationFiles.locationId);
        }
        return true;
    }

    // Function to upload all necessary files in experiment.
    async function uploadAll() {
        experimentCreated.value = true;
        for (let i = 0; i < locationFileList.value.length; i++) {
            const locationFiles = locationFileList.value[i];
            uploadFile(locationFiles.table, i, 'metadata');
            uploadFile(locationFiles.images, i, 'cell_images');
            uploadFile(locationFiles.segmentations, i, 'segmentations');
        }
    }

    async function uploadFile(
        fileToUpload: FileToUpload,
        locationIndex: number,
        fileType: FileType
    ) {
        if (fileToUpload && fileToUpload.file && experimentName.value) {
            fileToUpload.uploading = 2;
            fileToUpload.processing = 0;

            try {
                const fieldValue = await loonAxios.upload(fileToUpload.file);

                fileToUpload.uploading = 3;
                fileToUpload.processing = 1;

                try {
                    const processResponse = await loonAxios.process(
                        fieldValue,
                        'live_cyte',
                        fileType,
                        fileToUpload.file.name,
                        locationIndex.toString(),
                        experimentName.value
                    );

                    const processResponseData: ProcessResponseData =
                        processResponse.data;
                    if (processResponseData.task_id) {
                        checkForUpdates(
                            processResponseData.task_id,
                            fileToUpload
                        );
                    }
                } catch (error) {
                    console.warn(
                        'There was an error with the processing endpoint'
                    );
                    fileToUpload.processing = -1;
                }
            } catch (error) {
                console.warn('There was an error uploading the file.');
                fileToUpload.uploading = -1;
                fileToUpload.processing = 0;
            }
        }
    }

    // Asynchronous function to continuously check for processing status
    // async function checkForUpdates(task_id: string, fileKey: string) {
    async function checkForUpdates(
        task_id: string,
        uploadingFile: FileToUpload
    ) {
        try {
            let updatesAvailable = false;
            while (!updatesAvailable) {
                // Make a request to your server to check for updates
                const response = await loonAxios.checkForUpdates(task_id);
                const responseData = response.data as StatusResponseData;
                if (responseData.status === 'SUCCEEDED') {
                    updatesAvailable = true;
                    if (responseData.data) {
                        uploadingFile.processedData = responseData.data;
                    }
                    if (experimentConfig && experimentHeaders) {
                        const submitExperimentResponse: CreateExperimentResponseData =
                            await onSubmitExperiment();
                        if (submitExperimentResponse.status === 'SUCCESS') {
                            overallProgress.value.status = 2;
                            overallProgress.value.message = 'Succeeded.';
                        } else {
                            overallProgress.value.status = -1;
                            overallProgress.value.message =
                                'There was an error submitting this experiment.';
                        }
                    }
                } else if (
                    responseData.status === 'FAILED' ||
                    responseData.status === 'ERROR'
                ) {
                    // show error/failure message
                    updatesAvailable = true;
                } else if (responseData.status === 'RUNNING') {
                    // show running symbol like it normally does
                    uploadingFile.processing = 2;
                    await new Promise((resolve) => setTimeout(resolve, 5000));
                } else {
                    // show queued symbol
                    await new Promise((resolve) => setTimeout(resolve, 5000));
                }
            }
            uploadingFile.processing = 3;
        } catch (error) {
            console.error('Error checking for updates:', error);
            uploadingFile.processing = -1;
        }
    }

    const progressStatusList = computed(() => {
        const tableListIndex = 0;
        const imageListIndex = 1;
        const segmentationListIndex = 2;
        const keyList = ['Table', 'Images', 'Segmentations'];
        const progressResult: ProgressRecord[] = keyList.map((key) => {
            return {
                label: 'Uploading and Processing ' + key,
                progress: 0,
                subProgress: [],
            };
        });
        for (let i = 0; i < numberOfLocations.value; i++) {
            const locationFiles = locationFileList.value[i];
            addToSubProgressList(
                progressResult[tableListIndex].subProgress!,
                locationFiles.table,
                locationFiles.locationId
            );
            addToSubProgressList(
                progressResult[imageListIndex].subProgress!,
                locationFiles.images,
                locationFiles.locationId
            );
            addToSubProgressList(
                progressResult[segmentationListIndex].subProgress!,
                locationFiles.segmentations,
                locationFiles.locationId
            );
        }

        return progressResult;
    });

    function addToSubProgressList(
        subProgressList: ProgressRecord[],
        uploadingFile: FileToUpload,
        locationId: string
    ) {
        subProgressList.push({
            label: 'Uploading ' + locationId,
            progress: uploadingFile.uploading,
        });
        if (uploadingFile.checkForUpdates) {
            subProgressList.push({
                label: 'Processing ' + locationId,
                progress: uploadingFile.processing,
            });
        }
    }

    async function onSubmitExperiment(): Promise<CreateExperimentResponseData> {
        if (experimentName.value && experimentConfig.value) {
            const submitExperimentResponse = await loonAxios.createExperiment(
                experimentName.value,
                experimentConfig.value,
                experimentHeaders.value,
                columnMappings.value
            );

            const submitExperimentResponseData: CreateExperimentResponseData =
                submitExperimentResponse.data;

            return submitExperimentResponseData;
        }
        return { status: 'failed', message: 'No experiment name given.' };
    }

    function allColumnsMapped(): boolean {
        if (!columnMappings.value) {
            return false;
        }
        for (const key of specialHeaders) {
            if (!columnMappings.value[key]) {
                return false;
            }
        }
        return true;
    }

    const specialHeaders: string[] = [
        'frame',
        'time',
        'id',
        'parent',
        'mass',
        'x',
        'y',
    ];

    async function populateDefaultColumnMappings() {
        if (columnMappings.value) {
            // if it's already populated don't set the defaults
            return;
        }
        if (locationFileList.value.length == 0) {
            // if there are no files are selectted don't populate
            return;
        }
        const firstCsvFile = locationFileList.value[0].table.file;
        if (!firstCsvFile) {
            // if the first file dones't exist don't populate
            return;
        }
        const reader = firstCsvFile.stream().getReader();
        const decoder = new TextDecoder('utf-8');
        let { value: chunk, done: readerDone } = await reader.read();
        let text = '';
        let firstLine = '';

        while (!readerDone) {
            text += decoder.decode(chunk, { stream: true });
            const lines = text.split('\n');
            if (lines.length > 1) {
                let headerIndex = currentWorkflowConfig.value.skip_lines;
                firstLine = lines[headerIndex];
                break;
            }
            ({ value: chunk, done: readerDone } = await reader.read());
        }
        columnNames.value = firstLine.split(',');
        columnMappings.value = {};
        for (const name of specialHeaders) {
            columnMappings.value[name] = getReasonableDefault(
                name,
                columnNames.value
            );
        }
    }

    function getReasonableDefault(
        header: string,
        columnNames: string[]
    ): string {
        // First check for an exact match.
        if (columnNames.includes(header)) {
            return header;
        }

        // If no exact match, check for a case-insensitive match.
        const lowerHeader = header.toLowerCase();
        for (const name of columnNames) {
            if (name.toLowerCase() === lowerHeader) {
                return name;
            }
        }

        // If no exact match, check if a word in the column name matches the header.
        for (const name of columnNames) {
            const columnWords = name.split(' ');
            for (const word of columnWords) {
                if (word.toLowerCase() === lowerHeader) {
                    return name;
                }
            }
        }

        // Otherwise, return ''
        return '';
    }

    return {
        experimentCreated,
        experimentName,
        validExperimentName,
        numberOfLocations,
        locationFileList,
        allFilesPopulated,
        locationIdsUnique,
        addLocation,
        removeLocation,
        uploadAll,
        progressStatusList,
        onSubmitExperiment,
        experimentConfig,
        experimentHeaders,
        overallProgress,
        allColumnsMapped,
        columnMappings,
        populateDefaultColumnMappings,
        columnNames,
        resetState,
        step,
    };
});
