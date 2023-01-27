<template>
    <div class="d-flex flex-row">
        <div class="vh-100">
            <GlobalSettingsView></GlobalSettingsView>
        </div>
        <div class="flex-grow-1">
            <GridstackLayout></GridstackLayout>
        </div>
    </div>
</template>

<script setup lang="ts">
import { useGlobalSettings } from '@/stores/globalSettings';
import { watch, onBeforeMount } from 'vue';
import GridstackLayout from './components/GridstackLayout.vue';
import GlobalSettingsView from './components/globalSettings/GlobalSettingsView.vue';
import { useProvenanceStore } from '@/stores/provenanceStore';
import { onKeyStroke } from '@vueuse/core';
const provenanceStore = useProvenanceStore();

onKeyStroke(['z', 'Z'], (e: KeyboardEvent) => {
    if (globalSettings.usingMac && !e.metaKey) return;
    if (!globalSettings.usingMac && !e.ctrlKey) return;
    if (e.shiftKey) {
        provenanceStore.provenance.redo();
    } else {
        provenanceStore.provenance.undo();
    }
});

// onKeyStroke(['y', 'Y'], (e: KeyboardEvent) => {
//     if (globalSettings.usingMac && !e.metaKey) return;
//     if (!globalSettings.usingMac && !e.ctrlKey) return;
//     provenanceStore.provenance.redo();
// });

const globalSettings = useGlobalSettings();
watch(
    () => globalSettings.darkMode,
    (newDarkMode: boolean) => {
        setBsTheme(newDarkMode);
    }
);

function setBsTheme(darkMode: boolean): void {
    const htmlData = document.documentElement.dataset;
    if (darkMode) {
        htmlData.bsTheme = 'dark';
    } else {
        htmlData.bsTheme = 'light';
    }
}
onBeforeMount(() => {
    setBsTheme(globalSettings.darkMode);
});
</script>

<style scoped>
.flex-grow-1 {
    flex-grow: 1;
}
</style>
