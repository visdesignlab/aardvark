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

const selection = computed<Lineage[]>({
    get() {
        if (cellMetaData.selectLineage == null) return [];
        return [cellMetaData.selectedLineage as Lineage];
    },
    set(val) {
        if (props.attributeLevel == 'lineage') {
            cellMetaData.selectLineage(val[0] as Lineage);
        }
    },
});
</script>
<template>
    <q-table
        :title="`${props.attributeLevel} level attributes`"
        :rows="items"
        :columns="headers"
        row-key="lineageId"
        :selection="props.attributeLevel === 'lineage' ? 'single' : 'none'"
        v-model:selected="selection"
        :dark="globalSettings.darkMode"
        flat
    ></q-table>
</template>

<style scoped lang="scss"></style>
