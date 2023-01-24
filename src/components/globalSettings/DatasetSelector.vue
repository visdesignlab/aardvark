<template>
    <label class="form-label" for="dataInput">Select metadata csv file:</label>
    <input
        type="file"
        class="form-control"
        id="dataInput"
        @input="onDataUpload"
    />
</template>

<script setup lang="ts">
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
</script>

<style scoped lange="scss"></style>
