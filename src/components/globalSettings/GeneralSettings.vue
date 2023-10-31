<script setup lang="ts">
import { useGlobalSettings } from '@/stores/globalSettings';
import type LooneageViewSettingsSidebarVue from '../LooneageViewSettingsSidebar.vue';
const globalSettings = useGlobalSettings();
</script>

<template>
    <q-list>
        <q-expansion-item
            group="settings"
            icon="public"
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

        <q-expansion-item group="settings" icon="image" label="Images">
            <q-card :dark="globalSettings.darkMode">
                <q-card-section>
                    <ImageViewerSettingsSidebar />
                </q-card-section>
            </q-card>
        </q-expansion-item>
        <q-separator />

        <q-expansion-item group="settings" icon="image" label="Looneage">
            <q-card :dark="globalSettings.darkMode">
                <q-card-section>
                    <LooneageViewSettingsSidebar />
                </q-card-section>
            </q-card>
        </q-expansion-item>
    </q-list>
</template>

<style scoped lange="scss"></style>
