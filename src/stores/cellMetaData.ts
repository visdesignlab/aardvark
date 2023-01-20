import { Attributes } from './temporalPoint';
import { ref } from 'vue';
import { defineStore } from 'pinia';

export interface TemporalPoints {
    points: TemporalPoint[];
}

export interface TemporalPoint {
    time: number;
    attributes: Attributes;
}

export interface Track {
    trackId: string;
    attrNum: NumericalAttributes;
    attrStr: StringAttributes;

    rowIndices: number[];
    cells: Cell[];
}

export interface Cell {
    rowId: string;
    attrNum: NumericalAttributes;
    attrStr: StringAttributes;
}

export interface NumericalAttributes {
    [index: string]: number;
}

export interface StringAttributes {
    [index: string]: string;
}

export const useCellMetaData = defineStore('cellMetaData', () => {
    const tKey = ref<string>('time');

    const points = ref<TemporalPoint[]>([
        { time: 0, attributes: { x: 1 } },
        { time: 1, attributes: { x: 2 } },
        { time: 2, attributes: { x: 4 } },
        { time: 3, attributes: { x: 8 } },
        { time: 4, attributes: { x: 16 } },
        { time: 5, attributes: { x: 32 } },
        { time: 6, attributes: { x: 64 } },
    ]);

    function randomizePoints() {
        for (let i = 0; i < points.value.length; i++) {
            points.value[i].attributes.x = Math.random() * 10;
        }
    }

    return { tKey, points, randomizePoints };
});
