<script setup lang="ts">
import { useGlobalSettings } from '@/stores/globalSettings';
import { onKeyStroke } from '@vueuse/core';
const globalSettings = useGlobalSettings();
onKeyStroke(['b', 'B'], (e: KeyboardEvent) => {
    if (globalSettings.usingMac && !e.metaKey) return;
    if (!globalSettings.usingMac && !e.ctrlKey) return;
    globalSettings.toggleLastActive();
});
</script>

<template>
    <div class="d-flex ps-1 pt-1 pb-1 h-100">
        <div class="btn-group-vertical justify-content-start" role="group">
            <button
                v-for="setting in globalSettings.settingsPages"
                :key="setting.id"
                :title="setting.name"
                :class="`flex-grow-0 btn btn-lg ${
                    setting.show
                        ? `btn-${globalSettings.btnDark}`
                        : `btn-${globalSettings.btnLight}`
                }`"
                @click="() => globalSettings.toggleShown(setting)"
            >
                <font-awesome-icon :icon="`fa-solid ${setting.faKey}`" />
            </button>
        </div>
        <Transition name="slide-right">
            <div
                v-if="globalSettings.activePage != null"
                class="settings-panel p-3"
            >
                <h5>
                    {{ globalSettings.activePage.name }}
                </h5>
                <hr />
                <component
                    :is="globalSettings.activePage.component"
                ></component>
            </div>
        </Transition>
    </div>
</template>

<style scoped lang="scss">
$panel-width: 300px;

.flex-grow-0 {
    flex-grow: 0;
}

.settings-panel {
    width: $panel-width;
    position: relative;
    left: 0px;
}

.slide-right-enter-active,
.slide-right-leave-active {
    transition: all 0.3s ease;
    left: 0px;
}

.slide-right-enter-from,
.slide-right-leave-to {
    opacity: 0.05;
    left: -$panel-width;
}
</style>
