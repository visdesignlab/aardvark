<script lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import GlobalSettingsView from '@/components/globalSettings/GlobalSettingsView.vue';
import LoadingProgress from './LoadingProgress.vue';

interface FileOptions {
    file: File | null;
    checkForUpdates?: boolean;
    uploading: 0 | 1 | 2;
    processing: 0 | 1 | 2;
}

export default {
    setup() {
        const step = ref(1);
        const fileModel = ref<Record<string, FileOptions>>({
            metadata: {
                file: null,
                uploading: 0,
                processing: 0,
            },
            cellImages: {
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
        const stepProcessing = ref(1);
        const uploadAll = async () => {
            console.log('called here');
            const fileEntries = Object.entries(fileModel.value);
            console.log(fileModel.value);
            for (let i = 0; i < fileEntries.length; i++) {
                const fileLabel = fileEntries[i][0];
                const fileOptions = fileEntries[i][1];
                // Upload file
                if (fileOptions && fileOptions.file) {
                    await uploadFile(fileOptions.file, fileLabel);
                    if (fileOptions.checkForUpdates) {
                        await checkForUpdates(fileOptions.file.name, fileLabel);
                    }
                }
            }
        };
        const uploadFile = async (file: File | null, label: string) => {
            if (file) {
                fileModel.value[label].uploading = 1;
                fileModel.value[label].processing = 0;

                const formData = new FormData();
                formData.append(file.name, file);
                fetch('http://localhost:8000/upload/', {
                    method: 'POST',
                    body: formData,
                })
                    .then((response) => {
                        if (response.ok) {
                            return response.json();
                        } else {
                            throw new Error('Failed to upload file.');
                        }
                    })
                    .then((responseData) => {
                        console.log(responseData);
                        fileModel.value[label].uploading = 2;
                        fileModel.value[label].processing = 1;
                    })
                    .catch((error) => {
                        console.error('Error uploading file: ', error);
                    });
            }
        };
        const checkForUpdates = async (fileName: string, fileLabel: string) => {
            try {
                let updatesAvailable = false;
                while (!updatesAvailable) {
                    console.log(fileLabel);
                    console.log(fileName);
                    // Make a request to your server to check for updates
                    const response = await fetch(
                        'http://localhost:8000/upload/' + fileName
                    );

                    if (!response.ok) {
                        throw new Error('Failed to fetch updates');
                    }

                    const data = await response.json();
                    if (data.status) {
                        updatesAvailable = true;
                    } else {
                        await new Promise((resolve) =>
                            setTimeout(resolve, 5000)
                        );
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
                    return (
                        fileModel.value?.metadata.file !== null &&
                        fileModel.value.metadata.file !== undefined
                    );
                case 3:
                    return (
                        fileModel?.value.cellImages.file !== null &&
                        fileModel.value.cellImages.file !== undefined
                    );
                case 4:
                    return (
                        fileModel?.value.segmentations.file !== null &&
                        fileModel.value.segmentations.file !== undefined
                    );
            }
        };
        return {
            step,
            fileModel,
            stepProcessing,
            uploadFile,
            uploadAll,
            disableUpload,
            stepDone,
        };
    },
    components: { LoadingProgress },
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
                Start by creating an experiment
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
                    <span class="text-weight-bold"
                        >Upload one CSV file for all CSV metadata.</span
                    >
                    <q-file
                        v-model="fileModel.metadata.file"
                        label="File"
                        style="
                            width: 500px;
                            margin-top: 30px;
                            margin-bottom: 30px;
                        "
                    >
                        <template v-slot:prepend>
                            <q-icon
                                name="close"
                                @click.stop.prevent="
                                    fileModel.metadata.file = null
                                "
                                class="cursor-pointer"
                            />
                        </template>
                    </q-file>
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
                    <span class="text-weight-bold"
                        >Upload one zipped file of all cell images.</span
                    >
                    <q-file
                        v-model="fileModel.cellImages.file"
                        label="File"
                        style="
                            width: 500px;
                            margin-top: 30px;
                            margin-bottom: 30px;
                        "
                    >
                        <template v-slot:prepend>
                            <q-icon
                                name="close"
                                @click.stop.prevent="
                                    fileModel.cellImages.file = null
                                "
                                class="cursor-pointer"
                            />
                        </template>
                    </q-file>
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
                    <span class="text-weight-bold"
                        >Upload one zipped file of all segmentations.</span
                    >
                    <q-file
                        v-model="fileModel.segmentations.file"
                        label="File"
                        style="
                            width: 500px;
                            margin-top: 30px;
                            margin-bottom: 30px;
                        "
                    >
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
                </div>
            </q-step>
            <q-step title="Review and Finish" :name="5" icon="settings">
                <div class="row q-pa-md" style="justify-content: space-between">
                    <div style="width: 400px; flex: 1">
                        <LoadingProgress
                            :progress-status="[
                                {
                                    label: 'Uploading Metadata',
                                    progress:
                                        fileModel && fileModel.metadata
                                            ? fileModel.metadata.uploading
                                            : 0,
                                },
                                {
                                    label: 'Uploading Cell Images',
                                    progress:
                                        fileModel && fileModel.cellImages
                                            ? fileModel.cellImages.uploading
                                            : 0,
                                },
                                {
                                    label: 'Processing Cell Images',
                                    progress:
                                        fileModel && fileModel.cellImages
                                            ? fileModel.cellImages.processing
                                            : 0,
                                },
                                {
                                    label: 'Uploading Segmentations',
                                    progress:
                                        fileModel && fileModel.segmentations
                                            ? fileModel.segmentations.uploading
                                            : 0,
                                },
                                {
                                    label: 'Processing Segmentations',
                                    progress:
                                        fileModel && fileModel.segmentations
                                            ? fileModel.segmentations.processing
                                            : 0,
                                },
                            ]"
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
                        <span class="text-weight-bold"> Review and Finish</span>
                        <!-- <q-btn
                            no-caps
                            color="primary"
                            label="Begin Upload"
                            ref="upload-button"
                            @click.stop.prevent="uploadFile(model.cellImages)"
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
                                : ($refs.stepper as any).next()
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
