import { useGridstackLayoutStore } from './gridstackLayoutStore';
import { useCounterStore } from './counter';
import { useGlobalSettings } from './globalSettings';
import { defineStore } from 'pinia';
import { initializeTrrack, Registry } from '@trrack/core';
// import { toRaw } from 'vue';
import { cloneDeep } from 'lodash-es';

export const useProvenanceStore = defineStore('provenanceStore', () => {
    const counterStore = useCounterStore();
    const globalSettings = useGlobalSettings();
    const gridstackLayoutStore = useGridstackLayoutStore();
    // const store = useStore();

    const initialState = {
        counter: cloneDeep(counterStore.$state),
        globalSettings: cloneDeep(globalSettings.$state),
        layoutConfig: cloneDeep(gridstackLayoutStore.$state),
        // store: cloneDeep(store.$state),
    };

    const skipApply = {
        counter: false,
        globalSettings: false,
        layoutConfig: false,
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
            // console.log(cloneDeep(trrackState));
            trrackState.globalSettings = newGlobalSettings;
        }
    );

    const updateLayoutConfig = registry.register(
        'update layoutConfig',
        (trrackState, newStore) => {
            // console.log('in action');
            // console.log({ trrackState });
            trrackState.store = cloneDeep(newStore);
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

    counterStore.$subscribe((mutation, state) => {
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
        provenance.apply(
            'global settings change',
            updateGlobalSettings(cloneDeep(state))
        );
    });
    gridstackLayoutStore.$subscribe((_mutation, state) => {
        // console.log('layout sub');
        if (skipApply.layoutConfig) {
            skipApply.layoutConfig = false;
            return;
        }
        // console.log({ layout: cloneDeep(state) });
        provenance.apply(
            'layout store settings change',
            updateLayoutConfig(cloneDeep(state))
        );
    });
    // store.$subscribe((_mutation, state) => {
    //     if (skipApply.store) {
    //         skipApply.store = false;
    //         return;
    //     }
    //     provenance.apply('store settings change', updateStore(state));
    // });

    const nodeIds = new Set<string>([provenance.root.id]);
    provenance.currentChange(() => {
        const provNodeId = provenance.current.id;
        const jumpedToNode: boolean = nodeIds.has(provNodeId);
        if (jumpedToNode) {
            for (const key in skipApply) {
                (skipApply as any)[key] = true;
            }
            counterStore.$state = cloneDeep(provenance.getState().counter);
            globalSettings.$state = cloneDeep(
                provenance.getState().globalSettings
            );
            gridstackLayoutStore.$state = cloneDeep(
                provenance.getState().layoutConfig
            );
            // store.$state = cloneDeep(provenance.getState().store);
        }
        nodeIds.add(provNodeId);
    });

    return {
        provenance,
    };
});
