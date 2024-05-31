  <script setup lang="ts">
import { useGlobalSettings } from '@/stores/globalSettings';
const globalSettings = useGlobalSettings();
</script>

<template>
    
    <q-list>
        <q-expansion-item
            group="settings"
            icon = "scatter_plot"
            label="Cell Attributes"
            v-model="globalSettings.settingsAccordion['general']">
            <q-card :dark="globalSettings.darkMode">
                <q-card-section>
                  <div>Univariate Plots</div>
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
                  <div>Univariate Plots</div>
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
                  <div>Univariate Plots</div>
                </q-card-section>
            </q-card>
        </q-expansion-item>
        <q-separator />
    </q-list>
</template>

<style scoped lange="scss"></style>