<template>
    <ul class="list-group">
        <li
            v-for="(layout, index) in layoutConfig.systemLayoutOptions"
            :key="index"
            :class="listItemClass(layout)"
            @click="() => layoutConfig.resetLayout(layout)"
        >
            {{ layout.name }}
        </li>
        <li
            v-for="(layout, index) in layoutConfig.userLayoutOptions"
            :key="index"
            :class="listItemClass(layout)"
            @click="() => layoutConfig.resetLayout(layout)"
        >
            <span class="flex-grow-1">{{ layout.name }}</span>
            <!-- <button
                class="btn btn-outline-dark"
                @click.stop="() => layoutConfig.deleteLayout(index)"
            >
                <font-awesome-icon icon="fa-solid fa-trash-can" />
            </button> -->
            <button
                :class="buttonIconClass(layout)"
                @click.stop="() => layoutConfig.deleteLayout(index)"
            >
                <font-awesome-icon icon="fa-solid fa-trash-can" />
            </button>
        </li>
    </ul>

    <div class="mt-4 d-flex flex-column">
        <div class="btn-group" role="group">
            <button
                class="btn btn-outline-dark"
                @click="layoutConfig.createNew"
            >
                Create New
            </button>
            <button
                v-if="layoutConfig.currentLayout?.userCreated"
                class="btn btn-outline-dark"
                @click="layoutConfig.updateCurrent"
            >
                Update Current
            </button>
        </div>
    </div>
</template>

<script setup lang="ts">
import { useLayoutConfig, type Layout } from '@/stores/layoutConfig';

const layoutConfig = useLayoutConfig();
function listItemClass(layout: Layout): string {
    return `d-flex align-items-center list-group-item ${
        layout.id == layoutConfig.currentLayout?.id ? 'active' : ''
    }`;
}

function buttonIconClass(layout: Layout): string {
    return `btn btn-sm btn-outline-${
        layout.id == layoutConfig.currentLayout?.id ? 'light' : 'dark'
    }`;
}
</script>

<style scoped lange="scss"></style>
