<template>
    <div>localCount: {{ localCount }}</div>
    <button @click="increment">increment</button>
    <hr />
    <div>globalCount (x2): {{ counter.doubleCount }}</div>
    <button @click="counter.increment">increment</button>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useCounterStore } from '@/stores/counter';

const counter = useCounterStore();
let localCount = ref(0);

function increment() {
    console.log('add 10!');
    localCount.value += 10;
}
</script>

<style scoped lange="scss">
div {
    background: steelblue;
}
</style>
