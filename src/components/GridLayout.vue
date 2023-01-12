<template>
    <grid-layout v-model:layout="layout" :col-num="12" :row-height="30">
        <template #default="{ gridItemProps }">
            <grid-item
                v-for="item in layout"
                :key="item.i"
                v-bind="gridItemProps"
                :x="item.x"
                :y="item.y"
                :w="item.w"
                :h="item.h"
                :i="item.i"
                @resize="resize"
                @move="move"
                @moved="moved"
                drag-allow-from=".draggable"
                drag-ignore-from=".no-drag"
            >
                <div class="draggable"></div>
                <div class="no-drag">
                    {{ item.i }}
                </div>
            </grid-item>
        </template>
    </grid-layout>
</template>

<script setup lang="ts">
// import VueGridLayout from 'vue-grid-layout';
import { GridLayout, GridItem } from 'vue3-drr-grid-layout';
const layout = [
    { x: 0, y: 0, w: 2, h: 2, i: 0 },
    { x: 2, y: 0, w: 2, h: 4, i: 1 },
    { x: 4, y: 0, w: 2, h: 5, i: 2 },
    { x: 6, y: 0, w: 2, h: 3, i: 3 },
    { x: 8, y: 0, w: 2, h: 3, i: 4 },
    { x: 8, y: 0, w: 2, h: 3, i: 5 },
    { x: 0, y: 5, w: 2, h: 5, i: 6 },
    { x: 2, y: 5, w: 2, h: 5, i: 7 },
    { x: 4, y: 5, w: 2, h: 5, i: 8 },
    { x: 6, y: 3, w: 2, h: 4, i: 9 },
];
</script>

<style scoped lange="scss">
.draggable {
    position: absolute;
    width: 20px;
    height: 20px;
    top: 0;
    right: 0;
    padding: 0 8px 8px 0;
    background-origin: content-box;
    background-color: black;
    box-sizing: border-box;
    border-radius: 10px;
    cursor: pointer;
}

.vue-grid-item .no-drag {
    height: 100%;
    width: 100%;
}
</style>
