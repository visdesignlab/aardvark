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
        v-model="dataUrl"
        filled
        type="url"
        prefix="https://"
        suffix="/aa_index.json"
        hint="Dataset URL"
        debounce="1000"
        lazy-rules="ondemand"
        :rules="urlRules"
    />
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { useCellMetaData, type AnyAttributes } from '@/stores/cellMetaData';
import { parse, type ParseResult } from 'papaparse';

const cellMetaData = useCellMetaData();

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
const dataUrl = ref(null);
const data = ref<{ experiments: string[] }>({ experiments: [] });
watch(dataUrl, async () => {
    console.log('data url change');
    console.log({ url: dataUrl.value });
    const response = await fetch('http://' + dataUrl.value + '/aa_index.json');
    // response.status
    data.value = await response.json();
    serverInputRef?.value?.validate();
    // console.log({ data.value });
    // .then((response) => console.log({ blarg: response.json() }))
    // .then((data) => console.log({ data }));
});

const urlValid = computed(() => data.value.experiments.length > 0);
const urlRules = ref([() => urlValid.value || 'url is notr valuid']);
</script>

<style scoped lange="scss"></style>
