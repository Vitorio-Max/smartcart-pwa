<template>
  <!-- Teleport: se dibuja fuera de la lista para cubrir toda la pantalla -->
  <Teleport to="body">
    <div
      class="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 backdrop-blur-xs"
      @click.self="$emit('cerrar')"
    >
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="editar-producto-titulo"
        @submit.prevent="guardar"
        class="w-full max-w-lg max-h-[85dvh] overflow-y-auto bg-white rounded-t-3xl p-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] space-y-4 shadow-2xl animate-slide-up"
      >
        <div class="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
          <div class="min-w-0 space-y-1">
            <span class="text-[11px] font-bold uppercase text-emerald-600">Editar producto</span>
            <h3 id="editar-producto-titulo" class="font-extrabold text-lg text-slate-900 truncate">
              {{ producto.nombre }}
            </h3>
            <span
              v-if="producto.establecimiento"
              class="inline-block text-[11px] font-bold text-white px-2 py-0.5 rounded-md"
              :style="{ backgroundColor: producto.establecimiento.color_hex }"
            >
              {{ producto.establecimiento.nombre }}
            </span>
          </div>
          <button
            type="button"
            @click="$emit('cerrar')"
            aria-label="Cerrar"
            class="w-11 h-11 shrink-0 rounded-full bg-slate-100 flex items-center justify-center active:bg-slate-200"
          >
            <X :size="20" />
          </button>
        </div>

        <div>
          <label for="editar-nombre" class="block text-xs font-extrabold uppercase text-slate-500 mb-1.5">
            Nombre
          </label>
          <input
            id="editar-nombre"
            ref="inputNombre"
            v-model="nombre"
            type="text"
            maxlength="80"
            autocomplete="off"
            class="w-full h-12 px-3 rounded-xl border border-slate-300 text-base"
          />
        </div>

        <div>
          <label for="editar-precio" class="block text-xs font-extrabold uppercase text-slate-500 mb-1.5">
            Precio (€)
          </label>
          <input
            id="editar-precio"
            v-model.number="precio"
            type="number"
            inputmode="decimal"
            step="0.01"
            min="0"
            class="w-full h-12 px-3 rounded-xl border border-slate-300 text-base tabular-nums"
          />
        </div>

        <p class="text-xs text-slate-500 leading-snug">
          Para cambiar el supermercado, el pasillo o el stock mínimo: menú → Productos.
        </p>

        <p v-if="error" role="alert" class="text-sm font-semibold text-red-600">{{ error }}</p>

        <div class="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            @click="$emit('cerrar')"
            :disabled="guardando"
            class="h-12 rounded-xl bg-slate-100 text-slate-800 font-bold active:bg-slate-200 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            :disabled="guardando || !nombre.trim()"
            class="h-12 rounded-xl bg-emerald-600 text-white font-extrabold active:bg-emerald-700 disabled:opacity-40"
          >
            {{ guardando ? 'Guardando…' : 'Guardar' }}
          </button>
        </div>
      </form>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { X } from 'lucide-vue-next';
import { useProductos } from '../composables/useProductos';

const props = defineProps({
  producto: { type: Object, required: true },
});
const emit = defineEmits(['cerrar']);

const { guardarProducto } = useProductos();

const nombre = ref(props.producto.nombre);
const precio = ref(Number(props.producto.precio) || 0);
const guardando = ref(false);
const error = ref('');
const inputNombre = ref(null);

const guardar = async () => {
  if (guardando.value) return;
  const nombreLimpio = nombre.value.trim();
  if (!nombreLimpio) return;
  const precioLimpio = Math.max(0, Number(precio.value) || 0);

  // Sin cambios: se cierra sin molestar al servidor
  if (
    nombreLimpio === props.producto.nombre &&
    precioLimpio === (Number(props.producto.precio) || 0)
  ) {
    emit('cerrar');
    return;
  }

  guardando.value = true;
  error.value = '';
  try {
    await guardarProducto({
      id: props.producto.id,
      nombre: nombreLimpio,
      precio: precioLimpio,
    });
    emit('cerrar');
  } catch (e) {
    console.error(e);
    error.value =
      e?.code === '23505'
        ? 'Ya existe un producto con ese nombre en este supermercado.'
        : 'No se pudo guardar. Revisa tu conexión e inténtalo de nuevo.';
  } finally {
    guardando.value = false;
  }
};

const onKey = (e) => {
  if (e.key === 'Escape') emit('cerrar');
};

onMounted(() => {
  window.addEventListener('keydown', onKey);
  document.body.style.overflow = 'hidden';
  inputNombre.value?.focus();
  inputNombre.value?.select();
});
onUnmounted(() => {
  window.removeEventListener('keydown', onKey);
  document.body.style.overflow = '';
});
</script>
