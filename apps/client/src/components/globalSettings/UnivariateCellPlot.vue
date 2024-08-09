<script lang="ts" setup>
import { ref, watch, onMounted } from 'vue';
import type { PropType } from 'vue';
import * as vg from '@uwdata/vgplot';
import { useCellMetaData } from '@/stores/cellMetaData';
import { useSelectionStore } from '@/stores/selectionStore';
import { storeToRefs } from 'pinia';
import { Query } from '@uwdata/mosaic-sql';
import {
    QMenu,
    QItem,
    QItemSection,
    QDialog,
    QCard,
    QCardSection,
    QCardActions,
    QForm,
    QInput,
    QBtn,
} from 'quasar';

const vgPlotContainer = ref<HTMLDivElement | null>(null);
const cellMetaData = useCellMetaData();
const { dataInitialized } = storeToRefs(cellMetaData);
const selectionStore = useSelectionStore();
const { Selections } = storeToRefs(selectionStore);
const emit = defineEmits(['selectionChange', 'plot-loaded']);
const props = defineProps({
    plotName: {
        type: String as PropType<string>,
        required: true,
    },
    plotBrush: {
        type: Object as PropType<any>,
        required: true,
    },
});

let dataMin = ref(0);
let dataMax = ref(0);
async function dataRange() {
    try {
        const thisMin = await vg
            .coordinator()
            .query(
                Query.from('current_cell_metadata')
                    .select(props.plotName)
                    .orderby(props.plotName)
                    .limit(1),
                { type: 'json' }
            );

        const thisMax = await vg.coordinator().query(
            `
  SELECT ${props.plotName}
  FROM current_cell_metadata
  ORDER BY ${props.plotName} DESC
  LIMIT 1
`,
            { type: 'json' }
        );

        dataMin.value = Number(thisMin[0][props.plotName].toFixed(3));
        dataMax.value = Number(thisMax[0][props.plotName].toFixed(3));

        // Check for existing selection in the store
        const currentSelection = selectionStore.Selections.find(
            (selection) => selection.plotName === props.plotName
        );

        if (currentSelection) {
            // Use selection range if present
            range.value.min = parseFloat(currentSelection.range[0]);
            range.value.max = parseFloat(currentSelection.range[1]);
        } else {
            // Fallback to dataMin and dataMax
            range.value.min = dataMin.value;
            range.value.max = dataMax.value;
        }

        // You might want to do a similar query for dataMin
    } catch (error) {
        console.error('Error fetching data range:', error);
    }
}

const showRangeDialog = ref(false);
const minInput = ref('');
const maxInput = ref('');

const openRangeDialog = () => {
    minInput.value = minValue.value === 'min' ? '' : minValue.value;
    maxInput.value = maxValue.value === 'max' ? '' : maxValue.value;
    showRangeDialog.value = true;
};

const onSubmit = () => {
    if (minInput.value !== '' && maxInput.value !== '') {
        minValue.value = minInput.value;
        maxValue.value = maxInput.value;
        applyManualFilter();
        showRangeDialog.value = false;
    }
};

const validatePositiveNumber = (val: string) => {
    if (val === '') return true;
    const num = parseFloat(val);
    return (!isNaN(num) && num >= 0) || 'Please enter a positive number';
};

const validateMinMax = () => {
    if (minInput.value !== '' && maxInput.value !== '') {
        return (
            parseFloat(minInput.value) <= parseFloat(maxInput.value) ||
            'Min should be less than or equal to Max'
        );
    }
    return true;
};

// Range Slider
let range = ref({ min: ref(dataMin.value), max: ref(dataMax.value) });

const minValue = ref('min');
const maxValue = ref('max');

const chartInitialized = ref<boolean>(false);
const updateMinValue = (event: Event) => {
    const value = (event.target as HTMLInputElement).value;
    minValue.value = value;
};

const updateMaxValue = (event: Event) => {
    const value = (event.target as HTMLInputElement).value;
    maxValue.value = value;
};

