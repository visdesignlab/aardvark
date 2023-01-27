import { useLayoutConfig } from './layoutConfig';
import { useCounterStore } from './counter';
import { useGlobalSettings } from './globalSettings';
import { defineStore } from 'pinia';
import { initializeTrrack, Registry } from '@trrack/core';
// import { toRaw } from 'vue';
import { cloneDeep } from 'lodash-es';

export const useProvenanceStore = defineStore('provenanceStore', () => {
    const counterStore = useCounterStore();
    const globalSettings = useGlobalSettings();
    const layoutConfig = useLayoutConfig();
    // const store = useStore();

    //console.log({ layout: cloneDeep(layoutConfig.$state) });
    //console.log({ global: cloneDeep(globalSettings.$state) });

    const initialState = {
        counter: cloneDeep(counterStore.$state),
        globalSettings: cloneDeep(globalSettings.$state),
        layoutConfig: cloneDeep(layoutConfig.$state), // including this starts producing the error...
        blarg: 4,
        blarg2: 5,
        blarg5: 6,
        blarg3: 7,
        blarg4: 8,
        // store: cloneDeep(store.$state),
    };

    const skipApply = {
        counter: false,
        globalSettings: false,
        // layoutConfig: false,
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
            console.log(cloneDeep(trrackState));
            // console.log(;
            //console.log({ inAction: newGlobalSettings });
            //console.log({ frozen: Object.isFrozen(newGlobalSettings) });
            trrackState.globalSettings = newGlobalSettings;
        }
    );

    console.log({ updateGlobalSettings });
    // const updateLayoutConfig = registry.register(
    //     'update layoutConfig',
    //     (trrackState, newStore) => {
    //         trrackState.store = cloneDeep(newStore);
    //     }
    // );
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
        //console.log({ mutation });
        //console.log('payload', (mutation as any)?.payload);
        if (skipApply.counter) {
            //console.log('skipped counter apply');
            skipApply.counter = false;
            return;
        }
        provenance.apply('counter changed', updateCounter(state));
    });
    globalSettings.$subscribe((_mutation, state) => {
        if (skipApply.globalSettings) {
            //console.log('skipped settings apply');
            skipApply.globalSettings = false;
            return;
        }
        //console.log({ state });
        provenance.apply(
            'global settings change',
            updateGlobalSettings(cloneDeep(state))
        );
    });
    // layoutConfig.$subscribe((_mutation, state) => {
    //     if (skipApply.layoutConfig) {
    //         skipApply.layoutConfig = false;
    //         return;
    //     }
    //     provenance.apply(
    //         'layout store settings change',
    //         updateLayoutConfig(state)
    //     );
    // });
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
            //console.log(skipApply);
            counterStore.$state = cloneDeep(provenance.getState().counter);
            globalSettings.$state = cloneDeep(
                provenance.getState().globalSettings
            );
            // layoutConfig.$state = cloneDeep(provenance.getState().layoutConfig);
            // store.$state = cloneDeep(provenance.getState().store);
        }
        nodeIds.add(provNodeId);
    });

    return {
        provenance,
    };
});
