<script lang="ts" setup>
import { ref, computed, watch, onMounted } from 'vue';
import LoadingProgress, {
    type ProgressRecord,
} from '@/components/upload/LoadingProgress.vue';
import StepExperimentMetadata from '@/components/upload/StepExperimentMetadata.vue';
// import StepFileSelection from '@/components/upload/StepFileSelection.vue';
import type { QForm, QStepper } from 'quasar';
import {
    createLoonAxiosInstance,
    type ProcessResponseData,
    type StatusResponseData,
} from '@/util/axios';

// Processing codes: not submitted, queued, running, finished
interface FileOptions {
    file: File | null;
    checkForUpdates?: boolean;
    uploading: 0 | 1 | 2 | 3;
    processing: 0 | 1 | 2 | 3;
    file_type: string;
}

interface LocationSettings {
    id: string;
    dataFrameFileName: string;
    imageDataFileName: string;
    segmentationsFolder: string;
}

const handleSuggestedClick = (
    locationNumber: number,
    label: string,
    input: string
) => {
    if (
        label == 'id' ||
        label == 'dataFrameFileName' ||
        label === 'imageDataFileName' ||
        label === 'segmentationsFolder'
    ) {
        experimentSettings.value[`location_${locationNumber}`][label] = input;
    }
};
const step = ref(1);
const experimentName = ref<string>('');
const numberOfLocations = ref<number>(1);
const experimentCreated = ref<boolean>(false);
const experimentSettings = ref<Record<string, LocationSettings>>({
    location_1: {
        id: '',
        dataFrameFileName: '',
        imageDataFileName: '',
        segmentationsFolder: '',
    },
});

const onSubmitExperiment = async () => {
    const formData = new FormData();

    // Create Form
    if (experimentName && experimentName.value) {
        formData.append('experimentName', experimentName.value);
        formData.append(
            'experimentSettings',
            JSON.stringify(experimentSettings.value)
        );
    }

    try {
        const response = await fetch(`${currBaseUrl}/api/createExperiment/`, {
            method: 'POST',
            body: formData,
        });
        if (response.ok) {
            const responseData = await response.json();
            return responseData;
        } else {
            throw new Error('Failed to finish experiment');
        }
    } catch (error) {
        console.error('Error finishing experiment: ', error);
    }
};

// Creates a range to iterate over
const createRange = (n: number | null, label: string) => {
    if (n) {
        let result: string[] = [];
        for (let i = 0; i < n; i++) {
            let curr = `location_${i + 1}_${label}`;
            result.push(curr);
        }
        return result;
    }
    return [];
};

// Function called when picking a file.
const updateFile = (
    file: File,
    item: string,
    checkForUpdates: boolean,
    file_type: string
) => {
    if (fileModel.value[item]) {
        fileModel.value[item].file = file;
    } else {
        fileModel.value[item] = {
            file: file,
            uploading: 0,
            processing: 0,
            checkForUpdates,
            file_type,
        };
    }
};
const fileModel = ref<Record<string, FileOptions>>({
    location_1_metadata: {
        file: null,
        uploading: 0,
        processing: 0,
        file_type: 'metadata',
    },
    location_1_cell_images: {
        file: null,
        checkForUpdates: true,
        uploading: 0,
        processing: 0,
        file_type: 'cell_images',
    },
    location_1_segmentations: {
        file: null,
        checkForUpdates: true,
        uploading: 0,
        processing: 0,
        file_type: 'segmentations',
    },
});

