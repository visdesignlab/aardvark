import { useGridstackLayoutStore } from './gridstackLayoutStore';
import { useCounterStore } from './counter';
import { useGlobalSettings } from './globalSettings';
import { useAggregateLineChartStore } from './aggregateLineChartStore';
import { useImageViewerStore } from './imageViewerStore';
import { defineStore } from 'pinia';
import { initializeTrrack, Registry } from '@trrack/core';
import { cloneDeep, isEqual } from 'lodash-es';
import {
    compress,
    decompress,
    compressToEncodedURIComponent,
    decompressFromEncodedURIComponent,
} from 'lz-string';

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
    // const localStorageTrrack = localStorage.getItem('trrack');

    const url = new URL(window.location.href);
    const searchParams = new URLSearchParams(url.search);

    const urlParamTrrack = searchParams.get('state');
    // url.search = searchParams.toString();
    // window.history.replaceState(null, '', url);

    if (urlParamTrrack) {
        trrackPrevious = JSON.parse(
            decompressFromEncodedURIComponent(urlParamTrrack) ?? ''
        );
    } else {
        trrackPrevious = initialState;
    }

    console.log({ trrackPrevious });
    const provenance = initializeTrrack({
        initialState: trrackPrevious,
        registry,
    });
    if (urlParamTrrack) {
        updateVueState();
    }
    // window.prov = provenance;

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
        const url = new URL(window.location.href);
        const searchParams = new URLSearchParams(url.search);

        searchParams.set(
            'state',
            compressToEncodedURIComponent(JSON.stringify(provenance.getState()))
        );
        url.search = searchParams.toString();
        window.history.replaceState(null, '', url);
        // localStorage.setItem(
        //     'trrack',
        //     compress(JSON.stringify(provenance.getState()))
        // );
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
