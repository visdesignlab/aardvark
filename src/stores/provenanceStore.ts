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
    let trrackPrevious;
    const localStorageTrrack = localStorage.getItem('trrack');
    if (localStorageTrrack !== null) {
        trrackPrevious = JSON.parse(localStorageTrrack);
    } else {
        trrackPrevious = initialState;
    }

    console.log({ trrackPrevious });
    const provenance = initializeTrrack({
        initialState: trrackPrevious,
        registry,
    });
    if (localStorageTrrack !== null) {
        updateVueState();
    }
    window.prov = provenance;

    for (const store of storesToTrrack) {
        store.$subscribe((mutation, state) => {
            const storeId = mutation.storeId;
            console.log({ storeId, state });
            console.log({ prvState: provenance.getState() });
            if (isEqual(state, provenance.getState()[storeId])) {
                return;
            }
            provenance.apply(storeId, registerActions[storeId](state));
        });
    }

    provenance.currentChange(() => {
        // localStorage.setItem('trrack', provenance.export());
        localStorage.setItem('trrack', JSON.stringify(provenance.getState()));
        // replace with JSON.stringify(provenance.getState()) to only save the last state
    });

    const nodeIds = new Set<string>([provenance.root.id]);
    provenance.currentChange(() => {
        const provNodeId = provenance.current.id;
        const jumpedToNode: boolean = nodeIds.has(provNodeId);
        if (jumpedToNode) {
            updateVueState();
        }
        nodeIds.add(provNodeId);
    });

    function updateVueState(): void {
        for (const store of storesToTrrack) {
            store.$state = cloneDeep(provenance.getState()[store.$id]) as any;
        }
    }

    return {
        provenance,
    };
});
