<template>
  <section>
    <div v-if="basicos.length === 0" class="text-center py-16 px-6 text-slate-500">
      <p class="text-4xl mb-2">⭐</p>
      <p class="font-bold text-slate-700">Aún no tienes productos básicos</p>
      <p class="text-sm mt-1">
        Los que marques como básicos aparecerán aquí para añadirlos con un toque.
      </p>
    </div>

    <div v-else class="grid grid-cols-2 gap-3">
      <div v-for="prod in basicos" :key="prod.id" class="relative">
        <button
          @click="anadirOIncrementar(prod.id, 1)"
          class="w-full h-full min-h-36 bg-white rounded-2xl border border-slate-200 shadow-sm p-3 flex flex-col items-center text-center gap-1.5 active:scale-95 active:bg-emerald-50 transition"
        >
          <span class="font-bold text-sm text-slate-900 leading-tight line-clamp-2">
            {{ prod.nombre }}
          </span>
          <span
            v-if="prod.establecimiento"
            class="text-[11px] font-bold px-2 py-0.5 rounded-full text-white"
            :style="{ backgroundColor: prod.establecimiento.color_hex }"
          >
            {{ prod.establecimiento.nombre }}
          </span>
          <span class="text-xs font-semibold text-slate-500 tabular-nums mt-auto">
            {{ formatEuro(prod.precio) }}
          </span>
        </button>

        <!-- Unidades ya en la lista -->
        <span
          v-if="cantidadesPorProducto[prod.id]"
          class="absolute -top-2 -right-2 min-w-7 h-7 px-1.5 rounded-full bg-emerald-500 text-white text-sm font-black flex items-center justify-center shadow pointer-events-none tabular-nums"
        >
          {{ cantidadesPorProducto[prod.id] }}
        </span>

        <!-- Quitar una unidad -->
        <button
          v-if="cantidadesPorProducto[prod.id]"
          @click="anadirOIncrementar(prod.id, -1)"
          aria-label="Quitar una unidad"
          class="absolute top-1.5 left-1.5 w-9 h-9 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center active:bg-slate-200"
        >
          <Minus :size="18" />
        </button>
      </div>
    </div>
  </section>
</template>

<script setup>
import { Minus } from 'lucide-vue-next';
import { useProductos } from '../composables/useProductos';
import { useLista } from '../composables/useLista';
import { formatEuro } from '../utils/formato';

const { basicos } = useProductos();
const { cantidadesPorProducto, anadirOIncrementar } = useLista();
</script>