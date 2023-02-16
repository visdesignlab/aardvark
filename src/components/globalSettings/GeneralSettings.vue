<script setup lang="ts">
import { useGlobalSettings } from '@/stores/globalSettings';

const globalSettings = useGlobalSettings();
</script>

<template>
    <q-toggle
        v-model="globalSettings.darkMode"
        checked-icon="mdi-weather-night"
        color="blue"
        unchecked-icon="mdi-weather-sunny"
        label="Toggle Dark Mode"
    />
</template>

<style scoped lange="scss"></style>
