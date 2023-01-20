<template>
    <div
        class="border first"
        :style="`width: ${
            temporalPoints.currentPoint.attributes.x * 8 + 10
        }px; height: 20px`"
        @click="temporalPoints.increaseCurrentValue"
    ></div>
    <div
        v-for="point in temporalPoints.points"
        class="border"
        :style="`width: ${point.attributes.x * 8 + 10}px; height: 20px`"
        :key="point.time"
        @click="() => temporalPoints.changeCurrentPoint(point)"
    ></div>
    <div>localCount: {{ localCount }}</div>
    <button @click="increment">increment</button>
    <hr />
    <div>globalCount (x2): {{ counter.doubleCount }}</div>
    <button @click="counter.increment">increment</button>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useCounterStore } from '@/stores/counter';
import { useTemporalPoints, type TemporalPoint } from '@/stores/temporalPoints';

const counter = useCounterStore();
const temporalPoints = useTemporalPoints();
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

div.first {
    background: firebrick;
}
</style>
