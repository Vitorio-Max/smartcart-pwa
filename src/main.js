import { createApp } from 'vue';
import App from './App.vue';
import './style.css';

// El service worker lo registra vite-plugin-pwa (ver AvisoActualizacion.vue)
createApp(App).mount('#app');