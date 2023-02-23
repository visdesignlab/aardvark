import { useGridstackLayoutStore } from './gridstackLayoutStore';
import { useCounterStore } from './counter';
import { useGlobalSettings } from './globalSettings';
import { useAggregateLineChartStore } from './aggregateLineChartStore';
import { useImageViewerStore } from './imageViewerStore';
import { defineStore } from 'pinia';
import { initializeTrrack, Registry } from '@trrack/core';
import { cloneDeep, isEqual } from 'lodash-es';

export interface SubStores {
    [storeId: string]: Object;
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
        useAggregateLineChartStore(),
        useImageViewerStore(),
    ];

    const initialState: SubStores = {};
    const registerActions: RegisterActions = {};
    const registry = Registry.create();
    for (const store of storesToTrrack) {
        const storeId = store.$id;
        initialState[storeId] = cloneDeep(store.$state);
        registerActions[storeId] = registry.register(
            storeId,
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
            if (isEqual(state, provenance.getState()[storeId])) {
                return;
            }
            provenance.apply(storeId, registerActions[storeId](state));
        });
    }

    const nodeIds = new Set<string>([provenance.root.id]);
    provenance.currentChange(() => {
        const provNodeId = provenance.current.id;
        const jumpedToNode: boolean = nodeIds.has(provNodeId);
        if (jumpedToNode) {
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
