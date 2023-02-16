import { ref, computed } from 'vue';
import { defineStore } from 'pinia';
import { isEqual, every } from 'lodash-es';
export interface Lineage {
    lineageId: string; // should be equal to the founder trackId
    founder: Track;
    attrNum: NumericalAttributes;
    attrStr: StringAttributes;
}

export interface Track {
    trackId: string; // unique id for the cell track
    attrNum: NumericalAttributes;
    attrStr: StringAttributes;
    cells: Cell[];
    parentId: string; // id of parent cell, if one exists
    children: Track[]; // daughter tracks if they exist
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

export interface TextTransforms {
    [index: string]: string;
}

export interface SpecialHeaders {
    time: string;
    trackId: string;
    parentId: string;
    mass: string;
    // changes here require changes to initHeaderTransforms and transformsEqual
}

export interface HeaderDef {
    text: string;
    value: string;
    sortable: boolean;
    type: 'string' | 'number';
}

// export interface D3CSV extends Array<AnyAttributes> {
//     // something like this should be in the d3-types, but I'm tired of debugging
//     // why this isn't importing, so I can just use this one.
//     columns: string[];
// }
export const useCellMetaData = defineStore('cellMetaData', () => {
    const defaultHeaders: SpecialHeaders = {
        time: 'time',
        trackId: 'id',
        parentId: 'parent',
        mass: 'mass',
    };
    const headerKeys = ref<SpecialHeaders>(defaultHeaders);
    const headers = ref<string[]>();

    // we might want to wrap these inside a container, so it's convenient to create a list of them.
    // e.g. there's a different table for each condition or each well. hmm maybe start with this and add later.
    const dataInitialized = ref(false);
    const cellArray = ref<Cell[]>();
    const trackArray = ref<Track[]>();
    const trackMap = ref<Map<string, Track>>();
    const lineageArray = ref<Lineage[]>();
    const lineageMap = ref<Map<string, Lineage>>();
    const selectedLineage = ref<Lineage>();
    const selectedTrack = ref<Track | null>(null);

    const cellAttributeHeaders = computed<HeaderDef[]>(() => {
        if (!dataInitialized.value) return [];
        if (cellArray.value == null) return [];
        const headers: HeaderDef[] = [
            { text: 'Row ID', value: 'rowId', sortable: true, type: 'string' },
            {
                text: 'Track ID',
                value: 'trackId',
                sortable: true,
                type: 'string',
            },
        ];
        const firstCell = cellArray.value[0];
        for (const key in firstCell.attrNum) {
            headers.push({
                text: key,
                value: `attrNum.${key}`,
                sortable: true,
                type: 'number',
            });
        }
        for (const key in firstCell.attrStr) {
            headers.push({
                text: key,
                value: `attrStr.${key}`,
                sortable: true,
                type: 'string',
            });
        }
        return headers;
    });

    const cellNumAttributeHeaderNames = computed<string[]>(() => {
        const numericalHeaders = cellAttributeHeaders.value.filter(
            (header) => header.type === 'number'
        );
        return numericalHeaders.map((header) => header.text);
    });

    const trackAttributeHeaders = computed(() => {
        if (!dataInitialized.value) return [];
        if (trackArray.value == null) return [];
        const headers = [
            { text: 'Track ID', value: 'trackId', sortable: true },
            { text: 'Parent ID', value: 'parentId', sortable: true },
        ];
        const firstTrack = trackArray.value[0];
        for (const key in firstTrack.attrNum) {
            headers.push({
                text: key,
                value: `attrNum.${key}`,
                sortable: true,
            });
        }
        for (const key in firstTrack.attrStr) {
            headers.push({
                text: key,
                value: `attrStr.${key}`,
                sortable: true,
            });
        }
        return headers;
    });

    const lineageAttributeHeaders = computed(() => {
        if (!dataInitialized.value) return [];
        if (lineageArray.value == null) return [];
        const headers = [
            { text: 'Lineage ID', value: 'lineageId', sortable: true },
        ];
        const firstLineage = lineageArray.value[0];
        for (const key in firstLineage.attrNum) {
            headers.push({
                text: key,
                value: `attrNum.${key}`,
                sortable: true,
            });
        }
        for (const key in firstLineage.attrStr) {
            headers.push({
                text: key,
                value: `attrStr.${key}`,
                sortable: true,
            });
        }
        return headers;
    });

    function init(
        rawData: AnyAttributes[],
        columnHeaders: string[],
        headerTransforms?: TextTransforms
    ): void {
        headers.value = columnHeaders;
        initHeaderTransforms(headerTransforms);
        initCells(rawData);
        initTracks();
        initLineages();
        selectedLineage.value = lineageArray?.value?.[0];
        dataInitialized.value = true;
    }

    function initHeaderTransforms(trans?: TextTransforms): void {
        if (transformsEqual(trans)) return;
        // avoid change so watchers won't have extra calls
        headerKeys.value = { ...defaultHeaders };
        if (trans) {
            const h = headerKeys.value;
            if (trans.time) h.time = trans.time;
            if (trans.id) h.trackId = trans.id;
            if (trans.parent) h.parentId = trans.parent;
            if (trans.mass) h.mass = trans.mass;
        }
    }

    function transformsEqual(trans?: TextTransforms): boolean {
        if (trans == null) {
            return isEqual(headerKeys.value, defaultHeaders);
        }
        return (
            trans.time === headerKeys.value.time &&
            trans.id === headerKeys.value.trackId &&
            trans.parent === headerKeys.value.parentId &&
            trans.mass === headerKeys.value.mass
        );
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
                if (key === headerKeys.value.parentId) {
                    // always force parent id to be a string
                    attrStr[key] = val?.toString() ?? '';
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
                const parentId = cell.attrStr[headerKeys.value.parentId] ?? '';
                const track: Track = {
                    trackId,
                    parentId,
                    attrNum: {},
                    attrStr: {},
                    cells: [],
                    children: [],
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
            track.attrNum['track_length'] = track.cells.length;
            track.attrNum['sorted'] = every(track.cells, (val, index, arr) => {
                return index === 0 || getTime(arr[index - 1]) <= getTime(val);
            })
                ? 1
                : 0;
        }
    }

    function initLineages(): void {
        if (trackArray.value == null) return;
        if (trackMap.value == null) return;
        // assumes that values are already sorted by time.
        lineageArray.value = [];
        lineageMap.value = new Map<string, Lineage>();
        // this populates the children attribute of the tracks
        // as well as building the lineage data list/map
        for (const track of trackArray.value) {
            const parentId = track.parentId;
            if (
                parentId == '' ||
                parentId == track.trackId ||
                parentId == '-404' // my hack for now to indicate there is no parent numerically
            ) {
                // founder cell
                const lineageId = track.trackId;
                const lineage: Lineage = {
                    lineageId,
                    founder: track,
                    attrNum: {},
                    attrStr: {},
                };
                lineageArray.value.push(lineage);
                lineageMap.value.set(lineageId, lineage);
            } else {
                // daughter cell
                const parentTrack = trackMap.value.get(parentId);
                parentTrack?.children.push(track);
            }
        }
        computeLineageLevelAttributes();
    }

    function computeLineageLevelAttributes(): void {
        if (lineageArray.value == null) return;

        for (const lineage of lineageArray.value) {
            lineage.attrNum['cell_count'] = computeCellCount(lineage.founder);
            lineage.attrNum['generations'] = computeTreeHeight(lineage.founder);
        }
    }

    function computeCellCount(track: Track): number {
        let childrenCount = 0;
        for (const child of track.children) {
            childrenCount += computeCellCount(child);
        }
        return 1 + childrenCount;
    }

    function computeTreeHeight(track: Track): number {
        let maxChildHeight = 0;
        for (const child of track.children) {
            maxChildHeight = Math.max(maxChildHeight, computeTreeHeight(child));
        }
        return 1 + maxChildHeight;
    }

    function getTime(cell: Cell): number {
        return cell.attrNum[headerKeys.value.time];
    }

    function getNumAttr(obj: Cell | Track | Lineage, attr: string): number {
        return obj.attrNum[attr];
    }

    return {
        headerKeys,
        headers,
        dataInitialized,
        cellArray,
        trackArray,
        trackMap,
        lineageArray,
        lineageMap,
        cellAttributeHeaders,
        cellNumAttributeHeaderNames,
        trackAttributeHeaders,
        lineageAttributeHeaders,
        selectedLineage,
        selectedTrack,
        init,
        getTime,
        getNumAttr,
    };
});
