<script setup lang="ts">
import { useGlobalSettings } from '@/stores/globalSettings';
import { useImageViewerStore } from '@/stores/imageViewerStore';
import { useCellMetaData } from '@/stores/cellMetaData';
import { storeToRefs } from 'pinia';
import { useEventBusStore } from '@/stores/eventBusStore';
import { useDatasetSelectionStore } from '@/stores/datasetSelectionStore';

const datasetSelectionStore = useDatasetSelectionStore();
const cellMetaData = useCellMetaData();
const imageViewerStore = useImageViewerStore();
const eventBusStore = useEventBusStore();
const globalSettings = useGlobalSettings();
const { currentImageStackMetadata } = storeToRefs(datasetSelectionStore);
</script>

<template>
    <template v-if="cellMetaData.dataInitialized">
        <q-btn
            round
            flat
            @click="eventBusStore.emitter.emit('resetImageView')"
            icon="center_focus_strong"
            title="reset view"
        />
        <q-btn-group outline rounded class="q-mr-md">
            <q-btn
                @click="imageViewerStore.stepBackwards"
                size="sm"
                outline
                round
                title="previous frame"
                icon="arrow_left"
            />
            <q-btn
                @click="
                    () =>
                        imageViewerStore.stepForwards(
                            (currentImageStackMetadata?.sizeT ?? 1) - 1
                        )
                "
                size="sm"
                outline
                round
                title="next frame"
                icon="arrow_right"
            />
        </q-btn-group>
        <q-slider
            class="mw-150"
            v-model="imageViewerStore.frameNumber"
            :min="1"
            :max="currentImageStackMetadata?.sizeT"
            label
            switch-label-side
            :dark="globalSettings.darkMode"
        />
        <span class="text-caption q-ml-sm no-break"
            >{{ imageViewerStore.frameNumber }} /
            {{ currentImageStackMetadata?.sizeT ?? 1 }}</span
        >
    </template>
</template>
<style scoped lang="scss">
.mw-150 {
    max-width: 150px;
}

.no-break {
    white-space: pre;
}
</style>
