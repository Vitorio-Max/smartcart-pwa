<template>
  <Transition name="dialogo">
    <div
      v-if="dialogo"
      class="fixed inset-0 z-[55] flex items-end sm:items-center justify-center bg-slate-950/60 p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]"
      @click.self="responder(false)"
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="dialogo-titulo"
        class="w-full max-w-sm bg-white rounded-3xl p-5 space-y-4 shadow-2xl"
      >
        <div class="space-y-1.5">
          <h3 id="dialogo-titulo" class="text-lg font-extrabold text-slate-900">
            {{ dialogo.titulo }}
          </h3>
          <p v-if="dialogo.mensaje" class="text-sm text-slate-600 leading-snug">
            {{ dialogo.mensaje }}
          </p>
        </div>

        <div class="grid grid-cols-2 gap-2.5">
          <button
            @click="responder(false)"
            class="h-12 rounded-xl bg-slate-100 text-slate-800 font-bold active:bg-slate-200"
          >
            {{ dialogo.textoCancelar }}
          </button>
          <button
            @click="responder(true)"
            class="h-12 rounded-xl bg-slate-900 text-white font-extrabold active:bg-slate-800"
          >
            {{ dialogo.textoConfirmar }}
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { onMounted, onUnmounted } from 'vue';
import { dialogo, responder } from '../composables/useConfirm';

const onKey = (e) => {
  if (e.key === 'Escape' && dialogo.value) responder(false);
};
onMounted(() => window.addEventListener('keydown', onKey));
onUnmounted(() => window.removeEventListener('keydown', onKey));
</script>
