import { useCounterStore } from './counter';
import { useGlobalSettings } from './globalSettings';
import { defineStore, storeToRefs } from 'pinia';
import { initializeTrrack, Registry } from '@trrack/core';
import { cloneDeep } from 'lodash-es';

export const useProvenanceStore = defineStore('provenanceStore', () => {
    const counterStore = useCounterStore();
    const globalSettings = useGlobalSettings();
    // const store = useStore();

    const initialState = {
        counter: cloneDeep(counterStore.$state),
        globalSettings: cloneDeep(globalSettings.$state),
        // store: cloneDeep(store.$state),
    };

    const skipApply = {
        counter: false,
        globalSettings: false,
        // store: false,
    };

    const registry = Registry.create();
    const updateCounter = registry.register(
        'update counter',
        (trrackState, newCounterState) => {
            trrackState.counter = cloneDeep(newCounterState);
        }
    );
    const updateGlobalSettings = registry.register(
        'update global settings',
        (trrackState, newGlobalSettings) => {
            trrackState.globalSettings = cloneDeep(newGlobalSettings);
        }
    );
    // const updateStore = registry.register(
    //     'update store',
    //     (trrackState, newStore) => {
    //         trrackState.store = cloneDeep(newStore);
    //     }
    // );
    const provenance = initializeTrrack({
        initialState,
        registry,
    });

    counterStore.$subscribe((_mutation, state) => {
        if (skipApply.counter) {
            skipApply.counter = false;
            return;
        }
        provenance.apply('counter changed', updateCounter(state));
    });
    globalSettings.$subscribe((_mutation, state) => {
        if (skipApply.globalSettings) {
            skipApply.globalSettings = false;
            return;
        }
        provenance.apply('global settings change', updateGlobalSettings(state));
    });
    // store.$subscribe((_mutation, state) => {
    //     if (skipApply.store) {
    //         skipApply.store = false;
    //         return;
    //     }
    //     provenance.apply('store settings change', updateStore(state));
    // });

    const nodeIds = new Set<string>();
    provenance.currentChange(() => {
        const provNodeId = provenance.current.id;
        const jumpedToNode: boolean = nodeIds.has(provNodeId);
        if (jumpedToNode) {
            for (const key in skipApply) {
                (skipApply as any)[key] = true;
            }
            console.log(skipApply);
            counterStore.$state = cloneDeep(provenance.getState().counter);
            globalSettings.$state = cloneDeep(
                provenance.getState().globalSettings
            );
            // storeToRefs.$state = cloneDeep(provenance.getState().store);
        }
        nodeIds.add(provNodeId);
    });

    return {
        provenance,
    };
});
