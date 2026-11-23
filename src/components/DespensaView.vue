<template>
  <section class="space-y-4">
    <button
      @click="$emit('abrirEscaner')"
      class="w-full h-12 rounded-2xl bg-slate-900 text-white font-bold flex items-center justify-center gap-2 active:scale-[0.99] transition"
    >
      <Camera :size="20" /> Importar ticket
    </button>

    <!-- Filtro -->
    <div class="flex gap-2">
      <button
        @click="filtro = 'todos'"
        :class="chip(filtro === 'todos')"
      >
        Todos ({{ productosDespensa.length }})
      </button>
      <button
        @click="filtro = 'alertas'"
        :class="chip(filtro === 'alertas')"
      >
        Por reponer ({{ productosAlerta.length }})
      </button>
    </div>

    <!-- Estados vacíos -->
    <div v-if="visibles.length === 0" class="text-center py-12 text-slate-500">
      <template v-if="filtro === 'alertas'">
        <p class="text-4xl mb-2">🎉</p>
        <p class="font-bold text-slate-700">Todo en orden</p>
        <p class="text-sm mt-1">No hay nada por reponer ahora mismo.</p>
      </template>
      <template v-else>
        <p class="text-4xl mb-2">📦</p>
        <p class="font-bold text-slate-700">Tu despensa está vacía</p>
        <p class="text-sm mt-1">Crea productos desde la pestaña Lista.</p>
      </template>
    </div>

    <ul class="space-y-3">
      <li
        v-for="prod in visibles"
        :key="prod.id"
        :class="['rounded-2xl border p-3.5 shadow-sm', estilos[estadoStock(prod)].tarjeta]"
      >
        <div class="flex items-center gap-3">
          <span class="text-3xl">{{ prod.categoria_icono }}</span>

          <div class="min-w-0 flex-1">
            <p class="font-bold text-slate-900 leading-tight truncate">{{ prod.nombre }}</p>
            <p :class="['text-xs font-semibold mt-0.5', estilos[estadoStock(prod)].texto]">
              {{ etiqueta(prod) }}
            </p>
          </div>

          <div class="flex items-center gap-1 shrink-0">
            <button
              @click="ajustarStock(prod, -1)"
              :disabled="prod.stock_actual <= 0"
              aria-label="Restar una unidad"
              class="w-11 h-11 rounded-xl bg-white border border-slate-200 text-slate-800 flex items-center justify-center active:bg-slate-100 disabled:opacity-30"
            >
              <Minus :size="20" />
            </button>
            <span class="w-9 text-center text-lg font-black tabular-nums">
              {{ prod.stock_actual }}
            </span>
            <button
              @click="ajustarStock(prod, 1)"
              aria-label="Sumar una unidad"
              class="w-11 h-11 rounded-xl bg-white border border-slate-200 text-slate-800 flex items-center justify-center active:bg-slate-100"
            >
              <Plus :size="20" />
            </button>
          </div>
        </div>

        <!-- Reposición -->
        <div v-if="estadoStock(prod) !== 'ok'" class="mt-3">
          <p
            v-if="cantidadesPorProducto[prod.id]"
            class="h-11 rounded-xl bg-white/70 border border-slate-200 text-slate-600 text-sm font-bold flex items-center justify-center"
          >
            ✓ En la lista (×{{ cantidadesPorProducto[prod.id] }})
          </p>
          <button
            v-else
            @click="reponer(prod)"
            class="w-full h-11 rounded-xl bg-slate-900 text-white text-sm font-bold flex items-center justify-center gap-2 active:scale-[0.99] transition"
          >
            <ShoppingCart :size="18" /> Reponer (enviar a lista)
          </button>
        </div>
      </li>
    </ul>
  </section>
</template>

<script setup>
import { ref, computed } from 'vue';
import { Camera, Minus, Plus, ShoppingCart } from 'lucide-vue-next';
import { useDespensa, estadoStock } from '../composables/useDespensa';

defineEmits(['abrirEscaner']);

const {
  productosDespensa,
  productosAlerta,
  cantidadesPorProducto,
  ajustarStock,
  reponer,
} = useDespensa();

const filtro = ref('todos');

const visibles = computed(() =>
  filtro.value === 'alertas' ? productosAlerta.value : productosDespensa.value
);

const estilos = {
  agotado: { tarjeta: 'border-red-300 bg-red-50', texto: 'text-red-600' },
  bajo: { tarjeta: 'border-amber-300 bg-amber-50', texto: 'text-amber-700' },
  ok: { tarjeta: 'border-slate-200 bg-white', texto: 'text-slate-500' },
};

const etiqueta = (p) => {
  const e = estadoStock(p);
  if (e === 'agotado') return `Agotado · mínimo ${p.stock_minimo}`;
  if (e === 'bajo') return `Stock bajo · mínimo ${p.stock_minimo}`;
  return `Mínimo ${p.stock_minimo}`;
};

const chip = (activo) => [
  'h-10 px-4 rounded-full text-sm font-bold border transition whitespace-nowrap',
  activo
    ? 'bg-slate-900 text-white border-slate-900'
    : 'bg-white text-slate-600 border-slate-200',
];
</script>