const selectText = (event: Event) => {
    const target = event.target as HTMLInputElement;
    target.select();
};

const handleRangeChange = (newRange: { min: number; max: number }) => {
    //range.value = newRange;
    minValue.value = newRange.min.toFixed(3).toString();
    maxValue.value = newRange.max.toFixed(3).toString();
    applyManualFilter();
};

const handleEnter = (event: KeyboardEvent) => {
    // Prevent default form submission on Enter
    event.preventDefault();

    // Apply the manual filter
    applyManualFilter();

    // Deselect the currently focused input element
    const activeElement = document.activeElement;
    if (activeElement instanceof HTMLInputElement) {
        activeElement.blur();
    }
};

// Called by applyManualFilter when min and max textbox values are entered.
const updateBrushSelection = (min: number, max: number) => {
    console.log('update manual Filter');
    // Update the store
    // selectionStore.updateSelection(props.plotName, [
    //     min.toString(),
    //     max.toString(),
    // ]);
    emit('selectionChange', {
        plotName: props.plotName,
        range: [min, max],
    });
    //console.log(props.plotBrush);
};

// Called when textbox values are changed.
const applyManualFilter = () => {
    const min = parseFloat(minValue.value);
    const max = parseFloat(maxValue.value);
    if (
        typeof min === 'number' &&
        typeof max === 'number' &&
        !isNaN(min) &&
        !isNaN(max) &&
        min <= max
    ) {
        updateBrushSelection(min, max);
        range.value.min = min;
        range.value.max = max;
    }
};

// Brush Selection Changes update selection stores, or clear selections.
const handleIntervalChange = () => {
    console.log('interval change occurred');
    console.log(props.plotBrush);
    const active = props.plotBrush.clauses.active;
    if (active && Array.isArray(active.value)) {
        const clauses = props.plotBrush.clauses;
        if (Array.isArray(clauses) && clauses.length > 0) {
            // Find the clause for the current plot
            const currentClause = clauses.find(
                (clause) => clause.source.field === props.plotName
            );
            if (currentClause) {
                // Emit only the selection for the current plot
                emit('selectionChange', {
                    plotName: props.plotName,
                    range: currentClause.value,
                });
            }
        }
    } else {
        clearBrushSelection();
    }
};

// Finds current brush selection, changes selection store, updates text box vals.
const clearBrushSelection = () => {
    const active = props.plotBrush.clauses.active;
    if (props.plotBrush) {
        emit('selectionChange', {
            plotName: active.source.field,
            range: null,
        });
        minValue.value = 'min';
        maxValue.value = 'max';

        props.plotBrush.update({
            source: props.plotName,
            value: null,
            predicate: null,
        });

        console.log('clearing Brush Selection.....');
    }
};

const handleSelectionRemoved = (event: CustomEvent) => {
    if (props.plotName == event.detail) {
        range.value.min = dataMin.value;
        range.value.max = dataMax.value;
        minValue.value = 'min';
        maxValue.value = 'max';
    }
};

// Updates the min and max values.
// watch(
//     () => Selections.value,
//     (newSelections) => {
//         const selection = newSelections.find(
//             (s) => s.plotName === props.plotName
//         );
//         if (selection) {
//             minValue.value = selection.range[0];
//             maxValue.value = selection.range[1];
//         } else {
//             minValue.value = 'min';
//             maxValue.value = 'max';
//         }
//     },
//     { deep: true }
// );

const charts = ref<null | HTMLElement>(null);
const loaded = ref(false);
async function createCharts() {
    charts.value = makePlot(props.plotName);
    if (vgPlotContainer.value) {
        vgPlotContainer.value.appendChild(charts.value!);
        loaded.value = true;
    }
}
const minMaxSelection = vg.Selection.intersect();

