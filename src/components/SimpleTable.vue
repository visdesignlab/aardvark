<script setup lang="ts">
import { ref, computed } from 'vue';
import { useCellMetaData, type Lineage } from '@/stores/cellMetaData';
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
        class="sticky-column-table"
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

<style lang="scss">
.sticky-column-table thead tr:first-child th {
    background-color: white;
}

.q-dark thead tr:first-child th {
    background-color: var(--q-dark) !important;
}

.sticky-column-table td:first-child {
    background-color: white;
    border-width: 0 1px 0 0;
}
.q-dark td:first-child {
    background-color: var(--q-dark) !important;
}
.sticky-column-table th:first-child,
.sticky-column-table td:first-child {
    position: sticky;
    left: 0;
    z-index: 1;
}
// }
</style>
