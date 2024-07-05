<script setup lang="ts">
import { router } from '@/router';
import { type SettingsPage, useGlobalSettings } from '@/stores/globalSettings';
import { onKeyStroke } from '@vueuse/core';
import { ref } from 'vue';
const globalSettings = useGlobalSettings();
onKeyStroke(['b', 'B'], (e: KeyboardEvent) => {
    if (globalSettings.usingMac && !e.metaKey) return;
    if (!globalSettings.usingMac && !e.ctrlKey) return;
    globalSettings.toggleLastActive();
});

const tab = ref('Select Dataset Location');

const handleIconClick = (setting:SettingsPage) => {
    if(setting.url){
        router.push(setting.url);
    }
    isPanelVisible.value = !setting.disableSidebar;
}

const isPanelVisible = ref(true);
const collapse = () => {
    isPanelVisible.value = false;
}
</script>

<template>
    <div class="d-flex h-100 ps-1 pt-1 pb-1  flex-grow-1">
      <q-tabs
        v-model="tab"
        vertical
        class="fixed-width-tabs justify-content-start"
      >
        <template v-for="setting in globalSettings.settingsPages" :key="setting.name">
            <q-tab :name="setting.name" @click="handleIconClick(setting)">
                <template v-slot:default>
                    <div class="d-flex align-items-center">
                        <font-awesome-icon :icon="`fa-solid ${setting.faKey}`" style="height:1.3em;" />
                    </div>
                </template>
            </q-tab>
        </template>
      </q-tabs>
  
    <div class="d-flex flex-column">
        <transition name="collapse">
            <q-tab-panels
                v-model="tab"
                v-if="isPanelVisible"
                class="fixed-width-panels flex-grow-1"
                :dark="globalSettings.darkMode"
                swipeable
                vertical
                style="margin-left:5px;"
            >
                <template v-for="setting in globalSettings.settingsPages" :key="setting.name">
                <q-tab-panel :name="setting.name" style="border: 1px solid rgba(0,0,0,0.12);border-radius:4px;">
                    <div>
                        <div class="d-flex row justify-space-between align-center" style="margin-bottom:5px;">
                            <h5 style="margin-bottom:0px;">{{ setting.name }}</h5>
                            <q-icon
                                name="mdi-arrow-collapse-left"
                                size="15px"
                                @click="collapse()"
                            />
                        </div>
                        <hr />
                        <component :is="setting.component"></component>
                    </div>
                </q-tab-panel>
                </template>
            </q-tab-panels>
        </transition>
    </div>

    </div>
  </template>
  

<style scoped lang="scss">
$panel-width: 300px;

.flex-grow-0 {
    flex-grow: 0;
}
.flex-grow-1{
    flex-grow:1;
}

.fixed-width-panels{
    width:300px;
    margin-top:3px;
}

.settings-panel {
    width: $panel-width;
    position: relative;
    left: 0px;
    overflow: auto;
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

