<script setup lang="ts">
import { ref } from 'vue';
import { useGlobalSettings } from '@/stores/globalSettings';
import PlotSelector from './PlotSelector.vue';
import type { Vue } from 'vue-demi';
import { useFilterStore } from '@/stores/filterStore';
import { useSelectionStore } from '@/stores/selectionStore';
import { storeToRefs } from 'pinia';

const globalSettings = useGlobalSettings();
const filterStore = useFilterStore();
const selectionStore = useSelectionStore();
const { filters } = storeToRefs(filterStore);
const { Selections } = storeToRefs(selectionStore);

const emit = defineEmits(['clearSelection']);

function removeFilter(index: number) {
    filterStore.removeFilter(index);
}
function removeSelection(index: number) {
    selectionStore.removeSelection(index);
    const plotName = Selections.value[index]?.plotName;

    selectionStore.removeSelectionByPlotName(plotName);
}
</script>

<template>
    <q-list>
        <div class="selections-filters-container">
            <q-expansion-item label="Current Selections">
                <q-list>
                    <!-- <q-item-label lines="1">Current Selections</q-item-label> -->
                    <q-item
                        v-for="(selection, index) in Selections"
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
                                {{ selection.plotName }}
                            </q-item-label>
                            <q-item-label
                                caption
                                style="margin-left: -20px; white-space: nowrap"
                            >
                                [{{ selection.range[0] }}-{{
                                    selection.range[1]
                                }}]
                            </q-item-label>
                        </q-item-section>

                        <q-item-section side>
                            <q-btn
                                class="gt-xs"
                                @click="removeSelection(index)"
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
            <q-expansion-item label="Current Filters">
                <q-list>
                    <!-- <q-item-label lines="1">Current Filters</q-item-label> -->
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
            group="settings"
            icon="scatter_plot"
            label="Cell Attributes"
            v-model="globalSettings.settingsAccordion['general']"
        >
            <q-card :dark="globalSettings.darkMode">
                <q-card-section id="cellPlots">
                    <PlotSelector></PlotSelector>
                </q-card-section>
            </q-card>
        </q-expansion-item>

        <q-separator />

        <q-expansion-item
            group="settings"
            icon="linear_scale"
            label="Track Attributes"
            v-model="
                globalSettings.settingsAccordion['ImageViewerSettingsSidebar']
            "
        >
            <q-card :dark="globalSettings.darkMode">
                <q-card-section> </q-card-section>
            </q-card>
        </q-expansion-item>
        <q-separator />

        <q-expansion-item
            group="settings"
            icon="account_tree"
            label="Lineage Attributes"
            v-model="
                globalSettings.settingsAccordion['LooneageViewSettingsSidebar']
            "
        >
            <q-card :dark="globalSettings.darkMode">
                <q-card-section> </q-card-section>
            </q-card>
        </q-expansion-item>
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
