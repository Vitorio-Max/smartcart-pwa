<template>
  <TransitionGroup
    name="toast"
    tag="div"
    aria-live="polite"
    class="fixed inset-x-0 z-[60] px-4 top-[calc(env(safe-area-inset-top)+4.75rem)] flex flex-col items-center gap-2 pointer-events-none"
  >
    <button
      v-for="t in toasts"
      :key="t.id"
      type="button"
      role="status"
      @click="quitarToast(t.id)"
      :class="[
        'pointer-events-auto w-full max-w-sm rounded-2xl px-4 py-3 shadow-xl flex items-start gap-3 text-left text-sm font-semibold text-white',
        estilos[t.tipo],
      ]"
    >
      <component :is="iconos[t.tipo]" :size="20" class="shrink-0 mt-0.5" />
      <span class="flex-1 leading-snug">{{ t.mensaje }}</span>
    </button>
  </TransitionGroup>
</template>

<script setup>
import { CircleCheck, CircleAlert, Info } from 'lucide-vue-next';
import { toasts, quitarToast } from '../composables/useToast';

const estilos = {
  exito: 'bg-emerald-600',
  error: 'bg-red-600',
  info: 'bg-slate-900',
};

const iconos = {
  exito: CircleCheck,
  error: CircleAlert,
  info: Info,
};
</script>
