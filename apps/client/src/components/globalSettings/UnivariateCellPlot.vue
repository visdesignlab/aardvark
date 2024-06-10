<template>
  <div ref="vgPlotContainer"></div>
</template>

<script lang="ts">
import { defineComponent, onMounted, ref } from 'vue';
import * as vg from '@uwdata/vgplot';

export default defineComponent({
  setup() {
    const vgPlotContainer = ref<HTMLDivElement | null>(null);

    onMounted(async () => {
      if (vgPlotContainer.value) {
        // Configure the coordinator to use DuckDB-WASM
        vg.coordinator().databaseConnector(vg.wasmConnector());

        //Load data into the database
        await vg.coordinator().exec([
          vg.loadObjects("dummy_data", [
            { "Mass (pg)": 1, "Time (h)": 3, "Mass_norm": 2 },
            { "Mass (pg)": 1, "Time (h)": 4, "Mass_norm": 8 },
            { "Mass (pg)": 1, "Time (h)": 5, "Mass_norm": 3 },
            { "Mass (pg)": 3, "Time (h)": 5, "Mass_norm": 7 },
            { "Mass (pg)": 3, "Time (h)": 5, "Mass_norm": 3 },
            { "Mass (pg)": 5, "Time (h)": 2, "Mass_norm": 4 },
            { "Mass (pg)": 5, "Time (h)": 3, "Mass_norm": 1 },
            { "Mass (pg)": 7, "Time (h)": 4, "Mass_norm": 1 },
            { "Mass (pg)": 1, "Time (h)": 3, "Mass_norm": 2 },
            { "Mass (pg)": 2, "Time (h)": 3, "Mass_norm": 8 },
            { "Mass (pg)": 1, "Time (h)": 1, "Mass_norm": 1 },
            { "Mass (pg)": 2, "Time (h)": 8, "Mass_norm": 4 },
            { "Mass (pg)": 3, "Time (h)": 4, "Mass_norm": 5 },
            { "Mass (pg)": 4, "Time (h)": 0, "Mass_norm": 2 },
            { "Mass (pg)": 5, "Time (h)": 1, "Mass_norm": 3 },
            { "Mass (pg)": 0, "Time (h)": 7, "Mass_norm": 0 },
          ]),
        ]);
        // // // Load data into the database
        // await vg.coordinator().exec([
        //   vg.loadParquet("dummy_data", "./testData.parquet")]);

        const brush = vg.Selection.intersect();
        
        
        const makePlot = (column: string) => vg.plot(
        vg.rectY(
          vg.from("dummy_data", { filterBy: brush }), // data set and filter selection
          { x: vg.bin(column), y: vg.count(), fill: "steelblue", inset: 1}
        ),
        vg.intervalX({ as: brush }), // create an interval selection brush
        vg.xDomain(vg.Fixed), // don't change the x-axis domain across updates
        vg.marginBottom(130),
        vg.width(600),
        vg.height(300),
        vg.style({ "font-size": "30px" }),
        vg.xLabelAnchor("center"),
        vg.xTickPadding(10),
        vg.xLabelOffset(80),
        vg.xAxis("bottom"),
        vg.xLine(true),
        vg.xAlign(0),
        vg.yLabelAnchor("top"),
        vg.yAxis(null),
        vg.yTicks(0),
        );
        // function updateSelectionText(){

        // }

        const chart = vg.vconcat(
            makePlot("Mass (pg)"),
            makePlot("Time (h)"),
            makePlot("Mass_norm")
        );

        vgPlotContainer.value.appendChild(chart);
      }
    });

    return {
      vgPlotContainer,
    };
  },
});
</script>
