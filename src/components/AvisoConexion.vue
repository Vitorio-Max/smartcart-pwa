<template>
  <div
    v-if="!online"
    role="status"
    class="mb-4 rounded-2xl bg-amber-50 border border-amber-200 px-4 py-3 flex items-start gap-3 text-amber-900"
  >
    <WifiOff :size="20" class="shrink-0 mt-0.5" />
    <p class="text-sm font-semibold leading-snug">
      Sin conexión. Puedes consultar tu lista, pero los cambios no se guardarán hasta que vuelva la cobertura.
    </p>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { WifiOff } from 'lucide-vue-next';

const online = ref(navigator.onLine);
const actualizar = () => {
  online.value = navigator.onLine;
};

onMounted(() => {
  window.addEventListener('online', actualizar);
  window.addEventListener('offline', actualizar);
});
onUnmounted(() => {
  window.removeEventListener('online', actualizar);
  window.removeEventListener('offline', actualizar);
});
</script>