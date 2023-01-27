import { useCounterStore } from './counter';
import { defineStore } from 'pinia';
import { initializeTrrack, Registry } from '@trrack/core';
import { cloneDeep } from 'lodash-es';

export const useProvenanceStore = defineStore('provenanceStore', () => {
    const counterStore = useCounterStore();

    const initialState = {
        counter: cloneDeep(counterStore.$state),
    };

    const registry = Registry.create();
    const updateCounter = registry.register(
        'update counter',
        (trrackState, newCounterState) => {
            trrackState.counter = cloneDeep(newCounterState);
        }
    );
    const provenance = initializeTrrack({
        initialState,
        registry,
    });

    counterStore.$subscribe((_mutation, state) => {
        if (skipApply) {
            skipApply = false;
            return;
        }
        provenance.apply('counter changed', updateCounter(state));
    });

    let skipApply = false;
    const nodeIds = new Set<string>();
    provenance.currentChange(() => {
        const provNodeId = provenance.current.id;
        const jumpedToNode: boolean = nodeIds.has(provNodeId);
        if (jumpedToNode) {
            counterStore.$state = provenance.getState().counter;
            skipApply = true;
        }
        nodeIds.add(provNodeId);
    });

    return {
        provenance,
    };
});
