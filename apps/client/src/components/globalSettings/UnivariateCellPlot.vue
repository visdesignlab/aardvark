<template>
  <div ref="vgPlotContainer"></div>
  <div ref="selectedRangeText">{{ selectedRangeText }}</div>
</template>

<script lang="ts">
import { defineComponent, onMounted, ref, computed } from 'vue';
import * as vg from '@uwdata/vgplot';

export default defineComponent({
  setup() {
    const vgPlotContainer = ref<HTMLDivElement | null>(null);
    const selectedRangeText = ref<HTMLDivElement | null>(null);

      const makePlot = (column: string) => {
      // Create a new brush instance for this plot
      const plotBrush = vg.Selection.intersect();

      const plot = vg.plot(
        vg.name("ploted"),
        vg.rectY(
          vg.from("dummy_data", { filterBy: plotBrush }), // Use plot-specific brush for filtering
          { x: vg.bin(column), y: vg.count(), fill: "steelblue", inset: 1 }
        ),
        vg.intervalX({ as: plotBrush }), // Add plot-specific brush selection
        vg.xDomain(vg.Fixed),
        vg.marginBottom(170),
        vg.marginTop(30),
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
        vg.text({x: plotBrush, text: plotBrush, frameAnchor: "top", lineAnchor: "bottom", dy: -7 })
      );
      const minX = ref(0);
      const maxX = ref(0);
      // Update the text content when the brush selection changes (optional)
      plotBrush.addEventListener('value', () => {
        const selectedRange = plotBrush.active.value;
        
        minX.value = selectedRange[0];
        maxX.value = selectedRange[1];
        console.log(`Selected X Range: [${minX.value}, ${maxX.value}]`);

        selectedRangeText.value.innerText = `Selected X Range: [${Math.round(minX.value * 1000) / 1000}, ${Math.round(maxX.value * 1000) / 1000}]`;
        vg.text({x: maxX.value, text: maxX.value, frameAnchor: "top", lineAnchor: "bottom", dy: -7 })
      });

      return plot;
    };

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


        const chart = vg.vconcat(
            makePlot("Mass (pg)"),
            makePlot("Time (h)"),
            makePlot("Mass_norm"),
        );

        vgPlotContainer.value.appendChild(chart);
      }
    });

    return {
      vgPlotContainer, selectedRangeText

    };
  },
});
</script>
