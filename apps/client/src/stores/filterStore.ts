// src/stores/filterStore.ts

import { defineStore } from 'pinia';

interface Filter {
    plotName: string;
    range: [string, string];
}

export const useFilterStore = defineStore('filter', {
    state: () => ({
        filters: [] as Filter[],
    }),
    actions: {
        addFilter(filter: Filter) {
            this.filters.push(filter);
        },
        removeFilter(index: number) {
            this.filters.splice(index, 1);
        },
    },
});
