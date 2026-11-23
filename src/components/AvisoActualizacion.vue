<template>
  <div
    v-if="needRefresh"
    role="status"
    class="fixed inset-x-0 z-40 px-4 bottom-[calc(env(safe-area-inset-bottom)+4.75rem)]"
  >
    <div
      class="max-w-lg mx-auto bg-slate-900 text-white rounded-2xl shadow-xl p-3 pl-4 flex items-center gap-2"
    >
      <p class="flex-1 text-sm font-semibold leading-snug">Hay una versión nueva de SmartCart</p>
      <button
        @click="cerrar"
        class="h-10 px-3 rounded-xl text-sm font-bold text-slate-300 active:bg-slate-800"
      >
        Luego
      </button>
      <button
        @click="updateServiceWorker(true)"
        class="h-10 px-4 rounded-xl bg-emerald-500 text-slate-950 text-sm font-extrabold active:bg-emerald-400"
      >
        Actualizar
      </button>
    </div>
  </div>
</template>

<script setup>
import { useRegisterSW } from 'virtual:pwa-register/vue';

const { needRefresh, updateServiceWorker } = useRegisterSW({
  onRegisteredSW(_url, registro) {
    // Mientras la app está abierta, buscar versiones nuevas cada hora
    if (registro) {
      setInterval(() => {
        if (navigator.onLine) registro.update();
      }, 60 * 60 * 1000);
    }
  },
});

const cerrar = () => {
  needRefresh.value = false;
};
</script>