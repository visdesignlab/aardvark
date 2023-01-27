import { useLayoutConfig } from './layoutConfig';
import { useCounterStore } from './counter';
import { useGlobalSettings } from './globalSettings';
import { defineStore } from 'pinia';
import { initializeTrrack, Registry } from '@trrack/core';
import { toRaw } from 'vue';
// import { myCloneDeep } from 'lodash-es';

export const useProvenanceStore = defineStore('provenanceStore', () => {
    const counterStore = useCounterStore();
    const globalSettings = useGlobalSettings();
    const layoutConfig = useLayoutConfig();
    // const store = useStore();

    //console.log({ layout: myCloneDeep(layoutConfig.$state) });
    //console.log({ global: myCloneDeep(globalSettings.$state) });

    const initialState = {
        counter: myCloneDeep(toRaw(counterStore.$state)),
        globalSettings: myCloneDeep(toRaw(globalSettings.$state)),
        layoutConfig: myCloneDeep(toRaw(layoutConfig.$state)), // including this starts producing the error...
        blarg: 4,
        blarg2: 5,
        blarg5: 6,
        blarg3: 7,
        blarg4: 8,
        // store: myCloneDeep(store.$state),
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
            trrackState.counter = myCloneDeep(newCounterState);
        }
    );
    const updateGlobalSettings = registry.register(
        'update global settings',
        (trrackState, newGlobalSettings) => {
            console.log(myCloneDeep(trrackState));
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
    //         trrackState.store = myCloneDeep(newStore);
    //     }
    // );
    // const updateStore = registry.register(
    //     'update store',
    //     (trrackState, newStore) => {
    //         trrackState.store = myCloneDeep(newStore);
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
            updateGlobalSettings(myCloneDeep(toRaw(state)))
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
            counterStore.$state = myCloneDeep(provenance.getState().counter);
            globalSettings.$state = myCloneDeep(
                provenance.getState().globalSettings
            );
            // layoutConfig.$state = myCloneDeep(provenance.getState().layoutConfig);
            // store.$state = myCloneDeep(provenance.getState().store);
        }
        nodeIds.add(provNodeId);
    });

    function myCloneDeep(obj: any) {
        return JSON.parse(JSON.stringify(obj));
    }

    return {
        provenance,
    };
});
