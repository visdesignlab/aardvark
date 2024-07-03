import { defineStore } from 'pinia';

export const useConfigStore = defineStore('configStore',() => {
    let environment = import.meta.env.VITE_ENVIRONMENT !== undefined ? import.meta.env.VITE_ENVIRONMENT : 'production';
    let useHttp = import.meta.env.VITE_USE_HTTP?.toLowerCase() === 'true';

    return{
        environment,
        useHttp
    }
})