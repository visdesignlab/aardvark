// // src/stores/SelectionStore.ts

// import { defineStore } from 'pinia';

// interface Selection {
//     plotName: string;
//     range: [string, string];
// }

// export const useSelectionStore = defineStore('Selection', {
//     state: () => ({
//         Selections: [] as Selection[],
//     }),
//     actions: {
//         addSelection(Selection: Selection) {
//             this.Selections.push(Selection);
//         },
//         removeSelection(index: number) {
//             this.Selections.splice(index, 1);
//         },
//     },
// });
// src/stores/SelectionStore.ts
import { defineStore } from 'pinia';

interface Selection {
    plotName: string;
    range: [string, string];
}

export const useSelectionStore = defineStore('Selection', {
    state: () => ({
        Selections: [] as Selection[],
    }),
    actions: {
        addSelection(selection: Selection) {
            const existingIndex = this.Selections.findIndex(
                (s) => s.plotName === selection.plotName
            );
            if (existingIndex !== -1) {
                this.Selections[existingIndex] = selection;
            } else {
                this.Selections.push(selection);
            }
        },
        removeSelection(index: number) {
            this.Selections.splice(index, 1);
        },
        updateSelection(plotName: string, range: [string, string]) {
            const existingIndex = this.Selections.findIndex(
                (s) => s.plotName === plotName
            );
            if (existingIndex !== -1) {
                this.Selections[existingIndex].range = range;
            } else {
                this.addSelection({ plotName, range });
            }
        },
        removeSelectionByPlotName(plotName: string) {
            const index = this.Selections.findIndex(
                (s) => s.plotName === plotName
            );
            if (index !== -1) {
                this.removeSelection(index);
            }
        },
    },
});
