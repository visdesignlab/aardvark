<template>
    <!-- <div class="container m-4"> -->
    <div class="row">
        <div class="col">
            <div class="input-group mb-3">
                <label class="input-group-text" for="dataInput">Data</label>
                <input
                    type="file"
                    class="form-control"
                    id="dataInput"
                    @input="onDataUpload"
                />
            </div>
        </div>

        <div class="col">
            <span class="me-3">or</span>
            <button @click="onClick" class="btn btn-primary">
                Generate Example Data
            </button>
        </div>
    </div>
    <!-- </div> -->
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useCellMetaData, type AnyAttributes } from '@/stores/cellMetaData';

// import { csvParse, autoType } from 'd3-dsv';
// import { csvParse, autoType } from 'd3-dsv';
// import { parse } from 'csv-parse';
// import * as Papa from 'papaparse';
import { parse, type ParseResult } from 'papaparse';
// import type { ParseResult } from '@babel/parser';

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

function onClick(): void {
    console.log('todo - implement');
}
</script>

<style scoped lange="scss"></style>
