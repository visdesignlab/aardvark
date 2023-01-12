<template>
    <div class="grid-stack">
        <div
            v-for="(w, indexs) in items"
            class="grid-stack-item"
            :gs-x="w.x"
            :gs-y="w.y"
            :gs-w="w.w"
            :gs-h="w.h"
            :gs-id="w.id"
            :id="w.id"
            :key="indexs"
        >
            <div class="grid-stack-item-content widget">
                <div class="drag-target test"></div>
                {{ w }}
                <TestComponent2></TestComponent2>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { onMounted } from 'vue';
import { GridStack, type GridStackOptions, type DDDragOpt } from 'gridstack';
import 'gridstack/dist/gridstack.min.css';
import TestComponent1 from './TestComponent1.vue';
import TestComponent2 from './TestComponent2.vue';
let count = 0;
let info = '';
let grid: GridStack | null = null; // DO NOT use ref(null) as proxies GS will break all logic when comparing structures... see https://github.com/gridstack/gridstack.js/issues/2115
const items = ref([
    { x: 0, y: 0, w: 6, h: 10, id: 1 },
    { x: 6, y: 0, w: 6, h: 5, id: 2 },
    { x: 6, y: 5, w: 6, h: 5, id: 3 },
    { x: 0, y: 10, w: 12, h: 3, id: 4 },
    // { x: 2, y: 4, w: 3 },
    //     { x: 4, y: 2 },
    //     { x: 3, y: 1, h: 2 },
    //     { x: 0, y: 6, w: 2, h: 2 },
]);

onMounted(() => {
    // let args: GridStackOptions;
    grid = GridStack.init({
        // DO NOT user grid.value = GridStack.init(), see above
        float: true,
        cellHeight: '70px',
        minRow: 1,
        draggable: {
            handle: '.drag-target',
        },
    });
    grid.on('change', (event: any, changeItems: any) => {
        changeItems.forEach((item: any) => {
            var widget = items.value.find((w) => w.id == item.id);
            if (!widget) {
                alert('Widget not found: ' + item.id);
                return;
            }
            widget.x = item.x;
            widget.y = item.y;
            widget.w = item.w;
            widget.h = item.h;
        });
    });
    // grid.on('dragstart', (event: Event, element: any, ...args: any[]) => {
    //     console.log({ event, element, args });
    //     // event.preventDefault();
    // });
    // grid.on('dragstop', function (_event: any, element: any) {
    //     const node = element.gridstackNode;
    //     info = `you just dragged node #${node.id} to ${node.x},${node.y} – good job!`;
    // });
});

function addNewWidget() {
    const node: any = items[count] || {
        x: Math.round(12 * Math.random()),
        y: Math.round(5 * Math.random()),
        w: Math.round(1 + 3 * Math.random()),
        h: Math.round(1 + 3 * Math.random()),
    };
    node.id = node.content = String(count++);
    grid?.addWidget(node);
}
</script>

<style scoped lange="scss">
.widget {
    background: #ebebeb;
    box-shadow: black 0 0 0 0;
    border: solid grey 1px;
}

.test {
    width: 20px;
    height: 20px;
    background: red;
}
</style>
