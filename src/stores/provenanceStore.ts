import { useCounterStore } from './counter';
import { useGlobalSettings } from './globalSettings';
import { defineStore } from 'pinia';
import { initializeTrrack, Registry } from '@trrack/core';
import { cloneDeep } from 'lodash-es';

export const useProvenanceStore = defineStore('provenanceStore', () => {
    const counterStore = useCounterStore();
    const globalSettings = useGlobalSettings();

    const initialState = {
        counter: cloneDeep(counterStore.$state),
        globalSettings: cloneDeep(globalSettings.$state),
    };

    const skipApply = {
        counter: false,
        globalSettings: false,
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
        }
        nodeIds.add(provNodeId);
    });

    return {
        provenance,
    };
});
