<template>
    <!-- <label class="form-label" for="dataInput">Select metadata csv file:</label>
    <inputinput url
        type="file"
        class="form-control"
        id="dataInput"
        @input="onDataUpload"
    /> -->
    <q-input
        ref="serverInputRef"
        v-model="datasetSelectionStore.serverUrl"
        filled
        type="url"
        label="http://"
        :suffix="datasetSelectionStore.entryPointFilename"
        debounce="1000"
        :loading="datasetSelectionStore.fetchingEntryFile"
        :error="!datasetSelectionStore.serverUrlValid"
        :error-message="datasetSelectionStore.errorMessage"
        :dark="globalSettings.darkMode"
    />
    <q-select
        v-if="
            datasetSelectionStore.serverUrlValid &&
            datasetSelectionStore.serverUrl
        "
        label="Experiment"
        v-model="datasetSelectionStore.currentExperimentFilename"
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
                :active="location.show"
                @click="
                    () => {
                        datasetSelectionStore.selectImagingLocation(location);
                    }
                "
                :dark="globalSettings.darkMode"
                ><q-item-section>{{ location.id }}</q-item-section></q-item
            >
        </q-list>
    </div>
    <!-- <hr />
    <div>debug info</div>
    <div>
        {{ JSON.stringify(datasetSelectionStore.currentExperimentMetadata) }}
    </div> -->
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { useQuasar } from 'quasar';
import { useCellMetaData, type AnyAttributes } from '@/stores/cellMetaData';
import { useGlobalSettings } from '@/stores/globalSettings';
import { useDatasetSelectionStore } from '@/stores/datasetSelectionStore';
import { parse, type ParseResult } from 'papaparse';

const cellMetaData = useCellMetaData();
const globalSettings = useGlobalSettings();
const datasetSelectionStore = useDatasetSelectionStore();
const $q = useQuasar();
console.log(datasetSelectionStore.entryPointFilename);

function onDataUpload(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input === null || input.files === null) return;
    const dataFile = input.files[0];
    parse(dataFile, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        complete: (results: ParseResult<AnyAttributes>, file) => {
            cellMetaData.init(results.data, results.meta.fields as string[]);
            console.log({ results, file });
        },
    });
}
const serverInputRef = ref<any>(null);
const blarg = ref();
// watch(datasetSelectionStore.fetchingTabularData, () => {
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
// const dataUrl = ref(null);
// const data = ref<{ experiments: string[] }>({ experiments: [] });
// watch(dataUrl, async () => {
//     console.log('data url change');
//     console.log({ url: dataUrl.value });
//     const response = await fetch('http://' + dataUrl.value + '/aa_index.json');
//     // response.status
//     data.value = await response.json();
//     serverInputRef?.value?.validate();
//     // console.log({ data.value });
//     // .then((response) => console.log({ blarg: response.json() }))
//     // .then((data) => console.log({ data }));
// });

// const urlValid = computed(() => data.value.experiments.length > 0);
// const urlRules = ref([() => urlValid.value || 'url is notr valuid']);
</script>

<style scoped lange="scss"></style>
