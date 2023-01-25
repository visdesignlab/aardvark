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

    // const settingsShown = computed<boolean>(() => {
    //     return settingsPages.value.some(
    //         (setting: SettingsPage) => setting.show
    //     );
    // });

    const activePage = ref<SettingsPage | null>(null);

    function toggleShown(setting: SettingsPage): void {
        if (setting.show) {
            setting.show = false;
            activePage.value = null;
        } else {
            for (const s of settingsPages.value) {
                s.show = false;
            }
            setting.show = true;
            activePage.value = setting;
        }
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

    return {
        settingsPages,
        activePage,
        toggleShown,
        darkMode,
        btnLight,
        btnDark,
    };
});
