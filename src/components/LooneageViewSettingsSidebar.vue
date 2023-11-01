<script setup lang="ts">
import { computed } from 'vue';
import { useCellMetaData } from '@/stores/cellMetaData';
import { useGlobalSettings } from '@/stores/globalSettings';
import { useLooneageViewStore } from '@/stores/looneageViewStore';
import { useEventBusStore } from '@/stores/eventBusStore';
import { clamp } from 'lodash-es';

import {
    schemeReds,
    schemeBlues,
    schemeGreens,
    schemeGreys,
    schemeOranges,
    schemePurples,
} from 'd3-scale-chromatic';

const cellMetaData = useCellMetaData();
const globalSettings = useGlobalSettings();
const looneageViewStore = useLooneageViewStore();
const eventBusStore = useEventBusStore();

const colorSchemeOptions = [
    { label: 'Red', value: schemeReds },
    { label: 'Blue', value: schemeBlues },
    { label: 'Green', value: schemeGreens },
    { label: 'Grey', value: schemeGreys },
    { label: 'Orange', value: schemeOranges },
    { label: 'Purple', value: schemePurples },
];

const maxBands = 15;
const minModHeight = computed(() => {
    return (looneageViewStore.maxVal - looneageViewStore.minVal) / maxBands;
});

const modHeightValidate = computed({
    get() {
        return looneageViewStore.modHeight;
    },
    set(value) {
        looneageViewStore.modHeight = Math.max(value, minModHeight.value);
    },
});

const baselineValidate = computed({
    get() {
        return looneageViewStore.baseline;
    },
    set(value) {
        looneageViewStore.baseline = clamp(
            value,
            Math.min(looneageViewStore.minVal, 0),
            Math.max(looneageViewStore.maxVal, 0)
        );
    },
});
</script>

<template>
    <q-btn
        class="mt-1"
        @click="eventBusStore.emitter.emit('exportSvgLooneage')"
        outline
        rounded
        icon="file_download"
        >Export SVG</q-btn
    >
    <q-select
        label="Attribute"
        v-model="looneageViewStore.attrKey"
        :options="cellMetaData.cellNumAttributeHeaderNames"
        :dark="globalSettings.darkMode"
        class="mb-1"
    />
    <q-select
        label="Negative Color Scale"
        v-model="looneageViewStore.negativeColorScheme"
        :options="colorSchemeOptions"
        :dark="globalSettings.darkMode"
        class="mb-1"
    />
    <q-select
        label="Positive Color Scale"
        v-model="looneageViewStore.positiveColorScheme"
        :options="colorSchemeOptions"
        :dark="globalSettings.darkMode"
        class="mb-1"
    />
    <q-input
        label="Bin Size"
        v-model.number="modHeightValidate"
        type="number"
        :dark="globalSettings.darkMode"
        debounce="400"
    />
    <q-input
        label="Baseline"
        v-model.number="baselineValidate"
        type="number"
        :dark="globalSettings.darkMode"
    />
    <q-toggle
        label="Show Lines"
        v-model="looneageViewStore.showLines"
        :dark="globalSettings.darkMode"
    />
    <div>{{ looneageViewStore.showLines }}</div>
</template>

<style scoped lang="scss"></style>
