import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import TestComponent1 from './components/TestComponent1.vue';
import TestComponent2 from './components/TestComponent2.vue';
import HorizonChart from './components/HorizonChart.vue';
import DatasetSelector from './components/DatasetSelector.vue';

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
    .component('font-awesome-icon', FontAwesomeIcon)
    .component('TestComponent1', TestComponent1)
    .component('TestComponent2', TestComponent2)
    .component('HorizonChart', HorizonChart)
    .component('DatasetSelector', DatasetSelector)
    .mount('#app');
