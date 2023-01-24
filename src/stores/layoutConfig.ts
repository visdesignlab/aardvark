import { useStorage } from '@vueuse/core';
import { ref, computed } from 'vue';
import { defineStore } from 'pinia';
import { v4 as uuidv4 } from 'uuid';
import { cloneDeep } from 'lodash-es';
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
    name: string;
    userCreated: boolean;
    id: string;
    initialItems: LayoutItem[];
    currentItems: LayoutItem[];
}

export const useLayoutConfig = defineStore('layoutConfig', () => {
    const defaultItems: LayoutItem[] = [
        {
            component: 'LooneageView',
            x: 0,
            y: 0,
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
            y: 10,
            w: 4,
            h: 8,
            id: uuidv4(),
            props: {
                attributeLevel: 'lineage',
            },
        },
        {
            component: 'SimpleTable',
            x: 4,
            y: 10,
            w: 4,
            h: 8,
            id: uuidv4(),
            props: {
                attributeLevel: 'track',
            },
        },
        {
            component: 'SimpleTable',
            x: 8,
            y: 10,
            w: 4,
            h: 8,
            id: uuidv4(),
            props: {
                attributeLevel: 'cell',
            },
        },
    ];
    const defaultId = 'system_layout_0';
    const defaultLayout: Layout = {
        name: 'Equal Tables',
        userCreated: false,
        id: defaultId,
        initialItems: cloneDeep(defaultItems),
        currentItems: cloneDeep(defaultItems),
    };

    const currentLayoutId = useStorage<string>('currentLayoutId', defaultId);

    const systemLayoutOptions = ref<Layout[]>([defaultLayout]);
    const userLayoutOptions = useStorage<Layout[]>('userLayoutOptions', []);
    const allLayouts = computed<Map<string, Layout>>(() => {
        const layouts = new Map();
        for (const layout of systemLayoutOptions.value) {
            layouts.set(layout.id, layout);
        }
        for (const layout of userLayoutOptions.value) {
            layouts.set(layout.id, layout);
        }
        return layouts;
    });
    const currentLayout = computed<Layout | null>(() => {
        const layout = allLayouts.value.get(currentLayoutId.value);
        return layout ?? null;
    });
    const currentLayoutLookup = computed<Map<string, LayoutItem>>(() => {
        const lookup = new Map();
        if (currentLayout.value == null) return lookup;
        for (const item of currentLayout.value.currentItems) {
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

    function createNew(): void {
        const newLayout = ref<Layout>({
            name: 'My Custom Layout',
            userCreated: true,
            id: uuidv4(),
            initialItems: cloneDeep(currentLayout?.value?.currentItems) ?? [],
            currentItems: cloneDeep(currentLayout?.value?.currentItems) ?? [],
        });
        newLayout.value.name = 'My Custom Layout';
        userLayoutOptions.value.push(newLayout.value);
        currentLayoutId.value = newLayout.value.id;
    }
    function updateCurrent(): void {
        if (currentLayout.value == null) return;
        currentLayout.value.initialItems = cloneDeep(
            currentLayout.value.currentItems
        );
    }
    function deleteLayout(index: number): void {
        console.log(currentLayoutId.value);
        const removed = userLayoutOptions.value.splice(index, 1)[0];
        console.log(currentLayoutId.value);
        if (removed.id == currentLayoutId.value) {
            currentLayoutId.value = defaultId;
        }
    }
    function resetLayout(layout: Layout): void {
        layout.currentItems = cloneDeep(layout.initialItems);
        currentLayoutId.value = layout.id;
    }
    return {
        currentLayout,
        currentLayoutId,
        systemLayoutOptions,
        userLayoutOptions,
        updateItem,
        createNew,
        updateCurrent,
        deleteLayout,
        resetLayout,
    };
});