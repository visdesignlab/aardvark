<template>
    <StubView></StubView>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useCellMetaData, type Lineage } from '@/stores/cellMetaData';
import { useGlobalSettings } from '@/stores/globalSettings';
const cellMetaData = useCellMetaData();
const globalSettings = useGlobalSettings();
</script>

<style scoped lang="scss"></style>
