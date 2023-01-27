import { ref, computed } from 'vue';
import { defineStore } from 'pinia';

export interface CounterState {
    count: number;
    doubleCount: number;
    increment: () => void;
}

export const useCounterStore = defineStore('counter', () => {
    const count = ref(0);
    const doubleCount = computed(() => count.value * 2);
    const otherAttribute = ref('blarg');
    function increment() {
        count.value++;
        // otherAttribute = count.value.toString();
    }

    return { count, otherAttribute, doubleCount, increment };
});
