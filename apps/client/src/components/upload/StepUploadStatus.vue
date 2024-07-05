<script setup lang="ts">
import { useUploadStore } from '@/stores/uploadStore';
import LoadingProgress from '@/components/upload/LoadingProgress.vue';
const uploadStore = useUploadStore();
</script>

<template>
    <div class="column">
        <div class="row" style="justify-content: space-between">
            <span class="text-h4" style="font-weight: bold">
                Finish Creating Your Experiment</span
            >
        </div>
    </div>
    <div class="row q-pa-md" style="justify-content: space-between">
        <div class="column" style="flex: 0.65; border-right: 1px solid #dcdcdc">
            <span class="step-title q-pa-sm" style="font-size: 1.5em"
                >Uploading and Processing Progress</span
            >
            <div class="q-pa-sm">
                <div class="q-pa-sm">
                    <LoadingProgress
                        :progress-status="uploadStore.progressStatusList"
                    />
                </div>
            </div>
        </div>
        <div
            class="column"
            style="
                flex: 1;
                margin-left: 30px;
                justify-content: center;
                align-items: center;
            "
        >
            <template v-if="uploadStore.overallProgress.status !== 2">
                <q-banner inline-actions class="text-white bg-blue">
                    Your data is currently being processed. Please do not exit
                    this page.
                    <template v-slot:avatar>
                        <q-icon name="mdi-alert" color="white" />
                    </template>
                </q-banner>
            </template>
            <template v-else>
                <q-banner class="text-white bg-green">
                    All your data has been processed and your experiment has
                    been successfully added. You can now navigate away from this
                    page.
                    <template v-slot:avatar>
                        <q-icon name="mdi-check-circle" color="white" />
                    </template>
                    <template v-slot:action>
                        <q-btn flat color="white" label="Return to Home" />
                        <q-btn
                            flat
                            color="white"
                            label="Add another experiment"
                        />
                    </template>
                </q-banner>
            </template>
        </div>
    </div>
</template>

<style scoped lang="scss"></style>
