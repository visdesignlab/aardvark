<template>
    <!-- <div class="table-container"> -->
    <h3>{{ props.attributeLevel }}</h3>
    <EasyDataTable
        v-if="cellMetaData.dataInitialized"
        :headers="headers"
        :items="items"
        fixedHeader="true"
    ></EasyDataTable>
    <NoDataSplash></NoDataSplash>
    <!-- </div> -->
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useCellMetaData } from '@/stores/cellMetaData';
const cellMetaData = useCellMetaData();

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
            return cellMetaData.cellArray;
        case 'track':
            return cellMetaData.trackArray;
        case 'lineage':
            return cellMetaData.lineageArray;
    }
    return [];
});
</script>

<style scoped lange="scss">
.table-container {
    max-height: 300px;
    overflow: auto;
}
</style>
