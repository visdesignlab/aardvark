<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { useQuasar } from 'quasar';
import { useCellMetaData, type AnyAttributes } from '@/stores/cellMetaData';
import { useGlobalSettings } from '@/stores/globalSettings';
import { useDatasetSelectionTrrackedStore } from '@/stores/datasetSelectionTrrackedStore';
import { useDatasetSelectionStore } from '@/stores/datasetSelectionStore';

const globalSettings = useGlobalSettings();
const datasetSelectionStore = useDatasetSelectionStore();

const datasetSelectionTrrackedStore = useDatasetSelectionTrrackedStore();
const $q = useQuasar();

const serverInputRef = ref<any>(null);
watch(
    () => datasetSelectionStore.fetchingTabularData,
    () => {
        if (datasetSelectionStore.fetchingTabularData) {
            $q.loading.show({
                delay: 0,
                // customClass: 'my-super-cool-custom-class',
            });
        } else {
            $q.loading.hide();
        }
    }
);

function onClickLocation(location: any) {
    // console.log('clicked location: ', location);
    datasetSelectionStore.selectImagingLocation(location);
}

const shortExpName = computed<string>(() => {
    let shortName = datasetSelectionTrrackedStore.currentExperimentFilename;
    if (shortName === null) return '<NULL>';
    shortName = shortName.split('.')[0];
    const maxChar = 24;
    if (shortName.length > maxChar) {
        shortName = shortName.slice(0, maxChar) + '...';
    }
    return shortName;
});
</script>

<template>
    <q-input
        ref="serverInputRef"
        v-model="datasetSelectionTrrackedStore.serverUrl"
        filled
        type="url"
        label="https://"
        :suffix="datasetSelectionTrrackedStore.entryPointFilename"
        debounce="1000"
        :loading="datasetSelectionStore.fetchingEntryFile"
        :error="!datasetSelectionStore.serverUrlValid"
        :error-message="datasetSelectionStore.errorMessage"
        :dark="globalSettings.darkMode"
    />
    <q-select
        v-if="
            datasetSelectionStore.serverUrlValid &&
            datasetSelectionTrrackedStore.serverUrl
        "
        label="Experiment"
        v-model="datasetSelectionTrrackedStore.currentExperimentFilename"
        :display-value="shortExpName"
        :options="datasetSelectionStore.experimentFilenameList"
        :dark="globalSettings.darkMode"
    />
    <div
        v-if="
            datasetSelectionStore.currentExperimentMetadata &&
            datasetSelectionStore.currentExperimentMetadata.locationMetadataList
                .length > 0
        "
        class="mt-3"
    >
        <span>Imaging Locations</span>
        <q-list bordered separator :dark="globalSettings.darkMode">
            <q-item
                v-for="location in datasetSelectionStore
                    .currentExperimentMetadata?.locationMetadataList"
                :key="location.id"
                clickable
                v-ripple
                :active="
                    datasetSelectionTrrackedStore.selectedLocationIds[
                        location.id
                    ]
                "
                @click="
                    () => {
                        onClickLocation(location);
                    }
                "
                :dark="globalSettings.darkMode"
                ><q-item-section>{{ location.id }}</q-item-section></q-item
            >
        </q-list>
    </div>
</template>

<style scoped lange="scss"></style>
