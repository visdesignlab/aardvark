import { ref, computed } from 'vue';
import { defineStore } from 'pinia';
import { v4 as uuidv4 } from 'uuid';
import { useStorage } from '@vueuse/core';

export interface SettingsPage {
    // properties expected by a gridstack item
    name: string;
    faKey: string;
    id: string;
    show: boolean;
    component: string;
}

export const useGlobalSettings = defineStore('globalSettings', () => {
    const settingsPages = ref<SettingsPage[]>([
        {
            name: 'Select Dataset Location',
            faKey: 'fa-database',
            id: uuidv4(),
            show: false,
            component: 'DatasetSelector',
        },
        {
            name: 'Layout Configuration',
            faKey: 'fa-table-cells-large',
            id: uuidv4(),
            show: false,
            component: 'LayoutSelector',
        },
        {
            name: 'General Settings',
            faKey: 'fa-gear',
            id: uuidv4(),
            show: false,
            component: 'GeneralSettings',
        },
        {
            name: 'Filter Data',
            faKey: 'fa-filter',
            id: uuidv4(),
            show: false,
            component: 'StubView',
        },
        {
            name: 'Search',
            faKey: 'fa-magnifying-glass',
            id: uuidv4(),
            show: false,
            component: 'StubView',
        },
    ]);

    // const activePage = ref<SettingsPage | null>(null);
    // switching from activePage to activePageIndex and keeping activePage as a computed worked for me.

    const activePage = computed<SettingsPage | null>(() => {
        if (activePageIndex.value == null) return null;
        return settingsPages.value[activePageIndex.value];
    });
    const activePageIndex = ref<number | null>(null);
    // const lastActivePage = ref<SettingsPage>(settingsPages.value[0]);

    function toggleShown(setting: SettingsPage): void {
        if (setting.show) {
            setting.show = false;

            // activePage.value = null;
            activePageIndex.value = settingsPages.value.findIndex(
                (page) => page.id === setting.id
            );
        } else {
            for (const s of settingsPages.value) {
                s.show = false;
            }
            setting.show = true;

            // activePage.value = setting;
            activePageIndex.value = settingsPages.value.findIndex(
                (page) => page.id === setting.id
            );

            // activePage.value = setting;
            // lastActivePage.value = setting;
        }
    }

    function toggleLastActive(): void {
        // toggleShown(lastActivePage.value);
    }

    const darkMode = useStorage<boolean>('darkMode', false);
    const btnLight = computed<string>(() => {
        // dark and light should be inverted depending on
        // if we are in dark mode or not.
        return darkMode.value ? 'dark' : 'light';
    });
    const btnDark = computed<string>(() => {
        return darkMode.value ? 'light' : 'dark';
    });
    // const darkMode = ref<boolean>(false);

    const usingMac = computed<boolean>(() => {
        return navigator.userAgent.toLowerCase().includes('mac');
    });

    return {
        settingsPages,
        activePage,
        // activePageIndex,
        toggleShown,
        toggleLastActive,
        darkMode,
        btnLight,
        btnDark,
        usingMac,
    };
});
