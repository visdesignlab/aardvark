<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { useProvenanceStore } from '@/stores/provenanceStore';
import { ProvVisCreator } from '@trrack/vis-react';
import type { NodeId } from '@trrack/core';
const provenanceStore = useProvenanceStore();
const trrackVisContainer = ref(null);

// Store this somewhere. Maybe local storage?
const bookmarkedNodes: NodeId[] = [];

onMounted(() => {
    // Setter function to add/remove a node from bookmark list
    // This is passed to bookmarkNode in TrrackVis config
    const bookmarkNodeCallback = (nodeId: NodeId) => {
        const idx = bookmarkedNodes.indexOf(nodeId);

        if (idx === -1) {
            bookmarkedNodes.push(nodeId);
        } else {
            bookmarkedNodes.splice(idx, 1);
        }
    };

    // Getter function to check if a node is bookmarked
    // This is passed to isBookmarked in TrrackVis config
    const isBookmarkedCallback = (id: NodeId) => {
        return bookmarkedNodes.includes(id);
    };

    ProvVisCreator(trrackVisContainer.value, provenanceStore.provenance, {
        isBookmarked: isBookmarkedCallback,
        bookmarkNode: bookmarkNodeCallback,
    });
});
</script>

<template>
    <div ref="trrackVisContainer" class="d-flex flex-center"></div>
</template>

<style scoped lang="scss"></style>
