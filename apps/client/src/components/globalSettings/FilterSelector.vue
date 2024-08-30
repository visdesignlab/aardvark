<script setup lang="ts">
import { computed, ref } from 'vue';
import { useGlobalSettings } from '@/stores/globalSettings';
import PlotSelector from './PlotSelector.vue';
import { useFilterStore } from '@/stores/filterStore';
import { type DataSelection, useSelectionStore } from '@/stores/selectionStore';
import { storeToRefs } from 'pinia';

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
            range: [
                Number(selection.range[0].toFixed(3)),
                Number(selection.range[1].toFixed(3)),
            ],
        });
    }
}

const cellAttributesOpen = ref(true);

// Dialog box, enter exact numbers ------
const showRangeDialog = ref(false);
const minInput = ref<number>();
const maxInput = ref<number>();
const customRangeSelection = ref();

function openRangeDialog(selection: DataSelection) {
    customRangeSelection.value = selection;
    minInput.value = selection.range[0];
    maxInput.value = selection.range[1];
    showRangeDialog.value = true;
}

function onSubmit() {
    if (typeof minInput.value === 'undefined') return;
    if (typeof maxInput.value === 'undefined') return;
    applyManualSelection(minInput.value, maxInput.value);
    showRangeDialog.value = false;
}

// Called when textbox values are changed.
const applyManualSelection = (min: number, max: number) => {
    if (!isNaN(min) && !isNaN(max) && min <= max) {
        selectionStore.updateSelection(customRangeSelection.value.plotName, [
            minInput.value,
            maxInput.value,
        ] as [number, number]);
    }
};

const minMaxFormError = computed<string | boolean>(() => {
    // returns an error string if invalid
    // otherwise returns false
    // @ts-ignore: actually it can be '', I would expect quasar to make this undefined or null, but it doesn't
    if (typeof minInput.value === 'undefined' || minInput.value === '')
        return 'Min cannot be undefined.';
    // @ts-ignore: actually it can be '', I would expect quasar to make this undefined or null, but it doesn't
    if (typeof maxInput.value === 'undefined' || maxInput.value === '')
        return 'Max cannot be undefined.';
    if (minInput.value > maxInput.value)
        return 'Min should be less than or equal to Max.';
    return false;
});

const minMaxFormValid = computed<boolean>(() => {
    return !minMaxFormError.value;
});
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
                        <!-- Q-Menu for other options -->
                        <q-menu touch-position context-menu>
                            <q-item
                                clickable
                                v-close-popup
                                @click="openRangeDialog(selection)"
                            >
                                <q-item-section>Enter Range</q-item-section>
                            </q-item>
                        </q-menu>

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
                dense
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
    <q-dialog v-model="showRangeDialog">
        <q-card>
            <q-card-section>
                <div class="text-h6">Enter Range</div>
            </q-card-section>

            <q-card-section>
                <q-form @submit="onSubmit" class="q-gutter-md">
                    <q-input
                        filled
                        type="number"
                        step="any"
                        v-model.number="minInput"
                        label="Min"
                        lazy-rules
                    />

                    <q-input
                        filled
                        type="number"
                        step="any"
                        v-model.number="maxInput"
                        label="Max"
                        lazy-rules
                    />
                    <q-banner
                        v-if="minMaxFormError"
                        dense
                        class="text-white bg-red"
                        >{{ minMaxFormError }}</q-banner
                    >
                    <div>
                        <q-btn
                            label="Submit"
                            type="submit"
                            color="primary"
                            :disable="!minMaxFormValid"
                        />
                        <q-btn
                            label="Cancel"
                            color="primary"
                            flat
                            @click="showRangeDialog = false"
                            class="q-ml-sm"
                        />
                    </div>
                </q-form>
            </q-card-section>
        </q-card>
    </q-dialog>
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
