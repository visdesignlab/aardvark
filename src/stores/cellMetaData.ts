import { ref, computed } from 'vue';
import { defineStore } from 'pinia';
import { isEqual, every, sortBy } from 'lodash-es';
import { useDataPointSelection } from './dataPointSelection';
import { extent as d3Extent } from 'd3-array';

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
    frame: string;
    x: string;
    y: string;
    // changes here require changes to initHeaderTransforms and transformsEqual
}

export interface HeaderDef {
    name: string;
    label: string;
    sortable: boolean;
    field: string | Function;
    type: 'string' | 'number';
}

export const useCellMetaData = defineStore('cellMetaData', () => {
    const dataPointSelection = useDataPointSelection();
    const defaultHeaders: SpecialHeaders = {
        time: 'time',
        trackId: 'id',
        parentId: 'parent',
        mass: 'mass',
        frame: 'frame',
        x: 'x',
        y: 'y',
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

    const selectedLineage = computed<Lineage | null>(() => {
        if (!dataInitialized.value) return null;
        if (dataPointSelection.selectedLineageId == null) return null;
        const lineage = lineageMap.value?.get(
            dataPointSelection.selectedLineageId
        );
        return lineage ?? null;
    });
    function selectLineage(lineage: Lineage | null) {
        if (lineage == null) {
            dataPointSelection.selectedLineageId = null;
            return;
        }
        dataPointSelection.selectedLineageId = lineage.lineageId;
    }

    function getLineage(track: Track): Lineage {
        const lineageId = getLineageId(track);
        if (!lineageMap.value?.has(lineageId)) {
            throw new Error('unable to get Lineage');
        }
        return lineageMap.value?.get(lineageId)!;
    }

    function getLineageId(track: Track): string {
        let founderCell = track;
        while (hasParent(founderCell)) {
            const parent = trackMap.value?.get(founderCell.parentId);
            if (!parent) {
                throw new Error('unable to get lineageId');
            }
            founderCell = parent;
        }
        return founderCell.trackId;
    }

    const selectedTrack = computed<Track | null>(() => {
        if (!dataInitialized.value) return null;
        if (dataPointSelection.selectedTrackId == null) return null;
        const track = trackMap.value?.get(dataPointSelection.selectedTrackId);
        return track ?? null;
    });
    function selectTrack(track: Track | null) {
        if (track == null) {
            dataPointSelection.selectedTrackId = null;
            return;
        }
        dataPointSelection.selectedTrackId = track.trackId;
    }

    const hoveredTrackId = ref<string | null>(null);
    // this is not in dataPointSelection because I don't want to trrrrack it.

    const frameMap = computed<Map<number, Cell[]>>(() => {
        const map = new Map<number, Cell[]>();
        if (!dataInitialized.value) return map;
        if (!cellArray.value) return map;
        return createFrameMap(cellArray.value);
    });

    function createFrameMap(cells: Iterable<Cell>): Map<number, Cell[]> {
        const map = new Map<number, Cell[]>();
        for (const cell of cells) {
            const key = getFrame(cell);
            if (!map.has(key)) {
                map.set(key, []);
            }
            map.get(key)?.push(cell);
        }
        return map;
    }

    const frameList = computed<number[]>(() => {
        return getSortedKeys(frameMap.value);
    });

    function getSortedKeys(map: Map<number, any>): number[] {
        return sortBy([...frameMap.value.keys()]);
    }

    function* makeLineageCellIterator(founder: Track) {
        const iterator: Generator<Track, void, unknown> =
            makeLineageTrackIterator(founder);
        for (const track of iterator) {
            for (const cell of track.cells) {
                yield cell;
            }
        }
    }

    function* makeLineageTrackIterator(founder: Track) {
        yield founder;
        for (const daughter of founder.children) {
            const iterator: Generator<Track, void, unknown> =
                makeLineageTrackIterator(daughter);
            for (const track of iterator) {
                yield track;
            }
        }
    }

    const cellAttributeHeaders = computed<HeaderDef[]>(() => {
        if (!dataInitialized.value) return [];
        if (cellArray.value == null) return [];
        const headers: HeaderDef[] = [
            {
                label: 'Row ID',
                name: 'rowId',
                field: 'rowId',
                sortable: true,
                type: 'string',
            },
            {
                label: 'Track ID',
                name: 'trackId',
                field: 'trackId',
                sortable: true,
                type: 'string',
            },
        ];
        const firstCell = cellArray.value[0];
        for (const key in firstCell.attrNum) {
            headers.push({
                label: key,
                name: `attrNum.${key}`,
                field: (row: Cell) => row.attrNum[key],
                sortable: true,
                type: 'number',
            });
        }
        for (const key in firstCell.attrStr) {
            headers.push({
                label: key,
                name: `attrStr.${key}`,
                field: (row: Cell) => row.attrStr[key],
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
        return numericalHeaders.map((header) => header.label);
    });

    const trackAttributeHeaders = computed<HeaderDef[]>(() => {
        if (!dataInitialized.value) return [];
        if (trackArray.value == null) return [];
        const headers: HeaderDef[] = [
            {
                label: 'Track ID',
                name: 'trackId',
                field: 'trackId',
                sortable: true,
                type: 'string',
            },
            {
                label: 'Parent ID',
                name: 'parentId',
                field: 'parentId',
                sortable: true,
                type: 'string',
            },
        ];
        const firstTrack = trackArray.value[0];
        for (const key in firstTrack.attrNum) {
            headers.push({
                label: key,
                name: `attrNum.${key}`,
                field: (row: Track) => row.attrNum[key],
                sortable: true,
                type: 'number',
            });
        }
        for (const key in firstTrack.attrStr) {
            headers.push({
                label: key,
                name: `attrStr.${key}`,
                field: (row: Track) => row.attrStr[key],
                sortable: true,
                type: 'string',
            });
        }
        return headers;
    });

    const lineageAttributeHeaders = computed<HeaderDef[]>(() => {
        if (!dataInitialized.value) return [];
        if (lineageArray.value == null) return [];
        const headers: HeaderDef[] = [
            {
                label: 'Lineage ID',
                name: 'lineageId',
                field: 'lineageId',
                sortable: true,
                type: 'string',
            },
        ];
        const firstLineage = lineageArray.value[0];
        for (const key in firstLineage.attrNum) {
            headers.push({
                label: key,
                name: `attrNum.${key}`,
                field: (row: Lineage) => row.attrNum[key],
                sortable: true,
                type: 'number',
            });
        }
        for (const key in firstLineage.attrStr) {
            headers.push({
                label: key,
                name: `attrStr.${key}`,
                field: (row: Lineage) => row.attrStr[key],
                sortable: true,
                type: 'string',
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
        if (dataPointSelection.selectedLineageId === null) {
            selectLineage(lineageArray?.value?.[0] ?? null);
        }
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
            if (trans.frame) h.frame = trans.frame;
            if (trans.x) h.x = trans.x;
            if (trans.y) h.y = trans.y;
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
            trans.mass === headerKeys.value.mass &&
            trans.frame === headerKeys.value.frame &&
            trans.x === headerKeys.value.x &&
            trans.y === headerKeys.value.y
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
            const [minTime, maxTime] = d3Extent<Cell, number>(
                track.cells,
                getTime
            );
            track.attrNum['min_time'] = minTime ?? 0;
            track.attrNum['max_time'] = maxTime ?? 0;
            const generation = getGeneration(track);
            track.attrNum['generation'] = generation;
        }
    }

    function getGeneration(track: Track): number {
        let generation = 0;
        while (hasParent(track)) {
            generation++;
            const parent = trackMap.value?.get(track.parentId);
            if (!parent) {
                throw new Error('unable to get generation value');
            }
            track = parent;
        }
        return generation;
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
            if (!hasParent(track)) {
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
                const parentTrack = trackMap.value.get(track.parentId);
                parentTrack?.children.push(track);
            }
        }
        computeLineageLevelAttributes();
    }

    function hasParent(track: Track): boolean {
        const parentId = track.parentId;
        // -404 is a hack to indicate that there is no parent numerically
        return (
            parentId !== '' && parentId !== track.trackId && parentId !== '-404'
        );
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

    function getMass(cell: Cell): number {
        return cell.attrNum[headerKeys.value.mass];
    }

    function getTime(cell: Cell): number {
        return cell.attrNum[headerKeys.value.time];
    }

    function getFrame(cell: Cell): number {
        return cell.attrNum[headerKeys.value.frame];
    }

    function getPosition(cell: Cell): [number, number] {
        return [
            cell.attrNum[headerKeys.value.x],
            cell.attrNum[headerKeys.value.y],
        ];
    }

    function getNumAttr(obj: Cell | Track | Lineage, attr: string): number {
        return obj.attrNum[attr];
    }

    return {
        headerKeys,
        headers,
        dataInitialized,
        hoveredTrackId,
        cellArray, // TODO: expand to handle multiple locations
        trackArray, // TODO: expand to handle multiple locations
        trackMap, // TODO: expand to handle multiple locations
        lineageArray, // TODO: expand to handle multiple locations
        lineageMap, // TODO: expand to handle multiple locations
        frameList, // TODO: expand to handle multiple locations
        frameMap, // TODO: expand to handle multiple locations
        cellAttributeHeaders,
        cellNumAttributeHeaderNames,
        trackAttributeHeaders,
        lineageAttributeHeaders,
        selectedLineage,
        selectLineage,
        getLineage,
        getLineageId,
        selectedTrack,
        selectTrack,
        init,
        getMass,
        getTime,
        getFrame,
        getPosition,
        getNumAttr,
        createFrameMap,
        makeLineageTrackIterator,
        makeLineageCellIterator,
        getSortedKeys,
    };
});
