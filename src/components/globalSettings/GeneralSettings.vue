<script setup lang="ts">
import { useGlobalSettings } from '@/stores/globalSettings';
import { useImageViewerStore } from '@/stores/imageViewerStore';
import { useImageViewerStoreUntrracked } from '@/stores/imageViewerStoreUntrracked';
import { useDatasetSelectionStore } from '@/stores/datasetSelectionStore';
import { useEventBusStore } from '@/stores/eventBusStore';

import { storeToRefs } from 'pinia';
import { watch } from 'vue';
import { debounce } from 'lodash-es';

const imageViewerStore = useImageViewerStore();
const imageViewerStoreUntrracked = useImageViewerStoreUntrracked();
const globalSettings = useGlobalSettings();
const eventBusStore = useEventBusStore();
const datasetSelectionStore = useDatasetSelectionStore();
const { currentImageStackMetadata } = storeToRefs(datasetSelectionStore);
const { contrastLimitSlider } = storeToRefs(imageViewerStoreUntrracked);

watch(
    contrastLimitSlider,
    debounce(() => {
        // only update store periodically so provStore is
        // not overwhelmed with new nodes
        imageViewerStore.contrastLimitSliderDebounced =
            contrastLimitSlider.value;
    }, 500)
);
watch(
    () => imageViewerStore.contrastLimitSliderDebounced,
    () => {
        // if the store changes (via a traversal in the prov tree)
        // update the slider
        contrastLimitSlider.value =
            imageViewerStore.contrastLimitSliderDebounced;
    }
);

// const contrastLimit = computed<[number, number][]>(() => {
//     return [[contrastLimitSlider.value.min, contrastLimitSlider.value.max]];
// });

// function resetImageView() {
//     $emit('resetImageView');
// }
</script>

<template>
    <q-list>
        <q-expansion-item
            group="somegroup"
            icon="explore"
            label="General"
            default-opened
        >
            <q-card :dark="globalSettings.darkMode">
                <q-card-section>
                    <q-toggle
                        v-model="globalSettings.darkMode"
                        checked-icon="mdi-weather-night"
                        color="blue"
                        unchecked-icon="mdi-weather-sunny"
                        label="Toggle Dark Mode"
                    />
                </q-card-section>
            </q-card>
        </q-expansion-item>

        <q-separator />

        <q-expansion-item group="somegroup" icon="perm_identity" label="Images">
            <q-card :dark="globalSettings.darkMode">
                <q-card-section>
                    <q-badge outline :color="globalSettings.normalizedBlack"
                        >Frame:</q-badge
                    >
                    <q-slider
                        class="force-repeat"
                        v-model="imageViewerStore.frameNumber"
                        :min="1"
                        :max="currentImageStackMetadata?.sizeT"
                        label
                        :dark="globalSettings.darkMode"
                    />
                    <q-badge outline :color="globalSettings.normalizedBlack"
                        >Layers:</q-badge
                    >
                    <div class="flex column">
                        <q-toggle
                            v-model="imageViewerStore.showImageLayer"
                            label="Image"
                        />
                        <q-card-section>
                            <q-badge
                                outline
                                :color="globalSettings.normalizedBlack"
                                >Colormap:</q-badge
                            >
                            <q-select
                                v-model="imageViewerStore.colormap"
                                :options="imageViewerStore.colormapOptions"
                                :dark="globalSettings.darkMode"
                                outlined
                                dense
                                class="mb-3"
                            ></q-select>
                            <!-- </div> -->

                            <q-badge
                                outline
                                :color="globalSettings.normalizedBlack"
                                >Dynamic Range:</q-badge
                            >
                            <q-range
                                v-model="contrastLimitSlider"
                                :min="
                                    imageViewerStore.contrastLimitExtentSlider
                                        .min
                                "
                                :max="
                                    imageViewerStore.contrastLimitExtentSlider
                                        .max
                                "
                                :step="1"
                                label
                                :dark="globalSettings.darkMode"
                                class="mb-3"
                            />
                        </q-card-section>
                        <q-toggle
                            v-model="imageViewerStore.showCellBoundaryLayer"
                            label="Cell Boundary"
                        />
                        <q-toggle
                            v-model="imageViewerStore.showTrailLayer"
                            label="Trail"
                        />
                        <q-card-section>
                            <q-badge
                                outline
                                :color="globalSettings.normalizedBlack"
                                >Trail Length:</q-badge
                            >
                            <q-slider
                                v-model="imageViewerStore.trailLength"
                                :min="0"
                                :max="currentImageStackMetadata?.sizeT"
                                label
                                :dark="globalSettings.darkMode"
                            />
                        </q-card-section>
                        <q-toggle
                            v-model="imageViewerStore.showLineageLayer"
                            label="Lineage"
                        />
                    </div>
                    <q-btn @click="eventBusStore.emitter.emit('resetImageView')"
                        >Reset View</q-btn
                    >
                </q-card-section>
            </q-card>
        </q-expansion-item>
    </q-list>
</template>

<style scoped lange="scss"></style>
