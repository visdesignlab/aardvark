<script setup lang="ts">
import { ref, computed } from 'vue';
import { useCellMetaData, type Lineage } from '@/stores/cellMetaData';
import type { ClickRowArgument } from 'vue3-easy-data-table';
import { useGlobalSettings } from '@/stores/globalSettings';
const cellMetaData = useCellMetaData();
const globalSettings = useGlobalSettings();
const props = defineProps<{ attributeLevel: 'cell' | 'track' | 'lineage' }>();

const headers = computed(() => {
    switch (props.attributeLevel) {
        case 'cell':
            return cellMetaData.cellAttributeHeaders;
        case 'track':
            return cellMetaData.trackAttributeHeaders;
        case 'lineage':
            return cellMetaData.lineageAttributeHeaders;
    }
    return [];
});

const items = computed(() => {
    switch (props.attributeLevel) {
        case 'cell':
            return cellMetaData.selectedTrack?.cells ?? cellMetaData.cellArray;
        case 'track':
            if (cellMetaData.selectedTrack) return [cellMetaData.selectedTrack];
            return cellMetaData.trackArray;
        case 'lineage':
            return cellMetaData.lineageArray;
    }
    return [];
});

function selectRow(item: ClickRowArgument): void {
    if (props.attributeLevel == 'lineage') {
        cellMetaData.selectLineage(item as Lineage);
    }
}
</script>
<template>
    <!-- <div class="table-container"> -->
    <h3>{{ props.attributeLevel }}</h3>
    <EasyDataTable
        v-if="cellMetaData.dataInitialized"
        :headers="headers"
        :items="items"
        fixedHeader="true"
        @click-row="selectRow"
        :table-class-name="globalSettings.darkMode ? 'dark-theme-table' : ''"
    ></EasyDataTable>
    <NoDataSplash></NoDataSplash>
    <!-- </div> -->
</template>

<style scoped lang="scss">
.table-container {
    max-height: 300px;
    overflow: auto;
}

.dark-theme-table {
    --easy-table-border: 1px solid #8a8a8a;
    --easy-table-row-border: 1px solid #8a8a8a;

    --easy-table-header-font-color: white;
    --easy-table-header-background-color: #0c0c0c;

    --easy-table-body-even-row-font-color: white;
    --easy-table-body-even-row-background-color: #1a1a1a;

    --easy-table-body-row-font-color: white;
    --easy-table-body-row-background-color: #1a1a1a;

    --easy-table-body-row-hover-font-color: white;
    --easy-table-body-row-hover-background-color: black;

    --easy-table-footer-background-color: #979797;
    --easy-table-footer-font-color: black;

    // --easy-table-scrollbar-track-color: #2d3a4f;
    // --easy-table-scrollbar-color: #2d3a4f;
    // --easy-table-scrollbar-thumb-color: #4c5d7a;
    // --easy-table-scrollbar-corner-color: #2d3a4f;

    // --easy-table-loading-mask-background-color: #2d3a4f;
}
</style>
