<template>
  <div
    class="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 backdrop-blur-xs"
    @click.self="$emit('cerrar')"
  >
    <div
      role="dialog"
      aria-modal="true"
      class="w-full max-w-lg max-h-[85dvh] overflow-y-auto bg-white rounded-t-3xl p-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] space-y-4 shadow-2xl animate-slide-up"
    >
      <div class="flex items-center justify-between border-b border-slate-100 pb-3">
        <div class="min-w-0">
          <span class="text-[11px] font-bold uppercase text-amber-600">Reubicar en tienda</span>
          <h3 class="font-extrabold text-lg text-slate-900 truncate">{{ producto.nombre }}</h3>
        </div>
        <button
          @click="$emit('cerrar')"
          aria-label="Cerrar"
          class="w-11 h-11 shrink-0 rounded-full bg-slate-100 flex items-center justify-center active:bg-slate-200"
        >
          <X :size="20" />
        </button>
      </div>

      <!-- Listado de pasillos existentes ordenados -->
      <div class="max-h-60 overflow-y-auto space-y-2">
        <button
          v-for="ubi in ubicaciones"
          :key="ubi.id"
          :disabled="guardando"
          @click="seleccionarUbicacion(ubi.id)"
          :class="[
            'w-full min-h-12 p-3.5 rounded-xl border text-left font-bold flex items-center justify-between transition disabled:opacity-50',
            producto.ubicacion_id === ubi.id
              ? 'border-emerald-500 bg-emerald-50 text-emerald-900'
              : 'border-slate-200 active:bg-slate-50 text-slate-800'
          ]"
        >
          <span>{{ ubi.nombre }}</span>
          <span class="text-xs text-slate-400">Orden #{{ ubi.orden_recorrido }}</span>
        </button>
      </div>

      <!-- Crear nueva ubicación intercalada -->
      <div class="pt-2 border-t border-slate-200 space-y-2.5">
        <p class="text-xs font-extrabold uppercase text-slate-500">+ Crear pasillo nuevo</p>
        <input
          v-model="nuevoNombre"
          type="text"
          placeholder="Ej. Pasillo 3 - Aceites y Conservas"
          class="w-full h-12 px-3 rounded-xl border border-slate-300 text-base"
        />
        <div class="flex items-center gap-2">
          <span class="text-xs text-slate-600 shrink-0">Va después de:</span>
          <select
            v-model.number="despuesDeOrden"
            class="flex-1 h-11 px-2 rounded-xl border border-slate-300 text-sm font-semibold bg-white"
          >
            <option :value="0">Al principio de la tienda</option>
            <option v-for="ubi in ubicaciones" :key="ubi.id" :value="ubi.orden_recorrido">
              {{ ubi.nombre }}
            </option>
          </select>
        </div>

        <p v-if="error" class="text-sm font-semibold text-red-600">{{ error }}</p>

        <button
          :disabled="!nuevoNombre.trim() || guardando"
          @click="crearYAsignar"
          class="w-full h-12 bg-slate-900 disabled:opacity-40 text-white font-bold rounded-xl text-sm"
        >
          {{ guardando ? 'Guardando…' : 'Crear pasillo y mover producto aquí' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { X } from 'lucide-vue-next';
import { useProductos } from '../composables/useProductos';

const props = defineProps({
  producto: Object,
  establecimiento: Object,
});
const emit = defineEmits(['cerrar']);

const { cambiarUbicacionProducto, crearPasilloYAsignar } = useProductos();

const nuevoNombre = ref('');
const guardando = ref(false);
const error = ref('');

// Pasillos siempre ordenados por recorrido
const ubicaciones = computed(() =>
  [...(props.establecimiento?.ubicaciones || [])].sort(
    (a, b) => a.orden_recorrido - b.orden_recorrido
  )
);

// Por defecto, el pasillo nuevo va al final (después del mayor orden real)
const despuesDeOrden = ref(
  ubicaciones.value.length
    ? ubicaciones.value[ubicaciones.value.length - 1].orden_recorrido
    : 0
);

const seleccionarUbicacion = async (ubicacionId) => {
  if (guardando.value) return;
  guardando.value = true;
  error.value = '';
  try {
    await cambiarUbicacionProducto(props.producto.id, ubicacionId);
    emit('cerrar');
  } catch (e) {
    console.error(e);
    error.value = 'No se pudo cambiar el pasillo. Inténtalo de nuevo.';
  } finally {
    guardando.value = false;
  }
};

const crearYAsignar = async () => {
  if (!nuevoNombre.value.trim() || guardando.value) return;
  guardando.value = true;
  error.value = '';
  try {
    await crearPasilloYAsignar({
      establecimiento_id: props.establecimiento.id,
      nombre: nuevoNombre.value.trim(),
      despues_de_orden: despuesDeOrden.value,
      productoId: props.producto.id,
    });
    emit('cerrar');
  } catch (e) {
    console.error(e);
    error.value = 'No se pudo crear el pasillo. Quizá ya existe uno con ese nombre.';
  } finally {
    guardando.value = false;
  }
};

// Cerrar con Escape y bloquear el scroll del fondo mientras está abierto
const onKey = (e) => {
  if (e.key === 'Escape') emit('cerrar');
};
onMounted(() => {
  window.addEventListener('keydown', onKey);
  document.body.style.overflow = 'hidden';
});
onUnmounted(() => {
  window.removeEventListener('keydown', onKey);
  document.body.style.overflow = '';
});
</script>