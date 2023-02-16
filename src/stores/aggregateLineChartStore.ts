import { ref, computed } from 'vue';
import { defineStore } from 'pinia';

export const useAggregateLineChartStore = defineStore(
    'aggregateLineChartStore',
    () => {
        const blarg = ref<string>('jet');

        return {
            blarg,
        };
    }
);
