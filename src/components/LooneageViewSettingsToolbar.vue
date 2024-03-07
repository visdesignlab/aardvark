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
        <q-btn
            round
            flat
            @click="eventBusStore.emitter.emit('resetLooneageView')"
            icon="center_focus_strong"
            title="reset view"
        />
        <q-select
            dense
            label="Attribute"
            v-model="looneageViewStore.attrKey"
            :options="cellMetaData.cellNumAttributeHeaderNames"
            :dark="globalSettings.darkMode"
            class="min-w-75 q-ml-xs"
        />
        <q-badge class="q-ml-sm" outline :color="globalSettings.normalizedBlack"
            >Height:</q-badge
        >
        <q-slider
            v-model="looneageViewStore.rowHeight"
            :min="4"
            :max="100"
            label
            :dark="globalSettings.darkMode"
            class="q-ml-md max-w-150"
            switch-label-side
        />
    </template>
</template>

<style scoped lang="scss">
.max-w-150 {
    max-width: 150px;
}
.min-w-75 {
    min-width: 75px;
}
</style>
