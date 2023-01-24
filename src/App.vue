<script setup lang="ts">
import { ref } from 'vue';
import GridstackLayout from './components/GridstackLayout.vue';
import GlobalSettingsView from './components/GlobalSettingsView.vue';

let fullscreen = ref(false);
</script>

<template>
    <div class="d-flex flex-row">
        <div class="vh-100">
            <GlobalSettingsView></GlobalSettingsView>
        </div>
        <div class="flex-grow-1">
            <GridstackLayout></GridstackLayout>
        </div>
    </div>
</template>

<style scoped>
.flex-grow-1 {
    flex-grow: 1;
}
</style>
