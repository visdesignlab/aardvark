<script setup lang="ts">
import type { PropType } from 'vue';
export interface ProgressRecord {
    label: string;
    progress: 'failed' | 'not_started' | 'dispatched' | 'running' | 'succeeded';
    subProgress?: ProgressRecord[];
}

const props = defineProps({
    progressStatus: {
        type: Array as PropType<ProgressRecord[]>,
        required: true,
    },
});
const determineProgress = (subProgress: ProgressRecord[]) => {
    const failed = subProgress.some((element) => element.progress === 'failed');
    if (failed) {
        // If any failed, set total to failed
        return 'failed';
    } else {
        const running = subProgress.some(
            (element) =>
                element.progress === 'running' ||
                element.progress === 'dispatched'
        );
        if (running) {
            // If none failed but any are running/queued, set to running
            return 'running';
        } else {
            const succeeded = subProgress.every(
                (element) => element.progress === 'succeeded'
            );
            if (succeeded) {
                // If none running, none failed, and all have succeeded, set to 3
                return 'succeeded';
            }
        }
    }
    // If none running, none failed, and not all succeeded, then it's still starting. Return 0
    return 'not_started';
};
const getProgresses = (progressStatus: ProgressRecord[]) => {
    let tempProgressStatus: [ProgressRecord, string][] = progressStatus.map(
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
                <q-spinner v-if="item[1] == 'running'" size="20" />
                <q-icon
                    v-if="item[1] == 'succeeded'"
                    name="mdi-check-circle"
                    color="green"
                    size="20px"
                />
                <q-icon
                    v-if="item[1] == 'not_started'"
                    name="mdi-circle-outline"
                    size="20px"
                    color="grey"
                />
                <q-icon
                    v-if="item[1] === 'failed'"
                    name="mdi-alert-circle-outline"
                    size="20px"
                    color="red"
                />
                <span
                    :class="{
                        'progress-running': item[1] === 'running',
                        'progress-not-started': item[1] === 'not_started',
                        'progress-succeeded': item[1] === 'succeeded',
                        'progress-failed': item[1] === 'failed',
                    }"
                    style="font-size: 1.1em"
                    >{{ item[0].label }}</span
                >
            </div>
            <template v-for="subProgress in item[0].subProgress">
                <div class="spinner-container" style="margin-left: 50px">
                    <q-spinner-dots
                        v-if="subProgress.progress == 'dispatched'"
                        size="20"
                    />
                    <q-spinner
                        v-if="subProgress.progress == 'running'"
                        size="20"
                    />
                    <q-icon
                        v-if="subProgress.progress == 'succeeded'"
                        name="mdi-check-circle"
                        color="green"
                        size="20px"
                    />
                    <q-icon
                        v-if="subProgress.progress == 'not_started'"
                        name="mdi-circle-outline"
                        size="20px"
                        color="grey"
                    />
                    <q-icon
                        v-if="subProgress.progress === 'failed'"
                        name="mdi-alert-circle-outline"
                        size="20px"
                        color="red"
                    />
                    <span
                        :class="{
                            'progress-dispatched':
                                subProgress.progress === 'dispatched',
                            'progress-running':
                                subProgress.progress === 'running',
                            'progress-not-started':
                                subProgress.progress === 'not_started',
                            'progress-succeeded':
                                subProgress.progress === 'succeeded',
                            'progress-failed':
                                subProgress.progress === 'failed',
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

.progress-not-started,
.progress-dispatched {
    font-weight: normal;
    color: grey;
}

.progress-running,
.progress-succeeded,
.progress-failed {
    font-weight: bold;
}

.progress-running {
    color: black;
}
.progress-succeeded {
    color: green;
}
.progress-failed {
    color: red;
}
</style>
