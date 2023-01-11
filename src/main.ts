import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import GridLayout from 'vue3-drr-grid-layout';
import 'vue3-drr-grid-layout/dist/style.css';

// import './assets/main.css';

const app = createApp(App);

app.use(createPinia()).use(GridLayout);
app.mount('#app');
