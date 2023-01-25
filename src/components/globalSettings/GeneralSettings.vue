<template>
    <div class="form-check form-switch">
        <input
            class="form-check-input"
            type="checkbox"
            role="switch"
            id="darkModeToggle"
            v-model="globalSettings.darkMode"
        />
        <label class="form-check-label" for="darkModeToggle"
            >Toggle Dark Mode</label
        >
    </div>
</template>

<script setup lang="ts">
import { useGlobalSettings } from '@/stores/globalSettings';

const globalSettings = useGlobalSettings();
</script>

<style scoped lange="scss"></style>