// Updates the fileModel dependent on the number chosen (adds or removes template fileModel entries.)
const handleUpdateNumLocations = (s: QStepper) => {
    let currLength = Object.keys(fileModel.value).length / 3;
    if (numberOfLocations?.value && currLength < numberOfLocations.value) {
        let newLength = numberOfLocations.value;
        for (let i = currLength; i <= newLength; i++) {
            fileModel.value[`location_${i}_metadata`] = {
                file: null,
                uploading: 0,
                processing: 0,
                file_type: 'metadata',
            };
            fileModel.value[`location_${i}_cell_images`] = {
                file: null,
                checkForUpdates: true,
                uploading: 0,
                processing: 0,
                file_type: 'cell_images',
            };
            fileModel.value[`location_${i}_segmentations`] = {
                file: null,
                checkForUpdates: true,
                uploading: 0,
                processing: 0,
                file_type: 'segmentations',
            };
            experimentSettings.value[`location_${i}`] = {
                id: '',
                dataFrameFileName: '',
                imageDataFileName: '',
                segmentationsFolder: '',
            };
        }
    } else if (
        numberOfLocations?.value &&
        currLength > numberOfLocations.value
    ) {
        let newLength = numberOfLocations.value;
        for (let i = newLength; i < currLength; i++) {
            delete fileModel.value[`location_${i + 1}_metadata`];
            delete fileModel.value[`location_${i + 1}_cell_images`];
            delete fileModel.value[`location_${i + 1}_segmentations`];
            delete experimentSettings.value[`location_${i + 1}`];
        }
    }
    s.next();
};

// Function to determine if the create experiment button should be enabled.
const disableUpload = () => {
    return !(stepDone(1) && stepDone(2) && stepDone(3) && stepDone(4));
};
// Function to determine if a step has been completed.
const stepDone = (inputStep: number) => {
    switch (inputStep) {
        case 1:
            return step.value > 1;
        case 2:
            if (numberOfLocations.value) {
                for (let i = 0; i < numberOfLocations.value; i++) {
                    if (
                        !(
                            fileModel.value[`location_${i + 1}_metadata`] &&
                            fileModel.value[`location_${i + 1}_metadata`].file
                        )
                    ) {
                        return false;
                    }
                }
                return true;
            }
            return false;
        case 3:
            if (numberOfLocations.value) {
                for (let i = 0; i < numberOfLocations.value; i++) {
                    if (
                        !(
                            fileModel.value[`location_${i + 1}_cell_images`] &&
                            fileModel.value[`location_${i + 1}_cell_images`]
                                .file
                        )
                    ) {
                        return false;
                    }
                }
                return true;
            }
            return false;
        case 4:
            if (numberOfLocations.value) {
                for (let i = 0; i < numberOfLocations.value; i++) {
                    if (
                        !(
                            fileModel.value[
                                `location_${i + 1}_segmentations`
                            ] &&
                            fileModel.value[`location_${i + 1}_segmentations`]
                                .file
                        )
                    ) {
                        return false;
                    }
                }
                return true;
            }
            return false;
        default:
            return true;
    }
};

// Generates the list to add to the LoadingProgress Component
const getProgressStatusList = () => {
    let progressResult: ProgressRecord[] = [];

    let key_list = ['metadata', 'cell_images', 'segmentations'];
    if (numberOfLocations.value) {
        for (let i = 0; i < key_list.length; i++) {
            let currItems = Object.keys(fileModel.value).filter(
                (entry: string) => {
                    return entry.includes(key_list[i]);
                }
            );
            let currSubProgress: ProgressRecord[] = [];
            for (let j = 0; j < numberOfLocations.value; j++) {
                let currKey = `location_${j + 1}_${key_list[i]}`;
                if (currItems.includes(currKey)) {
                    currSubProgress.push({
                        label:
                            'Uploading ' +
                            currKey
                                .replace(/_/g, ' ')
                                .replace(/\b\w/g, (char: string) =>
                                    char.toUpperCase()
                                ),
                        progress:
                            fileModel.value[currKey] &&
                            fileModel.value[currKey].uploading,
                    });
                    if (fileModel.value[currKey].checkForUpdates) {
                        currSubProgress.push({
                            label:
                                'Processing ' +
                                currKey
                                    .replace(/_/g, ' ')
                                    .replace(/\b\w/g, (char: string) =>
                                        char.toUpperCase()
                                    ),
                            progress:
                                fileModel.value[currKey] &&
                                fileModel.value[currKey].processing,
                        });
                    }
                }
            }
            progressResult.push({
                label: `Uploading and Processing ${key_list[i]}`,
                progress: 0,
                subProgress: currSubProgress,
            });
        }
    }
    return progressResult;
};

