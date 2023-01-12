<template>
    <div>count: {{ count }}</div>
    <button @click="increment">increment</button>
</template>

<script setup lang="ts">
import { ref } from 'vue';
let count = ref(0);

function increment() {
    console.log('increment!');
    count.value++;
}
</script>

<style scoped lange="scss">
.draggable {
    position: absolute;
    width: 20px;
    height: 20px;
    top: 0;
    right: 0;
    padding: 0 8px 8px 0;
    background-origin: content-box;
    background-color: black;
    box-sizing: border-box;
    border-radius: 10px;
    cursor: pointer;
}

.vue-grid-item .no-drag {
    height: 100%;
    width: 100%;
}
</style>
