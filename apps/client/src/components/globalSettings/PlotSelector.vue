<template>
    <UnivariateCellPlot
        v-for="plotName in plotNames"
        :key="plotName"
        :plot-name="plotName"
        :plot-brush="plotBrush"
    ></UnivariateCellPlot>
</template>

<script lang="ts" setup>
import { ref, computed, toRaw, watch } from 'vue';
import { QBtn } from 'quasar';
import * as vg from '@uwdata/vgplot';
import { useCellMetaData } from '@/stores/cellMetaData';
import { useDatasetSelectionStore } from '@/stores/datasetSelectionStore';
import { storeToRefs } from 'pinia';
import UnivariateCellPlot from './UnivariateCellPlot.vue';

const plotNames = ref(['A', 'y', 'mass', 'time', 'x']);

const plotBrush = vg.Selection.intersect();
vg.Selection.crossfilter();
</script>
