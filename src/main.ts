import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import GridLayout from 'vue3-drr-grid-layout';
import 'vue3-drr-grid-layout/dist/style.css';
import TestComponent1 from './components/TestComponent1.vue';
import TestComponent2 from './components/TestComponent2.vue';

// import './assets/main.css';

const app = createApp(App);

app.use(createPinia()).use(GridLayout);

app.component('TestComponent1', TestComponent1);
app.component('TestComponent2', TestComponent2);
app.mount('#app');
