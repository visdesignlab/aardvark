<template>
    <div>
        <div class="q-item-section__right">
            <q-btn
                class="gt-xs"
                size="12px"
                flat
                dense
                round
                icon="filter_alt"
                color="grey-7"
                @click="addFilter"
            />
        </div>
        <UnivariateCellPlot
            v-for="plotName in plotNames"
            :key="plotName"
            :plot-name="plotName"
            :plot-brush="plotBrush"
            @selection-change="handleSelectionChange"
        ></UnivariateCellPlot>
    </div>
</template>

<script lang="ts" setup>
import { ref } from 'vue';
import { QBtn } from 'quasar';
import * as vg from '@uwdata/vgplot';
import { storeToRefs } from 'pinia';
import UnivariateCellPlot from './UnivariateCellPlot.vue';
import { useFilterStore } from '@/stores/filterStore';
import { useSelectionStore } from '@/stores/selectionStore';

interface Selections {
    [key: string]: [number, number] | undefined;
}
interface SelectionChangeEvent {
    plotName: string;
    range: [number, number] | null;
}

const plotNames = ref(['A', 'y', 'mass', 'time', 'x']);

const plotBrush = vg.Selection.intersect();
vg.Selection.crossfilter();

const currentSelections = ref<Selections>({});
const filterStore = useFilterStore();
const selectionStore = useSelectionStore();

// Invoked by selectionChange event in UnivariateCellPlot
const handleSelectionChange = (event: SelectionChangeEvent) => {
    const { plotName, range } = event;
    if (range && range[0] !== undefined && range[1] !== undefined) {
        currentSelections.value[plotName] = range;
        selectionStore.updateSelection(plotName, [
            range[0].toFixed(2),
            range[1].toFixed(2),
        ]);
    } else {
        // Remove the selection if the range is null, undefined, or has undefined values
        delete currentSelections.value[plotName];
        selectionStore.removeSelectionByPlotName(plotName);
    }
};

// When filter button is clicked.
const addFilter = () => {
    Object.entries(currentSelections.value).forEach(([plotName, range]) => {
        if (range) {
            filterStore.addFilter({
                plotName,
                range: [range[0].toFixed(2), range[1].toFixed(2)],
            });
        }
    });
};
</script>

<style scoped>
.q-item-section__right {
    display: flex;
    justify-content: flex-end;
}
</style>
