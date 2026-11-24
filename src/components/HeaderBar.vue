<template>
  <header
    class="sticky top-0 z-30 bg-slate-900 text-white px-3 pb-3 pt-[calc(env(safe-area-inset-top)+0.75rem)] shadow-md"
  >
    <div class="max-w-lg mx-auto flex items-center gap-2">
      <!-- Menú -->
      <button
        @click="$emit('abrirMenu')"
        aria-label="Abrir menú"
        class="w-11 h-11 shrink-0 -ml-1 rounded-xl flex items-center justify-center text-slate-200 active:bg-slate-800"
      >
        <Menu :size="24" />
      </button>

      <!-- Switch Central de Modo (solo visible en pestaña Lista) -->
      <div
        v-if="tabActiva === 'lista'"
        class="flex flex-1 min-w-0 bg-slate-800 p-1 rounded-xl border border-slate-700"
      >
        <button
          @click="$emit('update:modoLista', 'casa')"
          :aria-pressed="modoLista === 'casa'"
          :class="[
            'flex-1 h-10 px-2 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-1.5 whitespace-nowrap',
            modoLista === 'casa'
              ? 'bg-emerald-500 text-slate-950 shadow'
              : 'text-slate-300 active:text-white'
          ]"
        >
          <Home :size="16" class="hidden min-[390px]:block" /> En Casa
        </button>
        <button
          @click="$emit('update:modoLista', 'tienda')"
          :aria-pressed="modoLista === 'tienda'"
          :class="[
            'flex-1 h-10 px-2 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-1.5 whitespace-nowrap',
            modoLista === 'tienda'
              ? 'bg-amber-400 text-slate-950 shadow'
              : 'text-slate-300 active:text-white'
          ]"
        >
          <ShoppingCart :size="16" class="hidden min-[390px]:block" /> En Tienda
        </button>
      </div>

      <div v-else class="flex-1 min-w-0 font-extrabold text-base truncate">
        <span v-if="tabActiva === 'basicos'">⭐ Productos Básicos</span>
        <span v-else>📦 Mi Despensa</span>
      </div>

      <!-- Indicador de Presupuesto en Tiempo Real -->
      <div class="shrink-0 text-right bg-slate-800/90 px-3 py-1 rounded-xl border border-slate-700/80">
        <span class="block text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
          Pendiente
        </span>
        <span class="text-sm font-black text-emerald-400 tabular-nums whitespace-nowrap">
          {{ formatEuro(presupuesto) }}
        </span>
      </div>
    </div>
  </header>
</template>

<script setup>
import { Menu, Home, ShoppingCart } from 'lucide-vue-next';
import { formatEuro } from '../utils/formato';

defineProps({
  tabActiva: String,
  modoLista: String,
  presupuesto: { type: Number, default: 0 },
});
defineEmits(['update:modoLista', 'abrirMenu']);
</script>
