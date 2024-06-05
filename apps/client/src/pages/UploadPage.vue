<script lang="ts" setup>
import { ref, computed, watch, onMounted } from 'vue';
import LoadingProgress, { type ProgressRecord } from './LoadingProgress.vue';
import type { QStepper } from 'quasar';

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

interface UploadResponseData {
    status: "SUCCEEDED" | "FAILED";
    unique_file_name: string;
    message: string;
}

interface StatusResponseData {
    status: "QUEUED" | "RUNNING" | "SUCCEEDED" | "FAILED" | "ERROR";
    message: string;
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
const experimentName = ref<string | null>(null);
const numberOfLocations = ref<number | null>(null);
const experimentCreated = ref<boolean>(false);
const experimentSettings = ref<Record<string, LocationSettings>>({
    location_1: {
        id: '',
        dataFrameFileName: '',
        imageDataFileName: '',
        segmentationsFolder: '',
    },
});
// Creates a range to iterate over in the
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

// Function to upload all necessary files in experiment.
const uploadAll = async () => {
    // Set experiment created vue.
    experimentCreated.value = true;
    // Sorting Files in desired order.
    const fileKeys = Object.keys(fileModel.value);

    const orderMap: { [key: string]: number } = {
        metadata: 1,
        cell: 2,
        segmentations: 3,
    };

    fileKeys.sort((a: string, b: string) => {
        const labelA = a.split('_')[2];
        const labelB = b.split('_')[2];

        return orderMap[labelA] - orderMap[labelB];
    });

    for (let i = 0; i < fileKeys.length; i++) {
        const fileLabel = fileKeys[i];
        const fileOptions = fileModel.value[fileKeys[i]];
        // Upload file
        if (fileOptions && fileOptions.file) {
            const data: UploadResponseData | null = await uploadFile(
                fileOptions,
                fileLabel
            );
            if (fileOptions.checkForUpdates && data) {
                checkForUpdates(data.unique_file_name, fileLabel);
            }
        }
    }
};

// Function to being upload
const uploadFile = async (fileOptions: FileOptions, label: string) => {
    if (fileOptions.file) {
        fileOptions.uploading = 2;
        fileOptions.processing = 0;

        const formData = new FormData();
        formData.append('file', fileOptions.file);

        const additionalData = {
            file_name: fileOptions.file.name,
            label: label,
            location: label.split('_')[1],
            experiment_name: experimentName.value,
            workflow_code: 'live_cyte',
            file_type: fileOptions.file_type,
        };

        const jsonString = JSON.stringify(additionalData);

        formData.append('metadata', jsonString);

        try {
            const response = await fetch('http://localhost:8000/upload/', {
                method: 'POST',
                body: formData,
            });
            if (response.ok) {
                const responseData = await response.json();
                fileOptions.uploading = 3;
                fileOptions.processing = 1;
                return responseData;
            } else {
                throw new Error('Failed to upload file.');
            }
        } catch (error) {
            console.error('Error uploading file: ', error);
        }
    }
};
// Asynchronous function to continuously check for processing status
const checkForUpdates = async (uniqueFileName: string, fileLabel: string) => {
    try {
        let updatesAvailable = false;
        while (!updatesAvailable) {
            // Make a request to your server to check for updates
            const response = await fetch(
                'http://localhost:8000/upload/' + uniqueFileName
            );

            if (!response.ok) {
                throw new Error('Failed to fetch updates');
            }

            const data: StatusResponseData = await response.json();
            console.log(data)
            if (data.status === "SUCCEEDED") {
                updatesAvailable = true;
            } else if (data.status === "FAILED" || data.status === "ERROR"){
                // show error/failure message
                updatesAvailable = true;
            } else if (data.status === "RUNNING") {
                // show running symbol like it normally does
                fileModel.value[fileLabel].processing = 2;
                await new Promise((resolve) => setTimeout(resolve, 5000));
            } else {
                // show queued symbol
                await new Promise((resolve) => setTimeout(resolve, 5000));
            }
        }
        fileModel.value[fileLabel].processing = 3;
    } catch (error) {
        console.error('Error checking for updates:', error);
    }
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
                    <span class="step-title"> Create Your Experiment </span>
                    <div class="column" style="row-gap: 20px; margin-top: 30px">
                        <q-input
                            v-model="experimentName"
                            outlined
                            style="width: 500px"
                            label-slot
                            :rules="[(val) => !!val || 'Field is required']"
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
                            style="width: 500px"
                            label-slot
                            :rules="[
                                (val) => !!val || 'Field is required',
                                (val) =>
                                    !isNaN(parseInt(val)) ||
                                    'Please enter in a valid number.',
                            ]"
                            hint="Number of locations to add."
                        >
                            <template v-slot:label>
                                <span class="upload-label"
                                    >Number of Locations</span
                                >
                            </template>
                        </q-input>
                    </div>
                </q-step>

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
                        <span class="step-title q-pa-sm" style="border-bottom: 1px solid #dcdcdc"
                            >Review Experiment</span
                        >
                        <span class="q-pa-sm" style="padding-top:20px"
                            ><span class="text-weight-bold"
                                >Experiment Name: </span
                            ><span style="font-style: italic">{{
                                experimentName
                            }}</span></span
                        >
                        <span class="q-pa-sm" style="padding-bottom:20px;border-bottom: 1px solid #dcdcdc"
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
                            <div class="column" style="padding-bottom:20px;border-bottom: 1px solid #dcdcdc">
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
                    <div class="row">
                        <q-btn color="danger" flat label="Cancel" no-caps />
                        <q-btn color="primary" label="Finish" no-caps />
                    </div>
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
                    <span
                        class="step-title q-pa-sm"
                        style="font-size: 1.5em; margin-bottom: 20px"
                    >
                        Experiment Settings</span
                    >
                    <q-form>
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
                                    class="col-4 col-md-6 q-pa-sm"
                                    bottom-slots
                                    style="padding-bottom: 30px"
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
                                    class="col-4 col-md-6 q-pa-sm"
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
                                    class="col-4 col-md-6 q-pa-sm"
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
                                    class="col-4 col-md-6 q-pa-sm"
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
