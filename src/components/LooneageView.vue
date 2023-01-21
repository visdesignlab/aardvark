<template>
    <div>
        <svg :width="containerWidth" :height="containerHeight">
            <g :transform="`translate(0,${-extent[1]})`">
                <g
                    v-for="node in layoutRoot.descendants()"
                    :key="node.id"
                    :transform="`translate(${scaleX(node.y)},${node.x})`"
                    :class="`n-${node.depth}`"
                >
                    <HorizonChart
                        :chartWidth="scaleX(getWidth(node.data))"
                        :chartHeight="rowHeight"
                        :data="node.data.points"
                        :settings="mergedHorizonChartSettings"
                        :attrKey="attrKey"
                        :info="node.data.id"
                    ></HorizonChart>
                </g>
                <line
                    v-for="({ source, target }, i) in layoutRoot.links()"
                    :key="i"
                    :x1="scaleX(source.y + getWidth(source.data))"
                    :y1="source.x + rowHeight / 2"
                    :x2="scaleX(target.y)"
                    :y2="target.x + rowHeight / 2"
                    :stroke-width="
                        2 + 36 * getSplitWeight(source.data, target.data)
                    "
                ></line>
            </g>
        </svg>
        <div class="mt-1 mb-4 d-flex" :style="`width: ${containerWidth}px`">
            <img
                v-for="frame in imageFrames"
                :width="containerWidth / imageFrames.length"
                :key="frame"
                :src="`/images_large/QPM20X_1_frame_${frame}.jpg`"
            />
        </div>
    </div>
</template>

<script lang="ts">
import { computed, defineComponent } from 'vue';
import { min as d3Min, max as d3Max, extent as d3Extent } from 'd3-array';
import { scaleLinear } from 'd3-scale';
import { clamp, last, sortBy } from 'lodash-es';
import HorizonChart, {
    type HorizonChartSettings,
} from '@/components/HorizonChart.vue';
import { hierarchy } from 'd3-hierarchy';
import { flextree, type LayoutNode } from 'd3-flextree';
import { useCellMetaData } from '@/stores/cellMetaData';

export default defineComponent({
    name: 'LooneageView',
    components: {
        HorizonChart,
    },
    props: {
        attrKey: { type: String, required: true },
        containerWidth: { type: Number, default: 800 },
        encodeChildSplit: { type: Boolean, default: false },
        spacing: { type: Number, default: 4 },
        rowHeight: { type: Number, default: 16 },
        horizonChartSettings: {
            type: Object as () => HorizonChartSettings,
        },
    },
    setup(props) {
        const tree = computed(() => hierarchy<DataNode>(props.dataRoot));
        function getWidth(node: DataNode): number {
            let [minTime, maxTime] = d3Extent<TemporalPoint, number>(
                node.points,
                (point: TemporalPoint) => point.time
            );
            minTime = minTime ?? 0;
            maxTime = maxTime ?? 0;
            const timeWidth = maxTime - minTime;
            return timeWidth;
        }
        const layoutRoot = computed<LayoutNode<DataNode>>(() => {
            return flextree<DataNode>({
                nodeSize: (node: LayoutNode<DataNode>) => {
                    const timeWidth = getWidth(node.data);
                    return [props.rowHeight, timeWidth];
                },
                spacing: props.spacing,
            })(tree.value);
        });

        function getReasonableModH(): number {
            const minVal = d3Min(
                layoutRoot.value.descendants(),
                (node: LayoutNode<DataNode>) =>
                    d3Min(
                        node.data.points,
                        (point) => point.attributes[props.attrKey]
                    )
            ) as number;
            const maxVal = d3Max(
                layoutRoot.value.descendants(),
                (node: LayoutNode<DataNode>) =>
                    d3Max(
                        node.data.points,
                        (point) => point.attributes[props.attrKey]
                    )
            ) as number;
            return (maxVal - minVal) / 5;
        }
        const defaultSettings = {
            modHeight: getReasonableModH(),
        };

        const mergedHorizonChartSettings = computed(() => {
            return { ...defaultSettings, ...props.horizonChartSettings };
        });

        const scaleX = computed(() => {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const [minX, _minY, maxX, _maxY] = extent.value;
            return scaleLinear()
                .domain([minX, maxX])
                .range([0, props.containerWidth]);
        });

        const extent = computed<[number, number, number, number]>(() => {
            const minX = d3Min(
                layoutRoot.value.descendants(),
                (n: LayoutNode<DataNode>) => n.y
            ) as number;

            const maxX = d3Max(
                layoutRoot.value.descendants(),
                (n: LayoutNode<DataNode>) => n.y + getWidth(n.data)
            ) as number;

            const minY = d3Min(
                layoutRoot.value.descendants(),
                (n: LayoutNode<DataNode>) => n.x
            ) as number;

            const maxY = d3Max(
                layoutRoot.value.descendants(),
                (n: LayoutNode<DataNode>) => n.x + props.rowHeight
            ) as number;

            return [minX, minY, maxX, maxY];
        });

        const containerHeight = computed<number>(() => {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const [_minX, minY, _maxX, maxY] = extent.value;
            return maxY - minY;
        });

        function getSplitWeight(source: DataNode, target: DataNode): number {
            if (!props.encodeChildSplit) return 0;
            const lastVal = last(source.points)?.attributes[props.attrKey] ?? 1;
            const firstVal = target.points[0].attributes[props.attrKey];
            const basicWeight = firstVal / lastVal;
            return clamp(basicWeight - 0.5, 0, 1);
        }
        const imageFrames = computed<number[]>(() => {
            const keyFrames = new Set<number>();
            function addKeyFrames(node: DataNode, set: Set<number>) {
                set.add(node.points[0].attributes['frame'] + 1);
                set.add(
                    node.points[node.points.length - 1].attributes['frame'] + 1
                );
                if (node.children) {
                    for (const child of node.children) {
                        addKeyFrames(child, set);
                    }
                }
            }
            addKeyFrames(props.dataRoot, keyFrames);
            let keyFrameList: number[] = Array.from(keyFrames);
            keyFrameList = sortBy(keyFrameList);
            console.log({ keyFrameList: keyFrameList });

            return keyFrameList;
        });

        return {
            layoutRoot,
            getWidth,
            extent,
            scaleX,
            containerHeight,
            getSplitWeight,
            mergedHorizonChartSettings,
            imageFrames,
        };
    },
});
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss">
line {
    stroke: #525252;
    stroke-linecap: round;
}

// svg {
// border: solid green 3px;
// }

// .image-container {
// border: solid black 3px;
// overflow: hidden;
// }
</style>
