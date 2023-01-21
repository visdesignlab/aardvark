<template>
    <div class="grid-stack">
        <div
            v-for="(w, index) in items"
            class="grid-stack-item"
            :gs-x="w.x"
            :gs-y="w.y"
            :gs-w="w.w"
            :gs-h="w.h"
            :gs-id="w.id"
            :id="w.id"
            :key="index"
        >
            <div class="grid-stack-item-content card" :id="`container-${w.id}`">
                <div class="card-header drag-target d-flex">
                    <span
                        class="flex-grow-1 d-flex flex-column justify-content-center"
                        >{{ w.component }}</span
                    >
                    <button
                        class="btn btn-sm btn-outline-dark float-end"
                        @click="toggleFullscreen(`container-${w.id}`)"
                    >
                        <font-awesome-icon
                            v-if="!isFullScreen"
                            font-awesome-icon
                            icon="expand"
                        />
                        <font-awesome-icon
                            v-if="isFullScreen"
                            icon="compress"
                        />
                    </button>
                </div>
                <div class="card-body scroll-y">
                    <component :is="w.component" v-bind="w.props"></component>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive } from 'vue';
import { onMounted } from 'vue';
import { GridStack, type GridStackOptions, type DDDragOpt } from 'gridstack';
import screenfull from 'screenfull';
import 'gridstack/dist/gridstack.min.css';
import TestComponent1 from './TestComponent1.vue';
import TestComponent2 from './TestComponent2.vue';
import HorizonChart from './HorizonChart.vue';
import { useCounterStore } from '@/stores/counter';
import { useTemporalPoints } from '@/stores/temporalPoints';
import { useListOfTemporalPoints } from '@/stores/listOfTemporalPoints';

const counter = useCounterStore();
// const temporalPoints = useTemporalPoints();
const lisfOfTemporalPoints = useListOfTemporalPoints();

// useful reference
// https://stackoverflow.com/questions/72813397/gridstack-js-vue-3-components
// let isFullScreen = computed(() => {
//     console.log('computed');
//     return document.fullscreenElement !== null;
// });

let isFullScreen = ref(false);
let count = 0;
let grid: GridStack | null = null; // DO NOT use ref(null) as proxies GS will break all logic when comparing structures... see https://github.com/gridstack/gridstack.js/issues/2115
const items = ref([
    {
        component: 'HorizonChart',
        x: 0,
        y: 0,
        w: 6,
        h: 10,
        id: 1,
        fullscreen: false,
        props: {
            chartWidth: 200,
            chartHeight: 50,
            dataStore: lisfOfTemporalPoints.currentList,
            attrKey: 'x',
            info: '',
            settings: {
                baseline: 0,
                modHeight: 5,
                mirrorNegative: false,
                includeBinLine: true,
            },
        },
    },
    {
        component: 'DatasetSelector',
        x: 6,
        y: 0,
        w: 6,
        h: 5,
        id: 2,
        fullscreen: false,
    },
    {
        component: 'TestComponent1',
        x: 6,
        y: 5,
        w: 6,
        h: 5,
        id: 3,
        fullscreen: false,
        props: { counterState: counter },
    },
    {
        component: 'TestComponent2',
        x: 0,
        y: 10,
        w: 12,
        h: 3,
        id: 4,
        fullscreen: false,
    },
]);

onMounted(() => {
    // let args: GridStackOptions;
    grid = GridStack.init({
        // DO NOT user grid.value = GridStack.init(), see above
        float: true,
        cellHeight: '70px',
        minRow: 1,
        resizable: {
            handles: 'e,se,s,w',
        },
        draggable: {
            handle: '.drag-target',
        },
        margin: 7,
    });
    grid.on('change', (event: any, changeItems: any) => {
        if (changeItems == null) return;
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

async function toggleFullscreen(elementId: string) {
    const element = document.getElementById(elementId);
    if (screenfull.isEnabled && element) {
        await screenfull.toggle(element);
        isFullScreen.value = screenfull.isFullscreen;
    }
}
</script>

<style scoped lang="scss">
@import '../App.scss';
.widget {
    background: $gray-100;
}

.drag-target {
    cursor: move;
}

.scroll-y {
    overflow-y: auto;
}
</style>
