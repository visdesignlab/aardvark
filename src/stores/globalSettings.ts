import { ref, computed } from 'vue';
import { defineStore } from 'pinia';
import { v4 as uuidv4 } from 'uuid';

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
            component: 'DatasetSelector',
        },
        {
            name: 'General Settings',
            faKey: 'fa-gear',
            id: uuidv4(),
            show: false,
            component: 'DatasetSelector',
        },
        {
            name: 'Filter Data',
            faKey: 'fa-filter',
            id: uuidv4(),
            show: false,
            component: 'DatasetSelector',
        },
        {
            name: 'Search',
            faKey: 'fa-magnifying-glass',
            id: uuidv4(),
            show: false,
            component: 'DatasetSelector',
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

    return { settingsPages, activePage, toggleShown };
});