const currBaseUrl = window.location.origin;

const loonAxios = createLoonAxiosInstance({
    baseURL: `${currBaseUrl}/api`,
});
console.log('loonAxios', loonAxios);

// Function to upload all necessary files in experiment.
const uploadAll = async () => {
    // Set experiment created vue.
    experimentCreated.value = true;
    // Sorting Files in desired order.
    const fileKeys = Object.keys(fileModel.value);

    for (let i = 0; i < fileKeys.length; i++) {
        const fileKey = fileKeys[i];
        const fileOptions = fileModel.value[fileKey];

        if (fileOptions && fileOptions.file && experimentName.value) {
            fileOptions.uploading = 2;
            fileOptions.processing = 0;

            const fieldValue = await loonAxios.upload(fileOptions.file);

            fileOptions.uploading = 3;
            fileOptions.processing = 1;

            const location = fileKey.split('_')[1];

            const processResponse = await loonAxios.process(
                fieldValue,
                'live_cyte',
                fileOptions.file_type,
                fileOptions.file.name,
                location,
                experimentName.value
            );

            const processResponseData: ProcessResponseData =
                processResponse.data;
            if (processResponseData.task_id) {
                checkForUpdates(processResponseData.task_id, fileKey);
            }
        }
    }
};

// Asynchronous function to continuously check for processing status
const checkForUpdates = async (task_id: string, fileKey: string) => {
    try {
        let updatesAvailable = false;
        while (!updatesAvailable) {
            // Make a request to your server to check for updates
            const response = await loonAxios.checkForUpdates(task_id);
            const responseData = response.data as StatusResponseData;

            if (responseData.status === 'SUCCEEDED') {
                updatesAvailable = true;
            } else if (
                responseData.status === 'FAILED' ||
                responseData.status === 'ERROR'
            ) {
                // show error/failure message
                updatesAvailable = true;
            } else if (responseData.status === 'RUNNING') {
                // show running symbol like it normally does
                fileModel.value[fileKey].processing = 2;
                await new Promise((resolve) => setTimeout(resolve, 5000));
            } else {
                // show queued symbol
                await new Promise((resolve) => setTimeout(resolve, 5000));
            }
        }
        fileModel.value[fileKey].processing = 3;
    } catch (error) {
        console.error('Error checking for updates:', error);
    }
};
</script>
<template>
    <q-page class="q-pa-lg q-gutter-md" style="max-width: 1200px; margin: auto">
        <template v-if="!experimentCreated">
            <q-stepper
                v-model="step"
                ref="stepper"
                color="primary"
                animated
                keep-alive
                header-nav
            >
                <q-step
                    :name="1"
                    title="Create New Experiment"
                    icon="settings"
                    :done="stepDone(1)"
                    done-color="green"
                    ref="step1"
                >
                    <StepExperimentMetadata
                        v-model:experimentName="experimentName"
                        v-model:numberOfLocations="numberOfLocations"
                    />
                </q-step>
                <!-- <q-step
                    :name="42"
                    title="Select Files"
                    icon="settings"
                    :done="stepDone(2)"
                    done-color="green"
                    ref="step2"
                >
                    <StepFileSelection />
                </q-step> -->

                <q-step
                    :name="2"
                    title="Upload Cell Metadata"
                    icon="upload"
                    :done="stepDone(2)"
                    done-color="green"
                    ref="step3"
                >
                    <div class="column" style="margin-bottom: 50px">
                        <span class="step-title"
                            >Upload one CSV file for all CSV metadata.</span
                        >

                        <template
                            v-for="(item, n) in createRange(
                                numberOfLocations,
                                'metadata'
                            )"
                        >
                            <q-file
                                :model-value="fileModel[item]?.file"
                                @input="
                                    updateFile(
                                        $event.target.files[0],
                                        item,
                                        false,
                                        'metadata'
                                    )
                                "
                                label-slot
                                style="
                                    width: 500px;
                                    margin-top: 30px;
                                    margin-bottom: 30px;
                                "
                            >
                                <template v-slot:label>
                                    <span class="upload-label"
                                        >Location {{ n + 1 }} metadata</span
                                    >
                                </template>
                                <template v-slot:prepend>
                                    <q-icon
                                        name="close"
                                        @click.stop.prevent="
                                            fileModel[item].file = null
                                        "
                                        class="cursor-pointer"
                                    />
                                </template>
                            </q-file>
                        </template>
                    </div>
                </q-step>

                <q-step
                    :name="3"
                    title="Upload Cell Images"
                    icon="upload"
                    :done="stepDone(3)"
                    done-color="green"
                    ref="step3"
                >
                    <div class="column" style="margin-bottom: 50px">
                        <span class="step-title"
                            >Upload one zipped file of all cell images.</span
                        >
                        <template
                            v-for="(item, n) in createRange(
                                numberOfLocations,
                                'cell_images'
                            )"
                        >
                            <q-file
                                :model-value="fileModel[item]?.file"
                                @input="
                                    updateFile(
                                        $event.target.files[0],
                                        item,
                                        true,
                                        'cell_images'
                                    )
                                "
                                label="File"
                                style="
                                    width: 500px;
                                    margin-top: 30px;
                                    margin-bottom: 30px;
                                "
                            >
                                <template v-slot:label>
                                    <span class="upload-label"
                                        >Location {{ n + 1 }} Cell Images</span
                                    >
                                </template>
                                <template v-slot:prepend>
                                    <q-icon
                                        name="close"
                                        @click.stop.prevent="
                                            fileModel[item].file = null
                                        "
                                        class="cursor-pointer"
                                    />
                                </template>
                            </q-file>
                        </template>
                    </div>
                </q-step>

                <q-step
                    :name="4"
                    title="Upload Segmentations"
                    icon="upload"
                    :done="stepDone(4)"
                    done-color="green"
                    ref="step4"
                >
                    <div class="column" style="margin-bottom: 50px">
                        <span class="step-title"
                            >Upload one zipped file of all segmentations.</span
                        >
                        <template
                            v-for="(item, n) in createRange(
                                numberOfLocations,
                                'segmentations'
                            )"
                        >
                            <q-file
                                :model-value="fileModel[item]?.file"
                                @input="
                                    updateFile(
                                        $event.target.files[0],
                                        item,
                                        true,
                                        'segmentations'
                                    )
                                "
                                label="File"
                                style="
                                    width: 500px;
                                    margin-top: 30px;
                                    margin-bottom: 30px;
                                "
                            >
                                <template v-slot:label>
                                    <span class="upload-label"
                                        >Location
                                        {{ n + 1 }} Segmentations</span
                                    >
                                </template>
                                <template v-slot:prepend>
                                    <q-icon
                                        name="close"
                                        @click.stop.prevent="
                                            fileModel.segmentations.file = null
                                        "
                                        class="cursor-pointer"
                                    />
                                </template>
                            </q-file>
                        </template>
                    </div>
                </q-step>
                <q-step title="Review" :name="5" icon="settings">
                    <div class="column" style="margin-bottom: 50px">
                        <span
                            class="step-title q-pa-sm"
                            style="border-bottom: 1px solid #dcdcdc"
                            >Review Experiment</span
                        >
                        <span class="q-pa-sm" style="padding-top: 20px"
                            ><span class="text-weight-bold"
                                >Experiment Name: </span
                            ><span style="font-style: italic">{{
                                experimentName
                            }}</span></span
                        >
                        <span
                            class="q-pa-sm"
                            style="
                                padding-bottom: 20px;
                                border-bottom: 1px solid #dcdcdc;
                            "
                            ><span class="text-weight-bold"
                                >Number of Locations: </span
                            ><span style="font-style: italic">{{
                                numberOfLocations
                            }}</span></span
                        >
                        <template
                            v-for="(item, n) in createRange(
                                numberOfLocations,
                                'segmentations'
                            )"
                        >
                            <div
                                class="column"
                                style="
                                    padding-bottom: 20px;
                                    border-bottom: 1px solid #dcdcdc;
                                "
                            >
                                <span
                                    class="step-title q-pa-sm"
                                    style="font-size: 1.3em; margin-top: 20px"
                                    >Location {{ n + 1 }}</span
                                >
                                <span class="q-pa-sm"
                                    ><span class="text-weight-bold"
                                        >Data Frame CSV: </span
                                    ><span style="font-style: italic">{{
                                        fileModel[`location_${n + 1}_metadata`]
                                            .file?.name
                                    }}</span></span
                                >
                                <span class="q-pa-sm"
                                    ><span class="text-weight-bold"
                                        >Cell Images: </span
                                    ><span style="font-style: italic">{{
                                        fileModel[
                                            `location_${n + 1}_cell_images`
                                        ].file?.name
                                    }}</span></span
                                >
                                <span class="q-pa-sm"
                                    ><span class="text-weight-bold"
                                        >Segmentations: </span
                                    ><span style="font-style: italic">{{
                                        fileModel[
                                            `location_${n + 1}_segmentations`
                                        ].file?.name
                                    }}</span></span
                                >
                            </div>
                        </template>
                    </div>
                </q-step>

                <template v-slot:navigation>
                    <q-stepper-navigation
                        style="
                            display: flex;
                            align-items: center;
                            justify-content: flex-end;
                        "
                    >
                        <q-btn
                            v-if="step > 1"
                            flat
                            color="primary"
                            @click="($refs.stepper as any).previous()"
                            label="Back"
                            class="q-ml-sm"
                        />
                        <q-btn
                            @click="
                                step === 5
                                    ? uploadAll()
                                    : step === 1
                                    ? handleUpdateNumLocations(
                                          $refs.stepper as QStepper
                                      )
                                    : ($refs.stepper as any).next()
                            "
                            color="primary"
                            :label="
                                step === 5 ? 'Begin Processing' : 'Continue'
                            "
                            :disabled="step === 5 ? disableUpload() : false"
                        />
                    </q-stepper-navigation>
                </template>
            </q-stepper>
        </template>
        <template v-else>
            <div class="column">
                <div class="row" style="justify-content: space-between">
                    <span class="text-h4" style="font-weight: bold">
                        Finish Creating Your Experiment</span
                    >
                </div>
            </div>
            <div class="row q-pa-md" style="justify-content: space-between">
                <div
                    class="column"
                    style="flex: 0.65; border-right: 1px solid #dcdcdc"
                >
                    <span class="step-title q-pa-sm" style="font-size: 1.5em"
                        >Uploading and Processing Progress</span
                    >
                    <div class="q-pa-sm">
                        <div class="q-pa-sm">
                            <LoadingProgress
                                :progress-status="getProgressStatusList()"
                            />
                        </div>
                    </div>
                </div>
                <div class="column" style="flex: 1; margin-left: 30px">
                    <q-form @submit="onSubmitExperiment">
                        <div
                            class="row"
                            style="
                                justify-content: space-between;
                                margin-bottom: 20px;
                                align-items: center;
                            "
                        >
                            <span
                                class="step-title q-pa-sm"
                                style="font-size: 1.5em"
                            >
                                Experiment Settings</span
                            >
                            <div class="row" style="display: block">
                                <q-btn
                                    color="danger"
                                    flat
                                    label="Cancel"
                                    no-caps
                                />
                                <q-btn
                                    color="primary"
                                    label="Finish"
                                    no-caps
                                    type="submit"
                                />
                            </div>
                        </div>
                        <span class="step-title q-pa-sm">General</span>
                        <div class="row">
                            <q-input
                                v-model="experimentName"
                                outlined
                                label-slot
                                disable
                                class="col-4 col-md-6 q-pa-sm"
                            >
                                <template v-slot:label>
                                    <span class="upload-label"
                                        >Experiment Name</span
                                    >
                                </template>
                            </q-input>
                            <q-input
                                v-model="numberOfLocations"
                                outlined
                                label-slot
                                disable
                                class="col-4 col-md-6 q-pa-sm"
                            >
                                <template v-slot:label>
                                    <span class="upload-label"
                                        >Number Of Locations</span
                                    >
                                </template>
                            </q-input>
                        </div>
                        <template
                            v-for="(n, idx) in createRange(
                                numberOfLocations,
                                'metadata'
                            )"
                        >
                            <div class="column" style="margin-top: 30px">
                                <span class="step-title q-pa-sm"
                                    >Location {{ idx + 1 }}</span
                                >
                                <q-input
                                    v-model="
                                        experimentSettings[
                                            `location_${idx + 1}`
                                        ].id
                                    "
                                    outlined
                                    label-slot
                                    class="col-4 col-md-6 q-pa-md"
                                    bottom-slots
                                    style="padding-bottom: 30px"
                                    :rules="[
                                        (val) => !!val || 'Field is required',
                                    ]"
                                >
                                    <template v-slot:label>
                                        <span class="upload-label">ID</span>
                                    </template>
                                    <template v-slot:hint>
                                        <div>
                                            Suggested:
                                            <span
                                                class="suggested"
                                                @click="
                                                    handleSuggestedClick(
                                                        idx + 1,
                                                        'id',
                                                        `location_${idx + 1}`
                                                    )
                                                "
                                                >location_{{ idx + 1 }}</span
                                            >
                                        </div>
                                    </template>
                                </q-input>
                                <q-input
                                    v-model="
                                        experimentSettings[
                                            `location_${idx + 1}`
                                        ].dataFrameFileName
                                    "
                                    outlined
                                    label-slot
                                    class="col-4 col-md-6 q-pa-md"
                                    :rules="[
                                        (val) => !!val || 'Field is required',
                                    ]"
                                >
                                    <template v-slot:label>
                                        <span class="upload-label"
                                            >Data Frame File Name</span
                                        >
                                    </template>
                                </q-input>
                                <q-input
                                    v-model="
                                        experimentSettings[
                                            `location_${idx + 1}`
                                        ].imageDataFileName
                                    "
                                    outlined
                                    label-slot
                                    class="col-4 col-md-6 q-pa-md"
                                    :rules="[
                                        (val) => !!val || 'Field is required',
                                    ]"
                                >
                                    <template v-slot:label>
                                        <span class="upload-label"
                                            >Image Data File Name</span
                                        >
                                    </template>
                                </q-input>
                                <q-input
                                    v-model="
                                        experimentSettings[
                                            `location_${idx + 1}`
                                        ].segmentationsFolder
                                    "
                                    outlined
                                    label-slot
                                    class="col-4 col-md-6 q-pa-md"
                                    :rules="[
                                        (val) => !!val || 'Field is required',
                                    ]"
                                >
                                    <template v-slot:label>
                                        <span class="upload-label"
                                            >Segmentations Folder</span
                                        >
                                    </template>
                                </q-input>
                            </div>
                        </template>
                    </q-form>
                </div>
            </div>
        </template>
    </q-page>
</template>

<style scoped>
.upload-label {
    font-weight: bold;
}

.step-title {
    font-weight: bold;
    font-size: 1.2em;
}

.suggested {
    cursor: pointer;
    font-style: italic;
    font-weight: bold;
}

.suggested:hover {
    text-decoration: underline;
}
</style>
