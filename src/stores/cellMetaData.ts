import { ref } from 'vue';
import { defineStore } from 'pinia';
export interface Lineage {
    lineageId: string; // should be equal to the founder cell trackId
    attrNum: NumericalAttributes;
    attrStr: StringAttributes;
    // todo --- decide on actual structure of hierarchy.
}

export interface Track {
    trackId: string;
    attrNum: NumericalAttributes;
    attrStr: StringAttributes;
    cells: Cell[];
}

export interface Cell {
    rowId: string;
    trackId: string;
    attrNum: NumericalAttributes;
    attrStr: StringAttributes;
}

export interface NumericalAttributes {
    [index: string]: number;
}

export interface StringAttributes {
    [index: string]: string;
}

export interface AnyAttributes {
    [index: string]: any;
}

// export interface D3CSV extends Array<AnyAttributes> {
//     // something like this should be in the d3-types, but I'm tired of debugging
//     // why this isn't importing, so I can just use this one.
//     columns: string[];
// }
export const useCellMetaData = defineStore('cellMetaData', () => {
    const headerKeys = ref({
        time: 'time',
        trackId: 'id',
        parentId: 'parent',
    });
    const headers = ref<string[]>();

    // we might want to wrap these inside a container, so it's convenient to create a list of them.
    // e.g. there's a different table for each condition or each well. hmm maybe start with this and add later.
    const cellArray = ref<Cell[]>();
    const trackArray = ref<Track[]>();
    const trackMap = ref<Map<string, Track>>();
    const lineageArray = ref<Lineage[]>();

    function init(rawData: AnyAttributes[], columnHeaders: string[]): void {
        headers.value = columnHeaders;
        initCells(rawData);
        initTracks();
    }

    function initCells(rawData: AnyAttributes[]): void {
        cellArray.value = [];
        for (let i = 0; i < rawData.length; i++) {
            const row = rawData[i];
            const attrNum: NumericalAttributes = {};
            const attrStr: StringAttributes = {};
            let trackId: string = '';
            for (const key in row) {
                const val = row[key];
                if (key === headerKeys.value.trackId) {
                    trackId = val.toString();
                    continue;
                }
                switch (typeof val) {
                    case 'number':
                        attrNum[key] = val;
                        break;
                    case 'string':
                        attrStr[key] = val;
                        break;
                    default:
                        // this probably could be hit if the csv has "true" or "false"
                        // the simplest fix is either changing that to 0/1 in source, or using
                        // a synonym for true/false, different capitalization may also work.
                        console.error(
                            'Unrecognized cell type' +
                                `.\n\trow index: ${i}` +
                                `.\n\tkey: ${key}` +
                                `.\n\tvalue: ${val}` +
                                `.\n\ttype: ${typeof val}`
                        );
                        break;
                }
            }
            const cell: Cell = {
                rowId: i.toString(),
                trackId,
                attrNum,
                attrStr,
            };
            cellArray.value.push(cell);
        }
    }

    function initTracks(): void {
        if (cellArray.value == null) return;
        // assumes that values are already sorted by time.
        trackArray.value = [];
        trackMap.value = new Map<string, Track>();
        for (const cell of cellArray.value) {
            const trackId = cell.trackId;
            if (!trackMap.value.has(trackId)) {
                const track: Track = {
                    trackId,
                    attrNum: {},
                    attrStr: {},
                    cells: [],
                };

                trackMap.value.set(trackId, track);
                trackArray.value.push(track);
            }
            trackMap.value.get(trackId)?.cells.push(cell);
        }
        computeTrackLevelAttributes();
    }

    function computeTrackLevelAttributes(): void {
        if (trackArray.value == null) return;
        for (const track of trackArray.value) {
            track.attrNum['length'] = track.cells.length;
        }
    }

    return { headerKeys, headers, cellArray, trackArray, lineageArray, init };
});
