import { ref } from 'vue';
import { defineStore } from 'pinia';

export interface LayoutItem {
    component: string;
    x: number;
    y: number;
    w: number;
    h: number;
    id: number;
    fullscreen: boolean;
    props?: any;
}

export interface Layout {
    layoutName: string;
    items: LayoutItem[];
}

export const useLayoutConfig = defineStore('layoutConfig', () => {
    let id = 0;
    const currentLayout = ref<Layout>({
        layoutName: 'default',
        items: [
            {
                component: 'DatasetSelector',
                x: 0,
                y: 0,
                w: 12,
                h: 3,
                id: id++,
                fullscreen: false,
            },
            {
                component: 'LooneageView',
                x: 0,
                y: 3,
                w: 12,
                h: 10,
                id: id++,
                fullscreen: false,
                props: {
                    // attrKey: 'Dry Mass (pg)',
                    attrKey: 'mass',
                },
            },
            {
                component: 'SimpleTable',
                x: 0,
                y: 13,
                w: 4,
                h: 4,
                id: id++,
                fullscreen: false,
                props: {
                    attributeLevel: 'lineage',
                },
            },
            {
                component: 'SimpleTable',
                x: 4,
                y: 13,
                w: 4,
                h: 4,
                id: id++,
                fullscreen: false,
                props: {
                    attributeLevel: 'track',
                },
            },
            {
                component: 'SimpleTable',
                x: 8,
                y: 13,
                w: 4,
                h: 4,
                id: id++,
                fullscreen: false,
                props: {
                    attributeLevel: 'cell',
                },
            },
        ],
    });

    const layoutOptions = ref<Layout[]>([currentLayout.value]);

    return { currentLayout, layoutOptions };
});
