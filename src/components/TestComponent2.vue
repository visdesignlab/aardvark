<template>
    <div>count: {{ count }}</div>
    <button @click="increment">increment</button>
</template>

<script setup lang="ts">
import { ref } from 'vue';
let count = ref(0);

function increment() {
    console.log('add 10!');
    count.value += 10;
}
</script>

<style scoped lange="scss">
div {
    background: steelblue;
}
</style>