watch(loaded, () => {
    dataRange();
    handlePlotLoading();
});
const loading = ref(true);
const handlePlotLoading = async () => {
    await dataRange();
    // Wait for 0.5 seconds before emitting the plot-loaded event
    await new Promise((resolve) => setTimeout(resolve, 500));
    loading.value = false;
    emit('plot-loaded');
};

onMounted(() => {
    if (dataInitialized.value) {
        createCharts();
        dataRange();
    }
});

function makePlot(column: string) {
    return vg.plot(
        vg.rectY(vg.from('current_cell_metadata'), {
            x: vg.bin(column),
            y: vg.count(),
            fill: '#cccccc',
            inset: 1,
        }),
        vg.rectY(
            vg.from('current_cell_metadata', { filterBy: props.plotBrush }),
            {
                x: vg.bin(column),
                y: vg.count(),
                fill: 'steelblue',
                opacity: 1,
                inset: 1,
                tip: {
                    anchor: 'bottom',
                },
            }
        ),
        vg.marginBottom(130),
        vg.marginTop(30),
        vg.width(600),
        vg.height(250),
        vg.style({ 'font-size': '30px' }),
        vg.xDomain(vg.toFixed),
        vg.xLabelAnchor('center'),
        vg.xTickPadding(10),
        vg.xLabelOffset(80),
        vg.xAxis('bottom'),
        vg.xLine(true),
        vg.xAlign(0),
        //vg.xZero(true),
        vg.xInsetRight(20),
        vg.xTickSpacing(100),
        vg.yLabelAnchor('top'),
        vg.yAxis(null),
        vg.xLine(false),
        vg.yTicks(0)
    );
}
console.log(props.plotBrush);
//props.plotBrush.addEventListener('value', handleIntervalChange);
watch(dataInitialized, createCharts);
watch(range, handleRangeChange);
window.addEventListener(
    'selectionRemoved',
    handleSelectionRemoved as EventListener
);

const menus = ref(false);

document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    //menus.value = true;
});
</script>

<template>
    <div>
        <q-item-section style="position: relative">
            <div
                ref="vgPlotContainer"
                @clearSelection="clearBrushSelection"
                style="position: relative"
            >
                <q-menu
                    v-model="menus"
                    touch-position
                    anchor="top right"
                    self="top right"
                >
                    <q-item clickable @click="openRangeDialog">
                        <q-item-section>Enter Range</q-item-section>
                    </q-item>
                </q-menu>

                <div
                    class="q-range-container"
                    style="position: absolute; bottom: 40px; left: 0; right: 0"
                >
                    <q-range
                        v-model="range"
                        :min="dataMin"
                        :max="dataMax"
                        :step="0.001"
                        label
                        thumb-size="13px"
                        track-size="2px"
                        switch-label-side
                        selection-color="steel-blue"
                        track-color="hidden"
                        drag-range
                    />
                </div>
            </div>
        </q-item-section>

        <!-- Q-Dialog for entering min and max values -->
        <q-dialog v-model="showRangeDialog">
            <q-card style="min-width: 350px">
                <q-card-section>
                    <div class="text-h6">Enter Range</div>
                </q-card-section>

                <q-card-section>
                    <q-form @submit="onSubmit" class="q-gutter-md">
                        <q-input
                            filled
                            v-model="minInput"
                            label="Min"
                            lazy-rules
                            :rules="[validatePositiveNumber]"
                        />

                        <q-input
                            filled
                            v-model="maxInput"
                            label="Max"
                            lazy-rules
                            :rules="[validatePositiveNumber]"
                        />

                        <div>
                            <q-btn
                                label="Submit"
                                type="submit"
                                color="primary"
                                :disable="!validateMinMax()"
                            />
                            <q-btn
                                label="Cancel"
                                color="primary"
                                flat
                                @click="showRangeDialog = false"
                                class="q-ml-sm"
                            />
                        </div>
                    </q-form>
                </q-card-section>
            </q-card>
        </q-dialog>
    </div>
</template>

<style scoped>
.q-range-container {
    padding: 0 20px;
}
</style>
