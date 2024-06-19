<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';

import { defineProps, defineEmits } from 'vue';

const props = defineProps<{
    experimentName: string;
    numberOfLocations: number;
}>();

const emits = defineEmits<{
    (event: 'update:experimentName', value: string): void;
    (event: 'update:numberOfLocations', value: string): void;
}>();

const updateExperimentNameValue = (value: string | number | null) => {
    console.log('update Exp value is called');
    emits('update:experimentName', value?.toString() ?? '');
};

const updateNumberOfLocationsValue = (value: string | number | null) => {
    console.log('update location value is called');
    emits('update:numberOfLocations', value?.toString() ?? '');
};
</script>

<template>
    <span class="step-title"> Create Your Experiment </span>
    <div class="column" style="row-gap: 20px; margin-top: 30px">
        <q-input
            :model-value="experimentName"
            @update:model-value="updateExperimentNameValue"
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
            :model-value="numberOfLocations"
            @update:model-value="updateNumberOfLocationsValue"
            outlined
            style="width: 500px"
            label-slot
            :rules="[
                (val) => !!val || 'Field is required',
                (val) =>
                    !isNaN(parseInt(val)) || 'Please enter in a valid number.',
            ]"
            hint="Number of locations to add."
        >
            <template v-slot:label>
                <span class="upload-label">Number of Locations</span>
            </template>
        </q-input>
    </div>
</template>

<style scoped lang="scss">
.upload-label {
    font-weight: bold;
}

.step-title {
    font-weight: bold;
    font-size: 1.2em;
}
</style>
