<script lang="ts" setup>
import { ref, computed, watch, onMounted } from 'vue';
import StepExperimentMetadata from '@/components/upload/StepExperimentMetadata.vue';
import StepFileSelection from '@/components/upload/StepFileSelection.vue';
import StepReview from '@/components/upload/StepReview.vue';
import StepUploadStatus from '@/components/upload/StepUploadStatus.vue';
import StepColumnNameMapping from '@/components/upload/StepColumnNameMapping.vue';
import type { QStepper } from 'quasar';
import { useUploadStore } from '@/stores/uploadStore';
import { useConfigStore } from '@/stores/configStore';

import { router } from '@/router';
const uploadStore = useUploadStore();
const configStore = useConfigStore();

const step = ref(1);

// Function to determine if the create experiment button should be enabled.
function disableUpload(): boolean {
    return !(
        experimentMetadataDone() &&
        fileSelectionDone() &&
        columnNameMappingDone()
    );
}

function experimentMetadataDone(): boolean {
    return uploadStore.validExperimentName();
}

function fileSelectionDone(): boolean {
    return uploadStore.allFilesPopulated();
}

function columnNameMappingDone(): boolean {
    return uploadStore.allColumnsMapped();
}

function returnHome(): void {
    router.push('/');
}
</script>
<template>
    <q-page class="q-pa-lg q-gutter-md" style="max-width: 1200px; margin: auto">
        <template v-if="configStore.environment === 'local'">
            <q-banner inline-actions class="text-white bg-red">
                The local version of the Loon application does not support data
                upload directly.
                <template v-slot:action>
                    <q-btn
                        flat
                        color="white"
                        label="Return to Home"
                        @click="returnHome()"
                    />
                </template>
            </q-banner>
        </template>
        <template v-else-if="!uploadStore.experimentCreated">
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
                    :done="experimentMetadataDone()"
                    done-color="green"
                >
                    <StepExperimentMetadata />
                </q-step>
                <q-step
                    :name="2"
                    title="Select Files"
                    icon="settings"
                    :done="fileSelectionDone()"
                    done-color="green"
                >
                    <StepFileSelection />
                </q-step>
                <q-step
                    :name="3"
                    title="Define Column Variables"
                    icon="settings"
                    :done="columnNameMappingDone()"
                    done-color="green"
                >
                    <StepColumnNameMapping />
                </q-step>

                <q-step title="Review" :name="5" icon="settings">
                    <StepReview />
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
                                    ? uploadStore.uploadAll()
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
            <StepUploadStatus />
        </template>
    </q-page>
</template>

<style scoped></style>
