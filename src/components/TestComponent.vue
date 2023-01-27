<template>
    <button @click="addOne">Plus 1</button>
    <div>{{ counter.count }}</div>
    <button @click="copyGridstackCongif">Pcopy</button>
</template>

<script setup lang="ts">
import { useCounterStore } from '@/stores/counter';
import { useLayoutConfig } from '@/stores/layoutConfig';
import { cloneDeep } from 'lodash';
const counter = useCounterStore();
const layoutConfig = useLayoutConfig();
function addOne() {
    counter.increment();
}

function copyGridstackCongif() {
    const blarg = cloneDeep(layoutConfig.$state);
    console.log({ blarg });
}
</script>

<style scoped lang="scss"></style>
