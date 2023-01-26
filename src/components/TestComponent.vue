<template>
    <button @click="addOne">Plus 1</button>
    <div>{{ counter.count }}</div>
</template>

<script setup lang="ts">
import { useCounterStore } from '@/stores/counter';
const counter = useCounterStore();
function addOne() {
    counter.increment();
}
</script>

<style scoped lang="scss"></style>
