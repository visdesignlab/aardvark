<script setup lang="ts">
import {ref} from 'vue';
import { useGlobalSettings } from '@/stores/globalSettings';
import UnivariateCellPlot from './UnivariateCellPlot.vue';
import type { Vue } from 'vue-demi';
const globalSettings = useGlobalSettings();

const showing = ref(true);
function hideSelection() {
  showing.value = false;
}
</script>

<template>
    <q-list>
        <div class="q-pa-md q-gutter-md">
        <q-list id="currentSelectionsItem">
            <q-item-label lines="1">Current Selections</q-item-label>

          <q-item id='currentSelectionsItem' clickable v-ripple v-if="showing">
            <q-item-section avatar top left>
              <q-avatar icon="scatter_plot" style="width: 18px"/>
            </q-item-section>

            <q-item-section>
              <q-item-label style="font-size: 14px; margin-left: -20px;">Mass (pg)</q-item-label>
              <q-item-label id = "currSel" false caption style="margin-left: -20px; white-space: nowrap">[500-1000]</q-item-label>
            </q-item-section>

            <q-item-section side>
                <q-btn class="gt-xs" size="12px" flat dense round icon="filter_alt" />
                <q-btn class="gt-xs" @click="hideSelection" size="12px" flat dense round icon="delete" />
            </q-item-section>
          </q-item>

          

        </q-list>
        <q-list>

          <q-separator spaced />
          <q-item-label lines="1">Current Filters</q-item-label>

          <q-item clickable v-ripple>
            <q-item-section avatar top left>
              <q-avatar icon="linear_scale" style="width: 18px"/>
            </q-item-section>

            <q-item-section>
              <q-item-label style="font-size: 14px; margin-left: -20px;">Track Length</q-item-label>
              <q-item-label caption style="margin-left: -20px; white-space: nowrap">[10-20]</q-item-label>
            </q-item-section>

            <q-item-section side>
                <q-btn class="gt-xs" size="12px" flat dense round icon="delete" />
            </q-item-section>
          </q-item>
        </q-list>
      </div>
        <q-separator />
        <q-expansion-item
            group="settings"
            icon = "scatter_plot"
            label="Cell Attributes"
            v-model="globalSettings.settingsAccordion['general']">
            <q-card :dark="globalSettings.darkMode">
                <q-card-section id="cellPlots">
                  <UnivariateCellPlot></UnivariateCellPlot>
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
                <q-card-section>
                  <UnivariateCellPlot></UnivariateCellPlot>
                </q-card-section>
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
                <q-card-section>
                  <UnivariateCellPlot></UnivariateCellPlot>
                </q-card-section>
            </q-card>
        </q-expansion-item>
        <q-separator />
    </q-list>
</template>

<style scoped lange="scss"></style>