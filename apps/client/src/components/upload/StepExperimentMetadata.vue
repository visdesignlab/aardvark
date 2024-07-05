<script setup lang="ts">
import { useUploadStore } from '@/stores/uploadStore';
const uploadStore = useUploadStore();
</script>

<template>
    <div>
        Select experiment metadata. The experiment name must be unique. We don't
        currently check this for you. Including today's data in the name is one
        good way to help ensure uniqueness.
    </div>
    <q-input
        class="q-mt-md"
        v-model="uploadStore.experimentName"
        outlined
        style="width: 500px"
        label-slot
        :rules="[(val) => !!val || 'Field is required']"
        label="Experiment Name"
    >
    </q-input>
</template>

<style scoped lang="scss"></style>
