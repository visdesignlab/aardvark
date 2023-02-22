import { useGridstackLayoutStore } from './gridstackLayoutStore';
import { useCounterStore } from './counter';
import { useGlobalSettings } from './globalSettings';
import { defineStore } from 'pinia';
import { initializeTrrack, Registry } from '@trrack/core';
// import { toRaw } from 'vue';
import { cloneDeep } from 'lodash-es';

export interface SubStores {
    [storeId: string]: Object;
}

export interface SkipStoreApplyTracker {
    [storeId: string]: Boolean;
}

export interface RegisterActions {
    [storeId: string]: any;
    // [storeId: string]: ActionCreatorWithPayload<any, string>;
}

export const useProvenanceStore = defineStore('provenanceStore', () => {
    const storesToTrrack = [
        useGlobalSettings(),
        useGridstackLayoutStore(),
        useCounterStore(),
    ];

    const initialState: SubStores = {};
    const skipApply: SkipStoreApplyTracker = {};
    const registerActions: RegisterActions = {};
    const registry = Registry.create();
    for (const store of storesToTrrack) {
        const storeId = store.$id;
        initialState[storeId] = cloneDeep(store.$state);
        skipApply[storeId] = false;
        registerActions[storeId] = registry.register(
            `update ${storeId}`,
            (trrackState, newPiniaState) => {
                trrackState[storeId] = cloneDeep(newPiniaState);
            }
        );
    }

    const provenance = initializeTrrack({
        initialState,
        registry,
    });

    for (const store of storesToTrrack) {
        store.$subscribe((mutation, state) => {
            const storeId = mutation.storeId;
            if (skipApply[storeId]) {
                skipApply[storeId] = false;
                return;
            }
            provenance.apply(
                `${storeId} changed`,
                registerActions[storeId](state)
            );
        });
    }

    const nodeIds = new Set<string>([provenance.root.id]);
    provenance.currentChange(() => {
        const provNodeId = provenance.current.id;
        const jumpedToNode: boolean = nodeIds.has(provNodeId);
        if (jumpedToNode) {
            for (const key in skipApply) {
                skipApply[key] = true;
            }
            for (const store of storesToTrrack) {
                store.$state = cloneDeep(
                    provenance.getState()[store.$id]
                ) as any;
            }
        }
        nodeIds.add(provNodeId);
    });

    return {
        provenance,
    };
});
