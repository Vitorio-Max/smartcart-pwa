<template>
  <section class="space-y-4">
    <!-- Escanear ticket -->
    <button
      @click="$emit('abrirEscaner')"
      class="w-full rounded-2xl bg-slate-900 text-white px-4 py-3 flex items-center gap-3 text-left active:scale-[0.99] transition"
    >
      <span
        class="w-11 h-11 shrink-0 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center"
      >
        <Camera :size="22" />
      </span>
      <span class="min-w-0">
        <span class="block font-extrabold leading-tight">Escanear ticket</span>
        <span class="block text-xs text-slate-300 leading-snug">
          Suma lo comprado a tu despensa y actualiza precios
        </span>
      </span>
    </button>

    <!-- Filtros y modo edición -->
    <div class="flex items-center gap-2">
      <button @click="filtro = 'todos'" :class="chip(filtro === 'todos')">
        Todos ({{ productosDespensa.length }})
      </button>
      <button @click="filtro = 'alertas'" :class="chip(filtro === 'alertas')">
        Por reponer ({{ productosAlerta.length }})
      </button>

      <button
        @click="alternarEdicion"
        :aria-pressed="modoEdicion"
        :aria-label="modoEdicion ? 'Terminar de editar' : 'Editar despensa'"
        :class="[
          'ml-auto w-10 h-10 shrink-0 rounded-full border flex items-center justify-center transition',
          modoEdicion
            ? 'bg-emerald-600 border-emerald-600 text-white'
            : 'bg-white border-slate-200 text-slate-600 active:bg-slate-100',
        ]"
      >
        <Check v-if="modoEdicion" :size="18" />
        <Pencil v-else :size="18" />
      </button>
    </div>

    <p v-if="modoEdicion" class="text-xs text-slate-500 -mt-1 leading-snug">
      Modo edición: ajusta el stock con − y +, o quita productos de la despensa (siguen en tu
      catálogo y en Básicos). Cuando termines, pulsa ✓.
    </p>

    <p
      v-if="errorAccion"
      role="alert"
      class="rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-semibold p-3"
    >
      {{ errorAccion }}
    </p>

    <!-- Estados vacíos -->
    <div v-if="visibles.length === 0" class="text-center py-12 text-slate-500">
      <template v-if="filtro === 'alertas'">
        <p class="text-4xl mb-2">🎉</p>
        <p class="font-bold text-slate-700">Todo en orden</p>
        <p class="text-sm mt-1">No hay nada por reponer ahora mismo.</p>
      </template>
      <template v-else-if="productosFuera.length > 0">
        <p class="text-4xl mb-2">📦</p>
        <p class="font-bold text-slate-700">No hay productos en la despensa</p>
        <p class="text-sm mt-1">
          Pulsa el lápiz y añade productos desde «Fuera de la despensa».
        </p>
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
          <div class="min-w-0 flex-1">
            <p class="font-bold text-slate-900 leading-tight truncate">{{ prod.nombre }}</p>
            <p :class="['text-xs font-semibold mt-0.5', estilos[estadoStock(prod)].texto]">
              {{ etiqueta(prod) }}
            </p>
          </div>

          <!-- Ajustar stock: solo en modo edición -->
          <div v-if="modoEdicion" class="flex items-center gap-1 shrink-0">
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

          <!-- Fuera del modo edición: el stock es solo de consulta -->
          <div
            v-else
            :aria-label="'Stock: ' + prod.stock_actual"
            class="shrink-0 min-w-11 h-11 px-3 rounded-xl bg-white/70 border border-slate-200 flex items-center justify-center text-lg font-black tabular-nums text-slate-800"
          >
            {{ prod.stock_actual }}
          </div>
        </div>

        <!-- Edición: quitar de la despensa -->
        <div v-if="modoEdicion" class="mt-3">
          <button
            @click="quitar(prod)"
            class="w-full h-11 rounded-xl bg-white border border-slate-300 text-slate-700 text-sm font-bold flex items-center justify-center gap-2 active:bg-slate-100"
          >
            <EyeOff :size="18" /> Quitar de la despensa
          </button>
        </div>

        <!-- Reposición (fuera del modo edición) -->
        <div v-else-if="estadoStock(prod) !== 'ok'" class="mt-3">
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

    <!-- Productos fuera de la despensa (solo en modo edición) -->
    <section v-if="modoEdicion && productosFuera.length > 0" class="pt-2">
      <button
        @click="mostrarFuera = !mostrarFuera"
        :aria-expanded="mostrarFuera"
        class="w-full h-11 px-1 flex items-center justify-between text-sm font-extrabold text-slate-600"
      >
        <span>Fuera de la despensa ({{ productosFuera.length }})</span>
        <ChevronDown :size="18" :class="['transition-transform', mostrarFuera ? 'rotate-180' : '']" />
      </button>

      <ul v-if="mostrarFuera" class="space-y-2 mt-1">
        <li
          v-for="p in productosFuera"
          :key="p.id"
          class="rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 flex items-center gap-3"
        >
          <span class="flex-1 min-w-0 truncate font-semibold text-slate-700">{{ p.nombre }}</span>
          <button
            @click="poner(p)"
            class="h-10 px-3 shrink-0 rounded-xl bg-emerald-600 text-white text-sm font-bold flex items-center gap-1.5 active:bg-emerald-700"
          >
            <Plus :size="16" /> Añadir
          </button>
        </li>
      </ul>
    </section>

    <!-- Deshacer al quitar un producto -->
    <div
      v-if="deshacer"
      role="status"
      class="fixed inset-x-0 z-40 px-4 bottom-[calc(env(safe-area-inset-bottom)+4.75rem)]"
    >
      <div
        class="max-w-lg mx-auto bg-slate-900 text-white rounded-2xl shadow-xl p-3 pl-4 flex items-center gap-2"
      >
        <p class="flex-1 min-w-0 text-sm font-semibold leading-snug truncate">
          «{{ deshacer.nombre }}» quitado de la despensa
        </p>
        <button
          @click="deshacerQuitar"
          class="h-10 px-4 shrink-0 rounded-xl bg-emerald-500 text-slate-950 text-sm font-extrabold active:bg-emerald-400"
        >
          Deshacer
        </button>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, computed, onUnmounted } from 'vue';
