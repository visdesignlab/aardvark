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
        label="Show Snippets"
        v-model="looneageViewStore.showSnippets"
        :dark="globalSettings.darkMode"
    />
    <q-toggle
        label="Show Lines"
        v-model="looneageViewStore.showLines"
        :dark="globalSettings.darkMode"
    />
    <q-card-section class="q-pl-none q-pr-none">
        <div class="flex row no-wrap">
            <q-badge outline :color="globalSettings.normalizedBlack"
                >Height:</q-badge
            >
            <q-input
                class="q-pl-md"
                dense
                v-model.number="looneageViewStore.rowHeight"
                type="number"
                :dark="globalSettings.darkMode"
            />
        </div>
        <q-slider
            v-model="looneageViewStore.rowHeight"
            :min="4"
            :max="100"
            label
            :dark="globalSettings.darkMode"
        />
    </q-card-section>
    <q-card-section class="q-pl-none q-pr-none">
        <div class="flex row no-wrap">
            <q-badge outline :color="globalSettings.normalizedBlack"
                >Spacing:</q-badge
            >
            <q-input
                class="q-pl-md"
                dense
                v-model.number="looneageViewStore.spacing"
                type="number"
                :dark="globalSettings.darkMode"
            />
        </div>
        <q-slider
            v-model="looneageViewStore.spacing"
            :min="0"
            :max="200"
            label
            :dark="globalSettings.darkMode"
        />
    </q-card-section>

    <q-card-section class="q-pl-none q-pr-none">
        <div class="flex row no-wrap">
            <q-badge outline :color="globalSettings.normalizedBlack"
                >Snippet Source Size:</q-badge
            >
            <q-input
                class="q-pl-md"
                dense
                v-model.number="looneageViewStore.snippetSourceSize"
                type="number"
                :step="2"
                :dark="globalSettings.darkMode"
            />
        </div>
        <q-slider
            v-model="looneageViewStore.snippetSourceSize"
            :min="8"
            :max="320"
            :step="2"
            label
            :dark="globalSettings.darkMode"
        />
    </q-card-section>

    <q-card-section class="q-pl-none q-pr-none">
        <div class="flex row no-wrap">
            <q-badge outline :color="globalSettings.normalizedBlack"
                >Snippet Display Size:</q-badge
            >
            <q-input
                class="q-pl-md"
                dense
                v-model.number="looneageViewStore.snippetDestSize"
                type="number"
                :dark="globalSettings.darkMode"
            />
        </div>
        <q-slider
            v-model="looneageViewStore.snippetDestSize"
            :min="8"
            :max="320"
            label
            :dark="globalSettings.darkMode"
        />
    </q-card-section>

    <q-card-section class="q-pl-none q-pr-none">
        <div class="flex row no-wrap">
            <q-badge outline :color="globalSettings.normalizedBlack"
                >Max Depth</q-badge
            >
            <q-input
                class="q-pl-md"
                dense
                v-model.number="looneageViewStore.maxDepth"
                type="number"
                :dark="globalSettings.darkMode"
            />
        </div>
        <q-slider
            v-model="looneageViewStore.maxDepth"
            :min="0"
            :max="20"
            label
            :dark="globalSettings.darkMode"
        />
    </q-card-section>
</template>

<style scoped lang="scss"></style>
