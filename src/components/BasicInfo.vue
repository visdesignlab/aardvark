<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { useCellMetaData, type Lineage } from '@/stores/cellMetaData';
import { useDatasetSelectionStore } from '@/stores/datasetSelectionStore';
import { storeToRefs } from 'pinia';
const cellMetaData = useCellMetaData();

const datasetSelectionStore = useDatasetSelectionStore();
const { currentImageStackMetadata } = storeToRefs(datasetSelectionStore);

interface DisplayInfo {
    label: string;
    value: string;
}

const displayList = computed<DisplayInfo[]>(() => {
    const info: DisplayInfo[] = [
        {
            label: 'Cells',
            value: cellMetaData.cellArray?.length.toLocaleString() ?? 'UNKNOWN',
        },
        {
            label: 'Tracks',
            value:
                cellMetaData.trackArray?.length.toLocaleString() ?? 'UNKNOWN',
        },
        {
            label: 'Lineages',
            value:
                cellMetaData.lineageArray
                    ?.filter((lineage: Lineage) => {
                        return lineage.founder.children.length > 0;
                    })
                    .length.toLocaleString() ?? 'UNKNOWN',
        },
        {
            label: 'Images',
            value:
                currentImageStackMetadata.value?.sizeT.toLocaleString() ??
                'UNKNOWN',
        },
    ];
    return info;
});
</script>

<template>
    <NoDataSplash></NoDataSplash>
    <div v-if="cellMetaData.dataInitialized" class="flex q-pa-lg">
        <q-card
            v-for="info in displayList"
            :key="info.label"
            bordered
            class="q-ma-sm inner-card"
        >
            <q-card-section>
                <div class="text-overline text-center">{{ info.label }}</div>
            </q-card-section>

            <q-card-section class="text-center text-h4 q-pt-none">
                {{ info.value }}
            </q-card-section>
        </q-card>
    </div>
</template>

<style scoped lang="scss">
.inner-card {
    border-radius: 30px;
}
</style>
