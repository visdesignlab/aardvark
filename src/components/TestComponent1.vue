<template>
    <div>localCount: {{ localCount }}</div>
    <button @click="increment">increment</button>
    <hr />
    <div>globalCount: {{ counter.count }}</div>
    <button @click="counter.increment">increment</button>
    <hr />
    <div>passed from Props: {{ counterState.count }}</div>
    <button @click="counterState.increment">increment</button>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useCounterStore, type CounterState } from '@/stores/counter';

defineProps<{ counterState: CounterState }>();

const counter = useCounterStore();
let localCount = ref(0);

function increment() {
    console.log('increment!');
    localCount.value++;
}
</script>

<style scoped lange="scss">
div {
    background: tomato;
}
</style>