import {
  Camera, Minus, Plus, ShoppingCart, Pencil, Check, EyeOff, ChevronDown,
} from 'lucide-vue-next';
import { useDespensa, estadoStock } from '../composables/useDespensa';

defineEmits(['abrirEscaner']);

const {
  productosDespensa,
  productosFuera,
  productosAlerta,
  cantidadesPorProducto,
  ajustarStock,
  reponer,
  cambiarEnDespensa,
} = useDespensa();

const filtro = ref('todos');
const modoEdicion = ref(false);
const mostrarFuera = ref(false);
const errorAccion = ref('');
const deshacer = ref(null); // { id, nombre } del último producto quitado
let temporizador = null;

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

const alternarEdicion = () => {
  modoEdicion.value = !modoEdicion.value;
  errorAccion.value = '';
  if (!modoEdicion.value) mostrarFuera.value = false;
};

// Quita el producto de la despensa al instante y ofrece deshacer durante 6 segundos
const quitar = (prod) => {
  errorAccion.value = '';
  const promesa = cambiarEnDespensa(prod, false);

  deshacer.value = { id: prod.id, nombre: prod.nombre };
  clearTimeout(temporizador);
  temporizador = setTimeout(() => {
    deshacer.value = null;
  }, 6000);

  promesa.catch(() => {
    deshacer.value = null;
    errorAccion.value =
      'No se pudo quitar el producto de la despensa. Revisa tu conexión e inténtalo de nuevo.';
  });
};

const deshacerQuitar = () => {
  const actual = deshacer.value;
  if (!actual) return;
  deshacer.value = null;
  clearTimeout(temporizador);
  cambiarEnDespensa({ id: actual.id }, true).catch(() => {
    errorAccion.value = 'No se pudo deshacer. Añádelo desde «Fuera de la despensa».';
  });
};

const poner = (prod) => {
  errorAccion.value = '';
  cambiarEnDespensa(prod, true).catch(() => {
    errorAccion.value = 'No se pudo añadir el producto a la despensa. Revisa tu conexión.';
  });
};

onUnmounted(() => clearTimeout(temporizador));
</script>