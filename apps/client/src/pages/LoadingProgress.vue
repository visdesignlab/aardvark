<script lang="ts">
import type { PropType } from 'vue';
export interface ProgressRecord {
    label: string;
    progress: number;
}

export default {
    props: {
        progressStatus: {
            type: Array as PropType<ProgressRecord[]>,
            required: true,
        },
    },
};
</script>

<template>
    <div class="column">
        <template v-for="(item, idx) in progressStatus" :key="item.label">
            <div class="spinner-container">
                <q-spinner v-if="item.progress == 1" size="20" />
                <q-icon
                    v-if="item.progress == 2"
                    name="mdi-check-circle"
                    color="green"
                    size="20px"
                />
                <q-icon
                    v-if="item.progress == 0"
                    name="mdi-circle-outline"
                    size="20px"
                    color="grey"
                />
                <span
                    :class="{
                        '.progress-1': item.progress === 1,
                        'progress-2': item.progress === 2,
                        'progress-0': item.progress === 0,
                    }"
                    >{{ item.label }}</span
                >
            </div>
            <div
                v-if="idx !== progressStatus.length - 1"
                class="vertical-line"
            ></div>
        </template>
    </div>
</template>

<style scoped>
.spinner-container {
    display: flex;
    align-items: center;
}

.spinner-container span {
    margin-left: 10px;
}

.vertical-line {
    width: 1px;
    height: 30px;
    background-color: rgba(0, 0, 0, 0.2);
    margin: 20px 0px 20px 10px;
}

.progress-2 {
    font-weight: bold;
    color: green;
}

.progress-1 {
    font-weight: bold;
    color: black;
}

.progress-0 {
    font-weight: normal;
    color: grey;
}
</style>
