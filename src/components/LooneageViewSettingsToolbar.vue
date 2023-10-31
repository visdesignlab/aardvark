<script setup lang="ts">
import { useCellMetaData } from '@/stores/cellMetaData';
import { useGlobalSettings } from '@/stores/globalSettings';
import { useLooneageViewStore } from '@/stores/looneageViewStore';
import { useEventBusStore } from '@/stores/eventBusStore';

const cellMetaData = useCellMetaData();
const globalSettings = useGlobalSettings();
const looneageViewStore = useLooneageViewStore();
const eventBusStore = useEventBusStore();
</script>

<template>
    <template v-if="cellMetaData.dataInitialized">
        <q-select
            dense
            label="Attribute"
            v-model="looneageViewStore.attrKey"
            :options="cellMetaData.cellNumAttributeHeaderNames"
            :dark="globalSettings.darkMode"
            class="q-ml-xs"
        />
        <q-btn
            @click="eventBusStore.emitter.emit('exportSvgLooneage')"
            round
            flat
            icon="file_download"
        />
    </template>
</template>

<style scoped lang="scss"></style>
