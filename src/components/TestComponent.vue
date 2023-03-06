<script setup lang="ts">
import { useCounterStore } from '@/stores/counter';
import { useGridstackLayoutStore } from '@/stores/gridstackLayoutStore';
import { cloneDeep } from 'lodash';
import { ref, computed, reactive } from 'vue';
import { LocalStorage, useQuasar } from 'quasar';
import { useGlobalSettings } from '@/stores/globalSettings';
const $q = useQuasar();

const counter = useCounterStore();
const layoutConfig = useGridstackLayoutStore();
const globalSettings = useGlobalSettings();
function addOne() {
    counter.increment();
}

function copyGridstackCongif() {
    const blarg = cloneDeep(layoutConfig.$state);
    // console.log({ blarg });
}
const label = ref({
    min: -12,
    max: 8,
});

const first = ref(true);
const second = ref(true);
const third = ref(false);
const fourth = ref(true);

function showLoading(): void {
    $q.loading.show();
}

function clearLocalStorage(): void {
    localStorage.clear();
}

function statelessRefresh(): void {
    window.history.replaceState(null, '', window.location.pathname);
    location.reload();
}
</script>
<template>
    <q-btn @click="clearLocalStorage" outline rounded
        >Clear local storage</q-btn
    >
    <q-separator class="m-1" color="black"></q-separator>
    <q-btn @click="statelessRefresh" outline rounded>Stateless refresh</q-btn>
    <q-separator class="m-1" color="black"></q-separator>
    <!-- <q-btn @click="showLoading">Show loading shield</q-btn> -->
    <button @click="addOne">Plus 1</button>
    <div>{{ counter.count }}</div>
    <!-- <button @click="copyGridstackCongif">Pcopy</button> -->
    <v-checkbox label="Checkbox"></v-checkbox>
    <!-- <v-range-slider v-model="value"></v-range-slider> -->
    <!-- <div>
        <v-slider v-model="slider1" color="orange" label="color"></v-slider>
    </div>

    <div>
        <Slider v-model="value" />
    </div> -->

    <div class="q-pa-md">
        <q-badge color="secondary" class="q-mb-lg">
            Model: {{ label.min }} to {{ label.max }} (-20 to 20, step 4)
        </q-badge>

        <q-range
            v-model="label"
            :min="-20"
            :max="20"
            :step="4"
            label-always
            color="brown"
        />
    </div>

    <div class="q-pa-md q-gutter-sm">
        <div>
            <q-toggle v-model="first" icon="alarm" />
            <q-toggle
                v-model="second"
                color="pink"
                icon="mail"
                label="Same Icon for each state"
            />
        </div>

        <div>
            <q-toggle
                v-model="third"
                checked-icon="check"
                color="green"
                unchecked-icon="clear"
            />
            <q-toggle
                v-model="fourth"
                checked-icon="check"
                color="red"
                label="Different icon for each state"
                unchecked-icon="clear"
            />
        </div>
    </div>
</template>

<style scoped lang="scss"></style>
