<script setup lang="ts">
import { ref } from 'vue';
import { useGlobalSettings } from '@/stores/globalSettings';
import PlotSelector from './PlotSelector.vue';
import { useFilterStore } from '@/stores/filterStore';
import { useSelectionStore } from '@/stores/selectionStore';
import { storeToRefs } from 'pinia';
import { computed } from 'vue';

const globalSettings = useGlobalSettings();
const filterStore = useFilterStore();
const selectionStore = useSelectionStore();
const { filters } = storeToRefs(filterStore);

const selectionsCount = computed(
    () => selectionStore.modifiedSelections.length
);
const filtersCount = computed(() => filters.value.length);

function removeFilter(index: number) {
    filterStore.removeFilter(index);
}
function removeSelection(plotName: string) {
    console.log(plotName);
    selectionStore.removeSelectionByPlotName(plotName);
}
function addFilter() {
    for (const selection of selectionStore.modifiedSelections) {
        filterStore.addFilter({
            plotName: selection.plotName,
            range: [selection.range[0], selection.range[1]],
        });
    }
}

const cellAttributesOpen = ref(true);
</script>

<template>
    <q-list>
        <div class="selections-filters-container">
            <q-expansion-item>
                <template v-slot:header>
                    <q-item-section> Selections </q-item-section>
                    <q-item-section side>
                        <q-chip
                            size="md"
                            square
                            dense
                            color="grey-3"
                            text-color="black"
                        >
                            {{ selectionsCount ? selectionsCount : 'None' }}
                        </q-chip>
                    </q-item-section>
                </template>
                <q-list>
                    <q-item
                        v-for="(
                            selection, index
                        ) in selectionStore.modifiedSelections"
                        :key="index"
                    >
                        <q-item-section avatar top left>
                            <q-avatar icon="scatter_plot" style="width: 18px" />
                        </q-item-section>

                        <q-item-section>
                            <q-item-label
                                style="font-size: 14px; margin-left: -20px"
                            >
                                {{ selection.plotName }}
                            </q-item-label>
                            <q-item-label
                                caption
                                style="margin-left: -20px; white-space: nowrap"
                            >
                                {{ selection.range[0].toFixed(2) }} –
                                {{ selection.range[1].toFixed(2) }}
                            </q-item-label>
                        </q-item-section>

                        <q-item-section side>
                            <q-btn
                                class="gt-xs"
                                @click="removeSelection(selection.plotName)"
                                size="12px"
                                flat
                                dense
                                round
                                icon="delete"
                            />
                        </q-item-section>
                    </q-item>
                </q-list>
            </q-expansion-item>
            <q-separator />
            <q-btn
                flat
                icon="arrow_downward"
                icon-right="arrow_downward"
                label="Convert to Filters"
                no-caps
                class="filter-style w-100"
                @click="addFilter"
            />
            <q-separator />
            <q-expansion-item>
                <template v-slot:header>
                    <q-item-section> Filters </q-item-section>
                    <q-item-section side>
                        <q-chip
                            size="md"
                            square
                            dense
                            color="grey-3"
                            text-color="black"
                        >
                            {{ filtersCount ? filtersCount : 'None' }}
                        </q-chip>
                    </q-item-section>
                </template>
                <q-list>
                    <q-item
                        v-for="(filter, index) in filters"
                        :key="index"
                        clickable
                        v-ripple
                    >
                        <q-item-section avatar top left>
                            <q-avatar icon="scatter_plot" style="width: 18px" />
                        </q-item-section>

                        <q-item-section>
                            <q-item-label
                                style="font-size: 14px; margin-left: -20px"
                            >
                                {{ filter.plotName }}
                            </q-item-label>
                            <q-item-label
                                caption
                                style="margin-left: -20px; white-space: nowrap"
                            >
                                [{{ filter.range[0] }}-{{ filter.range[1] }}]
                            </q-item-label>
                        </q-item-section>

                        <q-item-section side>
                            <q-btn
                                class="gt-xs"
                                @click="removeFilter(index)"
                                size="12px"
                                flat
                                dense
                                round
                                icon="delete"
                            />
                        </q-item-section>
                    </q-item>
                </q-list>
            </q-expansion-item>
        </div>

        <q-expansion-item
            v-model="cellAttributesOpen"
            icon="scatter_plot"
            label="Cell Attributes"
        >
            <q-card :dark="globalSettings.darkMode">
                <PlotSelector></PlotSelector>
            </q-card>
        </q-expansion-item>

        <q-separator />

        <!-- <q-expansion-item icon="linear_scale" label="Track Attributes">
            <q-card :dark="globalSettings.darkMode">
                <PlotSelector></PlotSelector>
            </q-card>
        </q-expansion-item>

        <q-separator />

        <q-expansion-item icon="account_tree" label="Lineage Attributes">
            <q-card :dark="globalSettings.darkMode">
                <PlotSelector></PlotSelector>
            </q-card>
        </q-expansion-item> -->
        <q-separator />
    </q-list>
</template>

<style scoped lange="scss">
.grey-background {
    background-color: white;
}

.grey-background.q-expansion-item--expanded {
    background-color: #f0f0f0;
}
.selections-filters-container {
    border: 1px solid #e0e0e0;
    border-radius: 4px;
    margin-bottom: 16px;
}
</style>
