import { ref, type Ref } from 'vue';
import { defineStore } from 'pinia';

export interface TemporalPoints {
    points: TemporalPoint[];
}

export interface TemporalPoint {
    time: number;
    attributes: Attributes;
}

export interface Attributes {
    [index: string]: number;
}

export const useTemporalPoints = defineStore('temporalPoints', () => {
    const points: Ref<TemporalPoint[]> = ref<TemporalPoint[]>([
        { time: 0, attributes: { x: 1 } },
        { time: 1, attributes: { x: 2 } },
        { time: 2, attributes: { x: 4 } },
        { time: 3, attributes: { x: 8 } },
        { time: 4, attributes: { x: 16 } },
        { time: 5, attributes: { x: 32 } },
        { time: 6, attributes: { x: 64 } },
    ]);

    const currentPoint = ref<TemporalPoint>(points.value[0]);

    function randomizePoints() {
        for (let i = 0; i < points.value.length; i++) {
            points.value[i].attributes.x = Math.random() * 10;
        }
    }

    function changeCurrentPoint(newPoint: TemporalPoint) {
        currentPoint.value = newPoint;
    }

    function increaseCurrentValue() {
        currentPoint.value.attributes.x++;
    }

    return {
        points,
        currentPoint,
        randomizePoints,
        changeCurrentPoint,
        increaseCurrentValue,
    };
});
