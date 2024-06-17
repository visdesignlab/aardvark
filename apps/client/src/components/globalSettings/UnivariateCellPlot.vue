<template>
  <div>

    <q-item-section>
      <div class="q-item-section__right">
        <q-btn class="gt-xs" size="12px" flat dense round icon="filter_alt" color="grey-7" />
      </div>
      <div ref="vgPlotContainer1"></div>
    </q-item-section>

    <q-item-section>
      <div class="q-item-section__right">
        <q-btn class="gt-xs" size="12px" flat dense round icon="filter_alt" color="grey-7" />
      </div>
      <div ref="vgPlotContainer2"></div>
    </q-item-section>

    <q-item-section>
      <div class="q-item-section__right">
        <q-btn class="gt-xs" size="12px" flat dense round icon="filter_alt" color="grey-7" />
      </div>
      <div ref="vgPlotContainer3"></div>
    </q-item-section>
    
  </div>
</template>


<script lang="ts">
import { defineComponent, onMounted, ref, h, render} from 'vue';
import { QBtn } from 'quasar';
import * as vg from '@uwdata/vgplot';

export default defineComponent({
  setup() {
    const vgPlotContainer1 = ref<HTMLDivElement | null>(null);
    const vgPlotContainer2 = ref<HTMLDivElement | null>(null);
    const vgPlotContainer3 = ref<HTMLDivElement | null>(null);

    // Current Selection HTML
    const currSel = document.getElementById("currSel");

    // Brush selection
    const plotBrush = vg.Selection.intersect();
    vg.Selection.crossfilter();

    const makePlot = (column: string) => {
      
      // Optional Text Underneath Plots
      //const rangeText = document.createElement('div');
      //rangeText.classList.add('vgPlotContainer');
     
      // Tracking brush range
      const minX = ref(0);
      const maxX = ref(0);
      // Event for the brush.
      plotBrush.addEventListener('value', () => {
        const selectedRange = plotBrush.active.value;
        if (selectedRange){
        minX.value = selectedRange[0];
        maxX.value = selectedRange[1];
        }
        // Optional Text Underneath Plots, must return rangeText in function.
        //rangeText.textContent = `[${Math.round(minX.value * 1000) / 1000}, ${Math.round(maxX.value * 1000) / 1000}]`;
        
        // Set text content
        currSel.textContent = `[${Math.round(minX.value * 1000) / 1000}, ${Math.round(maxX.value * 1000) / 1000}]`;
      }); 

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
        vg.text({ x: plotBrush, text: plotBrush, frameAnchor: "top", lineAnchor: "bottom", dy: -7 })
      );

      return plot;
    };

    onMounted(async () => {
      if (vgPlotContainer1.value && vgPlotContainer2.value && vgPlotContainer3.value) {

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
        
        const chart = vg.vconcat(

            makePlot("Mass (pg)"),
            makePlot("Time (h)"),
            makePlot("Mass_norm")
        );

        vgPlotContainer1.value.appendChild(vg.vconcat(makePlot("Mass (pg)")));
        vgPlotContainer2.value.appendChild(vg.vconcat(makePlot("Time (h)")));
        vgPlotContainer3.value.appendChild(vg.vconcat(makePlot("Mass_norm")));
      }
    });

    return {
      vgPlotContainer1,
      vgPlotContainer2,
      vgPlotContainer3

    };
  },
});
</script>

<style scoped>
.plot-container {
  display: flex;
  align-items: center;
  text-align: center;
}
.q-item-section__right {
  display: flex;
  justify-content: flex-end; 
}
</style>
