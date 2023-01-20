import { ref } from 'vue';
import { defineStore } from 'pinia';
import { useTemporalPoints } from './temporalPoints';

export const useListOfTemporalPoints = defineStore(
    'listOfTemporalPoints',
    () => {
        const pointsA = useTemporalPoints();
        const pointsB = useTemporalPoints();
        pointsB.randomizePoints();

        const currentList = pointsA;

        return { pointsA, pointsB, currentList };
    }
);
