import { createApp } from 'vue';
import { createPinia } from 'pinia';
import Vue3EasyDataTable from 'vue3-easy-data-table';
import 'vue3-easy-data-table/dist/style.css';
import App from './App.vue';
import HorizonChart from './components/HorizonChart.vue';
import DatasetSelector from './components/globalSettings/DatasetSelector.vue';
import LayoutSelector from './components/globalSettings/LayoutSelector.vue';
import GeneralSettings from './components/globalSettings/GeneralSettings.vue';
import StubView from './components/globalSettings/StubView.vue';
import LooneageView from './components/LooneageView.vue';
import SimpleTable from './components/SimpleTable.vue';
import NoDataSplash from './components/NoDataSplash.vue';
import TestComponent from './components/TestComponent.vue';

import { Quasar } from 'quasar';
// Import icon libraries
import '@quasar/extras/material-icons/material-icons.css';

// Import Quasar css
import 'quasar/src/css/index.sass';

// Vuetify
import 'vuetify/styles';
import { createVuetify } from 'vuetify';
import * as components from 'vuetify/components';
import * as directives from 'vuetify/directives';

import '@mdi/font/css/materialdesignicons.css';
import 'vuetify/styles';
const vuetify = createVuetify({
    components,
    directives,
    ssr: true,
});

import './App.scss';

/* import the fontawesome core */
import { library } from '@fortawesome/fontawesome-svg-core';

/* import font awesome icon component */
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';

/* import specific icons */
import { fas } from '@fortawesome/free-solid-svg-icons';
// import { faExpand, faCompress } from '@fortawesome/free-solid-svg-icons';

/* add icons to the library */
library.add(fas);

createApp(App)
    .use(createPinia())
    .use(vuetify)
    .use(Quasar, {
        plugins: {}, // import Quasar plugins and add here
    })
    .component('font-awesome-icon', FontAwesomeIcon)
    .component('EasyDataTable', Vue3EasyDataTable)
    .component('HorizonChart', HorizonChart)
    .component('DatasetSelector', DatasetSelector)
    .component('LayoutSelector', LayoutSelector)
    .component('GeneralSettings', GeneralSettings)
    .component('LooneageView', LooneageView)
    .component('SimpleTable', SimpleTable)
    .component('NoDataSplash', NoDataSplash)
    .component('StubView', StubView)
    .component('TestComponent', TestComponent)
    .mount('#app');
