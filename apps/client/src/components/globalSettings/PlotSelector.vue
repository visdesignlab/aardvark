<template>
    <div>
        <div v-if="!dataInitialized" class="loading-wrapper">
            <div class="loading-text">Loading...</div>
        </div>
        <div v-else>
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
                                    'selected-item': isPlotSelected(name),
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
            </div>
            <UnivariateCellPlot
                v-for="plot in selectedPlots"
                :key="plot.plotName"
                :plot-name="plot.plotName"
                :plot-brush="plotBrush"
                @selection-change="handleSelectionChange"
                @plot-loaded="handlePlotLoaded"
                @plot-error="handlePlotError"
            />
            <q-dialog v-model="showErrorDialog">
                <q-card>
                    <q-card-section>
                        <div class="text-h6">Error</div>
                    </q-card-section>
                    <q-card-section class="q-pt-none">
                        An error occurred while loading the plot:
                        {{ errorPlotName }}
                    </q-card-section>
                    <q-card-actions align="right">
                        <q-btn flat label="OK" color="primary" v-close-popup />
                    </q-card-actions>
                </q-card>
            </q-dialog>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { ref, computed, onMounted, watch } from 'vue';
import { QBtn, QDialog, QCard, QCardSection, QCardActions } from 'quasar';
import * as vg from '@uwdata/vgplot';
import { storeToRefs } from 'pinia';
import UnivariateCellPlot from './UnivariateCellPlot.vue';
import { useFilterStore } from '@/stores/filterStore';
import { useSelectionStore } from '@/stores/selectionStore';
import { useCellMetaData } from '@/stores/cellMetaData';

const cellMetaData = useCellMetaData();
const { dataInitialized } = storeToRefs(cellMetaData);

interface Selection {
    [key: string]: [number, number] | undefined;
}
interface SelectionChangeEvent {
    plotName: string;
    range: [number, number] | null;
}

const menuOpen = ref(false);
const loading = ref(true);
const loadedPlots = ref(0);
const totalPlots = ref(0);

// On any update, computes the plots to be shown.
const allPlotNames = computed(() => {
    return dataInitialized.value ? cellMetaData.headers : [];
});
const firstPlotName = computed(() => {
    return dataInitialized.value && cellMetaData.headers.length > 0
        ? cellMetaData.headers[0]
        : '';
});

const currentSelections = ref<Selection>({});
const selectionStore = useSelectionStore();

const { Plots, Selections } = storeToRefs(selectionStore);

const showErrorDialog = ref(false);
const errorPlotName = ref('');

// If there is a plot loading here, a dialog is displayed.
const handlePlotError = (plotName: string) => {
    console.log('handlePlotError called with:', plotName);
    errorPlotName.value = plotName;
    showErrorDialog.value = true;

    // Deselect the plot and remove it from the shown plots
    clearSelectionForPlot(plotName);
    selectionStore.Plots = Plots.value.filter(
        (plot) => plot.plotName !== plotName
    );
};

// Adds a plot initially when first loading.
onMounted(() => {
    watch(
        dataInitialized,
        (isInitialized) => {
            if (isInitialized && firstPlotName.value) {
                selectionStore.addPlot({ plotName: firstPlotName.value });
                totalPlots.value = selectedPlots.value.length;
            }
        },
        { immediate: true }
    );
});

const handlePlotLoaded = () => {
    loadedPlots.value++;
    console.log('Plot loaded');
    if (loadedPlots.value === totalPlots.value) {
        loading.value = false;
    }
};

// Mosaic Selections within plots gets computed
const mosaicSelection = computed(() => vg.Selection.intersect());
const plotBrush = computed(() => {
    console.log('plotBrush computed');

    for (let selection of Selections.value) {
        const source = selection.plotName;
        const min = Number(selection.range[0]);
        const max = Number(selection.range[1]);
        const value = [min, max];

        // Escape the source name to handle multi-word column names
        const escapedSource = `"${source.replace(/"/g, '""')}"`;

        const predicate = `${escapedSource} BETWEEN ${min} AND ${max}`;
        const clause = { source, value, predicate };
        mosaicSelection.value.update(clause);
    }

    return mosaicSelection.value;
});

// Selecting which plots to show
const selectedPlots = computed(() => Plots.value);
const isPlotSelected = (name: string) => {
    return Plots.value.some((plot) => plot.plotName === name);
};
const togglePlotSelection = (name: string) => {
    if (isPlotSelected(name)) {
        clearSelectionForPlot(name);
        selectionStore.Plots = Plots.value.filter(
            (plot) => plot.plotName !== name
        );
        console.log(`Plot ${name} removed`);
    } else {
        selectionStore.addPlot({ plotName: name });
        console.log(`Plot ${name} added`);
    }
    console.log(
        'Current selected plots:',
        Plots.value.map((plot) => plot.plotName)
    );
};

const clearSelectionForPlot = (plotName: string) => {
    delete currentSelections.value[plotName];
    selectionStore.removeSelectionByPlotName(plotName);

    mosaicSelection.value.update({
        source: plotName,
        value: null,
        predicate: null,
    });
};

const handleSelectionRemoved = (event: CustomEvent) => {
    console.log('handleSelectionRemoved reached');
    mosaicSelection.value.update({
        source: event.detail,
        value: null,
        predicate: null,
    });
};

window.addEventListener(
    'selectionRemoved',
    handleSelectionRemoved as EventListener
);

// When a selection changes, the selection store updates.
const handleSelectionChange = (event: SelectionChangeEvent) => {
    const { plotName, range } = event;
    if (range && range[0] !== undefined && range[1] !== undefined) {
        currentSelections.value[plotName] = range;
        selectionStore.updateSelection(plotName, [
            Number(range[0].toFixed(3)),
            Number(range[1].toFixed(3)),
        ]);
    } else {
        delete currentSelections.value[plotName];
        selectionStore.removeSelectionByPlotName(plotName);
    }
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

.selected-item {
    background-color: #e0e0e0;
    color: black;
}

.loading-wrapper {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100%;
}

.loading-text {
    font-size: 1rem;
}
</style>
