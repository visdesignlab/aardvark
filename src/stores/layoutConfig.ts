import { ref, computed } from 'vue';
import { defineStore } from 'pinia';
import { v4 as uuidv4 } from 'uuid';
export interface LayoutItem {
    // gridstack properties plus my own
    component: string;
    x: number;
    y: number;
    w: number;
    h: number;
    id: string;
    props?: any;
}

export interface GridstackItem {
    // properties expected by a gridstack item
    x: number;
    y: number;
    w: number;
    h: number;
    id: string;
}

export interface Layout {
    layoutName: string;
    items: LayoutItem[];
}

export const useLayoutConfig = defineStore('layoutConfig', () => {
    const currentLayout = ref<Layout>({
        layoutName: 'default',
        items: [
            {
                component: 'DatasetSelector',
                x: 0,
                y: 0,
                w: 12,
                h: 3,
                id: uuidv4(),
            },
            {
                component: 'LooneageView',
                x: 0,
                y: 3,
                w: 12,
                h: 10,
                id: uuidv4(),
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
                id: uuidv4(),
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
                id: uuidv4(),
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
                id: uuidv4(),
                props: {
                    attributeLevel: 'cell',
                },
            },
        ],
    });

    const layoutOptions = ref<Layout[]>([currentLayout.value]);
    const currentLayoutLookup = computed<Map<string, LayoutItem>>(() => {
        const lookup = new Map();
        for (const item of currentLayout.value.items) {
            lookup.set(item.id, item);
        }
        return lookup;
    });
    function updateItem(newItem: GridstackItem): void {
        const oldItem = currentLayoutLookup.value.get(newItem.id);
        if (oldItem == null) return;
        oldItem.x = newItem.x;
        oldItem.y = newItem.y;
        oldItem.w = newItem.w;
        oldItem.h = newItem.h;
    }

    return { currentLayout, layoutOptions, updateItem };
});
