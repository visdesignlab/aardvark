<script lang="ts">
import type { PropType } from 'vue';
export interface ProgressRecord {
    label: string;
    progress: number;
    subProgress?: ProgressRecord[];
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
<script setup lang="ts">
const determineProgress = (subProgress: ProgressRecord[]) => {
    let totalProgress = 0;
    for (let i = 0; i < subProgress.length; i++) {
        if (subProgress[i].progress === 2 || subProgress[i].progress === 1) {
            return 2;
        }
        if (subProgress[i].progress === 3) {
            totalProgress = 3;
        }
    }
    return totalProgress;
};
const getProgresses = (progressStatus: ProgressRecord[]) => {
    let tempProgressStatus: [ProgressRecord, number][] = progressStatus.map(
        (entry: ProgressRecord) => {
            if (entry.subProgress) {
                return [entry, determineProgress(entry.subProgress)];
            }
            return [entry, entry.progress];
        }
    );
    return tempProgressStatus;
};
</script>

<template>
    <div class="column">
        <template
            v-for="(item, idx) in getProgresses(progressStatus)"
            :key="item.label"
        >
            <div class="spinner-container">
                <q-spinner v-if="item[1] == 2" size="20" />
                <q-icon
                    v-if="item[1] == 3"
                    name="mdi-check-circle"
                    color="green"
                    size="20px"
                />
                <q-icon
                    v-if="item[1] == 0"
                    name="mdi-circle-outline"
                    size="20px"
                    color="grey"
                />
                <span
                    :class="{
                        'progress-2': item[1] === 2,
                        'progress-0': item[1] === 0,
                        'progress-3': item[1] === 3,
                    }"
                    style="font-size: 1.1em"
                    >{{ item[0].label }}</span
                >
            </div>
            <template v-for="subProgress in item[0].subProgress">
                <div class="spinner-container" style="margin-left: 50px">
                    <q-spinner-dots
                        v-if="subProgress.progress == 1"
                        size="20"
                    />
                    <q-spinner v-if="subProgress.progress == 2" size="20" />
                    <q-icon
                        v-if="subProgress.progress == 3"
                        name="mdi-check-circle"
                        color="green"
                        size="20px"
                    />
                    <q-icon
                        v-if="subProgress.progress == 0"
                        name="mdi-circle-outline"
                        size="20px"
                        color="grey"
                    />
                    <span
                        :class="{
                            'progress-1': subProgress.progress === 1,
                            'progress-2': subProgress.progress === 2,
                            'progress-0': subProgress.progress === 0,
                            'progress-3': subProgress.progress === 3,
                        }"
                        >{{ subProgress.label }}</span
                    >
                </div>
            </template>
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
    margin: 5px 0px 5px 10px;
}

.progress-0,
.progress-1 {
    font-weight: normal;
    color: grey;
}
.progress-2 {
    font-weight: bold;
    color: black;
}

.progress-3 {
    font-weight: bold;
    color: green;
}
</style>
