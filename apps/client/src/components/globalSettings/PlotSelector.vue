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
                @click="showFilterDialog = true"
            />
        </div>
        <UnivariateCellPlot
            v-for="plotName in plotNames"
            :key="plotName"
            :plot-name="plotName"
            :plot-brush="plotBrush"
            @selection-change="handleSelectionChange"
        ></UnivariateCellPlot>
        <q-dialog v-model="showFilterDialog">
            <q-card>
                <q-card-section>
                    <div class="text-h6">Current Selections</div>
                </q-card-section>
                <q-card-section>
                    <div
                        v-for="(range, plotName) in currentSelections"
                        :key="plotName"
                    >
                        <template v-if="range">
                            {{ range[0].toFixed(2) }} to
                            {{ range[1].toFixed(2) }} on plot '{{ plotName }}'
                        </template>
                    </div>
                    <div v-if="Object.keys(currentSelections).length === 0">
                        No selections made
                    </div>
                </q-card-section>
            </q-card>
        </q-dialog>
    </div>
</template>

<script lang="ts" setup>
import { ref, computed, toRaw, watch } from 'vue';
import { QBtn, QDialog, QCard, QCardSection } from 'quasar';
import * as vg from '@uwdata/vgplot';
import { useCellMetaData } from '@/stores/cellMetaData';
import { useDatasetSelectionStore } from '@/stores/datasetSelectionStore';
import { storeToRefs } from 'pinia';
import UnivariateCellPlot from './UnivariateCellPlot.vue';

const plotNames = ref(['A', 'y', 'mass', 'time', 'x']);
const plotBrush = vg.Selection.intersect();
vg.Selection.crossfilter();

interface Selections {
    [key: string]: [number, number] | undefined;
}
interface SelectionChangeEvent {
    plotName: string;
    range: [number, number] | null;
}

const currentSelections = ref<Selections>({});
const showFilterDialog = ref(false);

const handleSelectionChange = (event: SelectionChangeEvent) => {
    const { plotName, range } = event;
    if (range) {
        currentSelections.value[plotName] = range;
    } else {
        delete currentSelections.value[plotName];
    }
};
</script>

<style scoped>
.q-item-section__right {
    display: flex;
    justify-content: flex-end;
}
</style>
