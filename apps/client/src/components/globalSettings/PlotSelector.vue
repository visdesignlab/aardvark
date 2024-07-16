<template>
    <div>
        <div class="q-item-section__right">
            <q-btn
                class="gt-xs q-mr-sm"
                size="12px"
                flat
                dense
                round
                icon="menu"
                color="grey-7"
            >
                <q-menu v-model="menuOpen" fit>
                    <q-list
                        style="min-width: 100px; max-height: 300px"
                        class="scroll"
                    >
                        <q-item
                            v-for="name in allPlotNames"
                            :key="name"
                            clickable
                            :class="{
                                'selected-item': selectedPlotSet.has(name),
                            }"
                            @click.stop="togglePlotSelection(name)"
                        >
                            <q-item-section class="plot-name">{{
                                name
                            }}</q-item-section>
                        </q-item>
                    </q-list>
                </q-menu>
            </q-btn>
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
            v-for="plotName in selectedPlotSet"
            :key="plotName"
            :plot-name="plotName"
            :plot-brush="plotBrush"
            @selection-change="handleSelectionChange"
        />
    </div>
</template>

<script lang="ts" setup>
import { ref, reactive, computed } from 'vue';
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
const menuOpen = ref(false);

const allPlotNames = ['A', 'y', 'mass', 'time', 'x'];
const selectedPlotSet = reactive(new Set(['mass', 'time']));

const computedSelectedPlots = computed(() => Array.from(selectedPlotSet));

let plotBrush = vg.Selection.intersect();
vg.Selection.crossfilter();

const currentSelections = ref<Selections>({});
const filterStore = useFilterStore();
const selectionStore = useSelectionStore();

const togglePlotSelection = (name: string) => {
    if (selectedPlotSet.has(name)) {
        clearSelectionForPlot(name);
        selectedPlotSet.delete(name);
        console.log(`Plot ${name} removed`);
    } else {
        selectedPlotSet.add(name);
        console.log(`Plot ${name} added`);
    }
    console.log('Current selected plots:', Array.from(selectedPlotSet));
};

// Clears the current selection when plot is deselected from menu.
const clearSelectionForPlot = (plotName: string) => {
    delete currentSelections.value[plotName];
    selectionStore.removeSelectionByPlotName(plotName);

    // Find the clause for the deleted plot and remove it
    const clauseIndex = plotBrush.clauses.findIndex(
        (clause: any) => clause.source.field === plotName
    );
    if (clauseIndex !== -1) {
        plotBrush.remove(plotBrush.clauses[clauseIndex].source);
    }
    console.log(plotBrush);
};

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

.plot-name {
    font-size: 0.8em;
}

/* New style for selected items */
.selected-item {
    background-color: #e0e0e0; /* Light grey color */
    color: black; /* Ensures text stays black */
}
</style>
