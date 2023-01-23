<template>
    <div v-if="!cellMetaData.dataInitialized">No data to display...</div>
</template>

<script setup lang="ts">
import { useCellMetaData } from '@/stores/cellMetaData';
const cellMetaData = useCellMetaData();
</script>
