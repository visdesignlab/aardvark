<script lang="ts" setup>
import { ref, computed, watch, onMounted } from 'vue';
import GlobalSettingsView from '@/components/globalSettings/GlobalSettingsView.vue';
import LoadingProgress, { type ProgressRecord } from './LoadingProgress.vue';
import type { QStepper } from 'quasar';
import { add } from 'lodash-es';

interface FileOptions {
    file: File | null;
    checkForUpdates?: boolean;
    uploading: 0 | 1 | 2;
    processing: 0 | 1 | 2;
    file_type:string;
}

const step = ref(1);
const experimentName = ref<string | null>(null);
const numberOfLocations = ref<number | null>(null);
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
const updateFile = (file: File, item: string, checkForUpdates: boolean,file_type:string) => {
    if (fileModel.value[item]) {
        fileModel.value[item].file = file;
    } else {
        fileModel.value[item] = {
            file: file,
            uploading: 0,
            processing: 0,
            checkForUpdates,
            file_type
        };
    }
};
const fileModel = ref<Record<string, FileOptions>>({
    location_1_metadata: {
        file: null,
        uploading: 0,
        processing: 0,
        file_type:'metadata'
    },
    location_1_cell_images: {
        file: null,
        checkForUpdates: true,
        uploading: 0,
        processing: 0,
        file_type:'cell_images'
    },
    location_1_segmentations: {
        file: null,
        checkForUpdates: true,
        uploading: 0,
        processing: 0,
        file_type:'segmentations'
    },
});
const handleUpdateFileModel = (s:QStepper) => {
    let currLength = (Object.keys(fileModel.value).length/3);
    console.log(currLength);
    console.log(numberOfLocations.value)
    if(numberOfLocations?.value && currLength < numberOfLocations.value){
        let newLength = numberOfLocations.value;
        for(let i = currLength; i <= newLength; i++ ){
            fileModel.value[`location_${i}_metadata`] = {
                file:null,
                uploading:0,
                processing:0,
                file_type:'metadata'

            }
            fileModel.value[`location_${i}_cell_images`] = {
                file:null,
                checkForUpdates:true,
                uploading:0,
                processing:0,
                file_type:'cell_images'


            }            
            fileModel.value[`location_${i}_segmentations`] = {
                file:null,
                checkForUpdates:true,
                uploading:0,
                processing:0,
                file_type:'segmentations'


            }
        }
    } else if (numberOfLocations?.value && currLength > numberOfLocations.value){
        let newLength = numberOfLocations.value;
        for(let i = newLength; i < currLength; i++){
            delete fileModel.value[`location_${i+1}_metadata`]
            delete fileModel.value[`location_${i+1}_cell_images`]
            delete fileModel.value[`location_${i+1}_segmentations`]
            
        }
    }
    s.next();
}
const uploadAll = async () => {
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
            interface UploadResponeData {
                status:string,
                unique_file_name:string
            }
            const data: UploadResponeData | null = await uploadFile(fileOptions, fileLabel);
            if (fileOptions.checkForUpdates && data) {
                await checkForUpdates(data.unique_file_name, fileLabel);
            }
        }
    }
};

const uploadFile = async (fileOptions: FileOptions, label: string) => {
    if (fileOptions.file) {
        fileOptions.uploading = 1;
        fileOptions.processing = 0;

        const formData = new FormData();
        formData.append('file', fileOptions.file);

        const additionalData = {
            "file_name":fileOptions.file.name,
            "label":label,
            "location":label.split("_")[1],
            "experiment_name":experimentName.value,
            "workflow_code":"live_cyte",
            "file_type":fileOptions.file_type
        }

        const jsonString = JSON.stringify(additionalData);

        formData.append('metadata',jsonString);
        
        try {
            const response = await fetch('http://localhost:8000/upload/', {
                method: 'POST',
                body: formData,
            })
            if(response.ok){
                const responseData = await response.json()
                console.log(responseData);
                fileOptions.uploading = 2;
                fileOptions.processing = 1;
                return responseData
            } else {
                throw new Error('Failed to upload file.');
            }
        } catch (error) {
            console.error('Error uploading file: ', error);
        }
    }
};
const checkForUpdates = async (uniqueFileName: string, fileLabel: string) => {
    try {
        let updatesAvailable = false;
        while (!updatesAvailable) {
            console.log(fileLabel);
            console.log(uniqueFileName)
            // Make a request to your server to check for updates
            const response = await fetch(
                'http://localhost:8000/upload/' + uniqueFileName
            );

            if (!response.ok) {
                throw new Error('Failed to fetch updates');
            }

            const data = await response.json();
            if (data.status) {
                updatesAvailable = true;
            } else {
                await new Promise((resolve) => setTimeout(resolve, 5000));
            }
        }
        fileModel.value[fileLabel].processing = 2;
    } catch (error) {
        console.error('Error checking for updates:', error);
    }
};
const disableUpload = () => {
    return !(stepDone(1) && stepDone(2) && stepDone(3) && stepDone(4));
};
const stepDone = (inputStep: number) => {
    switch (inputStep) {
        case 1:
            return step.value > 1;
        case 2:
            if (numberOfLocations.value) {
                console.log('here');
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
                            <span class="upload-label">Experiment Name</span>
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
                                updateFile($event.target.files[0], item, false,'metadata')
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
                                updateFile($event.target.files[0], item, true,'cell_images')
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
                                updateFile($event.target.files[0], item, true,'segmentations')
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
                                    >Location {{ n + 1 }} Segmentations</span
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
            <q-step title="Review and Finish" :name="5" icon="settings">
                <div class="row q-pa-md" style="justify-content: space-between">
                    <div style="width: 400px; flex: 1">
                        <LoadingProgress
                            :progress-status="getProgressStatusList()"
                        />
                    </div>
                    <div
                        class="column"
                        style="
                            align-items: center;
                            flex: 1;
                            justify-content: center;
                        "
                    >
                        <span class="step-title"> Review and Finish</span>
                        <!-- <q-btn
                            no-caps
                            color="primary"
                            label="Begin Upload"
                            ref="upload-button"
                            @click.stop.prevent="uploadFile(model.cell_images)"
                            style="width: 150px"
                        /> -->
                    </div>
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
                                : step === 1 ? handleUpdateFileModel($refs.stepper as QStepper) : ($refs.stepper as any).next()
                        "
                        color="primary"
                        :label="step === 5 ? 'Create Experiment' : 'Continue'"
                        :disabled="step === 5 ? disableUpload() : false"
                    />
                </q-stepper-navigation>
            </template>
        </q-stepper>
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
</style>
