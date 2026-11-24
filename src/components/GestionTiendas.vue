<template>
  <div class="fixed inset-0 z-40 flex flex-col bg-slate-50">
    <header
      class="bg-slate-900 text-white px-2 pb-3 pt-[calc(env(safe-area-inset-top)+0.75rem)] flex items-center gap-1"
    >
      <button
        @click="atras"
        aria-label="Volver"
        class="w-11 h-11 rounded-xl flex items-center justify-center active:bg-slate-800"
      >
        <ArrowLeft :size="22" />
      </button>
      <h2 class="font-extrabold text-base truncate">{{ titulo }}</h2>
    </header>

    <div class="flex-1 overflow-y-auto overscroll-contain">
      <div class="max-w-lg mx-auto p-4 pb-[calc(env(safe-area-inset-bottom)+2rem)] space-y-4">
        <!-- ============ LISTA ============ -->
        <template v-if="vista === 'lista'">
          <button
            @click="nuevo"
            class="w-full h-12 rounded-2xl bg-emerald-600 text-white font-extrabold flex items-center justify-center gap-2 active:scale-[0.99] transition"
          >
            <Plus :size="20" /> Nuevo supermercado
          </button>

          <div v-if="establecimientos.length === 0" class="text-center py-12 text-slate-500">
            <p class="text-4xl mb-2">🏪</p>
            <p class="font-bold text-slate-700">Aún no tienes supermercados</p>
            <p class="text-sm mt-1">Crea el primero para poder asignarle productos y pasillos.</p>
          </div>

          <ul class="space-y-2.5">
            <li v-for="est in establecimientos" :key="est.id">
              <button
                @click="editar(est)"
                class="w-full bg-white rounded-2xl border border-slate-200 shadow-sm p-3.5 flex items-center gap-3 text-left active:bg-slate-50"
              >
                <span class="w-3 h-10 rounded-md shrink-0" :style="{ backgroundColor: est.color_hex }"></span>
                <span class="min-w-0 flex-1">
                  <span class="block font-bold text-slate-900 truncate">{{ est.nombre }}</span>
                  <span class="block text-xs text-slate-500">
                    {{ est.ubicaciones.length }} pasillos · {{ productosDe(est.id) }} productos
                  </span>
                </span>
                <ChevronRight :size="18" class="text-slate-300 shrink-0" />
              </button>
            </li>
          </ul>
        </template>

        <!-- ============ FORMULARIO ============ -->
        <template v-else>
          <p
            v-if="error"
            role="alert"
            class="rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-semibold p-3"
          >
            {{ error }}
          </p>
          <p
            v-if="aviso"
            role="status"
            class="rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-semibold p-3"
          >
            {{ aviso }}
          </p>

          <!-- Datos básicos -->
          <div class="bg-white rounded-2xl border border-slate-200 p-4 space-y-4">
            <div>
              <label for="est-nombre" class="block text-xs font-extrabold uppercase text-slate-500 mb-1.5">
                Nombre
              </label>
              <input
                id="est-nombre"
                v-model="form.nombre"
                type="text"
                maxlength="40"
                placeholder="Ej. Mercadona"
                class="w-full h-12 px-3 rounded-xl border border-slate-300 text-base"
              />
            </div>

            <div>
              <p class="text-xs font-extrabold uppercase text-slate-500 mb-2">Color de la etiqueta</p>
              <div class="flex flex-wrap items-center gap-2.5">
                <button
                  v-for="c in COLORES"
                  :key="c"
                  type="button"
                  @click="form.color_hex = c"
                  :aria-label="'Color ' + c"
                  :aria-pressed="form.color_hex.toLowerCase() === c.toLowerCase()"
                  :class="[
                    'w-10 h-10 rounded-full border-4 transition',
                    form.color_hex.toLowerCase() === c.toLowerCase()
                      ? 'border-slate-900'
                      : 'border-white shadow',
                  ]"
                  :style="{ backgroundColor: c }"
                ></button>

                <label
                  class="relative w-10 h-10 rounded-full border border-dashed border-slate-300 flex items-center justify-center overflow-hidden text-slate-400"
                >
                  <input
                    type="color"
                    v-model="form.color_hex"
                    aria-label="Color personalizado"
                    class="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <Palette :size="18" />
                </label>
              </div>
              <p class="mt-3 text-xs text-slate-500">
                Vista previa:
                <span
                  class="inline-block text-[11px] font-bold text-white px-2 py-0.5 rounded-md align-middle"
                  :style="{ backgroundColor: form.color_hex }"
                >
                  {{ form.nombre || 'Supermercado' }}
                </span>
              </p>
            </div>

            <button
              @click="guardar"
              :disabled="guardando || !form.nombre.trim()"
              class="w-full h-12 rounded-xl bg-emerald-600 text-white font-extrabold disabled:opacity-40 active:scale-[0.99] transition"
            >
              {{ guardando ? 'Guardando…' : editandoId ? 'Guardar cambios' : 'Crear supermercado' }}
            </button>
          </div>

          <!-- Pasillos (solo al editar un supermercado existente) -->
          <div v-if="editandoId" class="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
            <div>
              <h3 class="font-extrabold text-slate-900">Pasillos y zonas</h3>
              <p class="text-xs text-slate-500 mt-0.5">
                El orden es el recorrido de la tienda: en Modo Tienda, los productos pendientes
                se agrupan siguiendo este orden.
              </p>
            </div>

            <p v-if="ubicacionesEdit.length === 0" class="text-sm text-slate-400">
              Aún no hay pasillos. Añade el primero abajo.
            </p>

            <ul class="space-y-2">
              <li v-for="(u, i) in ubicacionesEdit" :key="u.id" class="space-y-1.5">
                <div class="flex items-center gap-1.5">
                  <span class="w-6 text-center text-xs font-black text-slate-400 tabular-nums">
                    {{ i + 1 }}
                  </span>
                  <input
                    :value="u.nombre"
                    @change="renombrar(u, $event)"
                    type="text"
                    maxlength="60"
                    :aria-label="'Nombre del pasillo ' + (i + 1)"
                    class="flex-1 min-w-0 h-11 px-3 rounded-xl border border-slate-300 text-sm font-semibold"
                  />
                  <button
                    @click="mover(i, -1)"
                    :disabled="i === 0 || ocupado"
                    aria-label="Subir"
                    class="w-10 h-11 shrink-0 rounded-xl bg-slate-100 flex items-center justify-center active:bg-slate-200 disabled:opacity-30"
                  >
                    <ChevronUp :size="18" />
                  </button>
                  <button
                    @click="mover(i, 1)"
                    :disabled="i === ubicacionesEdit.length - 1 || ocupado"
                    aria-label="Bajar"
                    class="w-10 h-11 shrink-0 rounded-xl bg-slate-100 flex items-center justify-center active:bg-slate-200 disabled:opacity-30"
                  >
                    <ChevronDown :size="18" />
                  </button>
                  <button
                    @click="ubicacionBorrando = ubicacionBorrando === u.id ? null : u.id"
                    :disabled="ocupado"
                    aria-label="Eliminar pasillo"
                    class="w-10 h-11 shrink-0 rounded-xl text-red-500 flex items-center justify-center active:bg-red-50 disabled:opacity-30"
                  >
                    <Trash2 :size="18" />
                  </button>
                </div>

                <div
                  v-if="ubicacionBorrando === u.id"
                  class="ml-7 rounded-xl bg-red-50 border border-red-200 p-3 space-y-2"
                >
                  <p class="text-sm text-red-800 font-semibold">
                    ¿Eliminar «{{ u.nombre }}»? Sus productos quedarán sin pasillo.
                  </p>
                  <div class="grid grid-cols-2 gap-2">
                    <button
                      @click="ubicacionBorrando = null"
                      class="h-10 rounded-lg bg-white border border-slate-200 text-slate-700 text-sm font-bold"
                    >
                      Cancelar
                    </button>
                    <button
                      @click="confirmarBorrarUbicacion(u)"
                      :disabled="ocupado"
                      class="h-10 rounded-lg bg-red-600 text-white text-sm font-bold disabled:opacity-50"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              </li>
            </ul>

            <div class="flex gap-2 pt-1">
              <input
                v-model="nuevoPasillo"
                @keyup.enter="anadir"
                type="text"
                maxlength="60"
                placeholder="Nuevo pasillo (se añade al final)"
                class="flex-1 min-w-0 h-12 px-3 rounded-xl border border-slate-300 text-base"
              />
              <button
                @click="anadir"
                :disabled="!nuevoPasillo.trim() || ocupado"
                aria-label="Añadir pasillo"
                class="w-12 h-12 shrink-0 rounded-xl bg-slate-900 text-white flex items-center justify-center disabled:opacity-40 active:bg-slate-800"
              >
                <Plus :size="20" />
              </button>
            </div>
          </div>

          <!-- Eliminar supermercado -->
          <div
            v-if="editandoId"
            class="bg-white rounded-2xl border border-red-100 p-4 space-y-3"
          >
            <h3 class="font-extrabold text-red-700">Eliminar supermercado</h3>

            <p v-if="productosEdit > 0" class="text-sm text-slate-600">
              Tiene {{ productosEdit }} producto(s). Para poder eliminarlo, bórralos o muévelos antes
              a otro supermercado (menú → Productos).
            </p>

            <template v-else>
              <p class="text-sm text-slate-600">Se eliminarán también todos sus pasillos.</p>
              <button
                v-if="!confirmandoBorrado"
                @click="confirmandoBorrado = true"
                class="w-full h-12 rounded-xl border border-red-300 text-red-600 font-bold active:bg-red-50"
              >
                Eliminar supermercado
              </button>
              <div v-else class="grid grid-cols-2 gap-2">
                <button
                  @click="confirmandoBorrado = false"
                  class="h-12 rounded-xl bg-slate-100 text-slate-800 font-bold"
                >
                  Cancelar
                </button>
                <button
                  @click="borrar"
                  :disabled="ocupado"
                  class="h-12 rounded-xl bg-red-600 text-white font-extrabold disabled:opacity-50"
                >
                  Sí, eliminar
                </button>
              </div>
            </template>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue';
import {
  ArrowLeft, Plus, ChevronRight, ChevronUp, ChevronDown, Trash2, Palette,
} from 'lucide-vue-next';
import { useProductos } from '../composables/useProductos';

const emit = defineEmits(['cerrar']);

const {
  productos,
  establecimientos,
  guardarEstablecimiento,
  borrarEstablecimiento,
  renombrarUbicacion,
  anadirUbicacion,
  borrarUbicacion,
  reordenarUbicaciones,
} = useProductos();

const COLORES = ['#009E49', '#F59E0B', '#EF4444', '#3B82F6', '#8B5CF6', '#EC4899', '#14B8A6', '#64748B'];

const vista = ref('lista'); // 'lista' | 'form'
const editandoId = ref(null);
const form = reactive({ nombre: '', color_hex: COLORES[0] });

const guardando = ref(false);
const ocupado = ref(false);
const error = ref('');
const aviso = ref('');
const nuevoPasillo = ref('');
const ubicacionBorrando = ref(null);
const confirmandoBorrado = ref(false);

const productosDe = (id) => productos.value.filter((p) => p.establecimiento_id === id).length;

const estEdit = computed(() => establecimientos.value.find((e) => e.id === editandoId.value) || null);
const ubicacionesEdit = computed(() =>
  [...(estEdit.value?.ubicaciones || [])].sort((a, b) => a.orden_recorrido - b.orden_recorrido)
);
const productosEdit = computed(() => (editandoId.value ? productosDe(editandoId.value) : 0));

const titulo = computed(() => {
  if (vista.value === 'lista') return 'Supermercados';
  return editandoId.value ? 'Editar supermercado' : 'Nuevo supermercado';
});

const limpiarMensajes = () => {
  error.value = '';
  aviso.value = '';
};

const mensajeDe = (e, duplicado, generico) =>
  e?.code === '23505' ? duplicado : generico;

const nuevo = () => {
  limpiarMensajes();
  editandoId.value = null;
  form.nombre = '';
  form.color_hex = COLORES[0];
  nuevoPasillo.value = '';
  ubicacionBorrando.value = null;
  confirmandoBorrado.value = false;
  vista.value = 'form';
};

const editar = (est) => {
  limpiarMensajes();
  editandoId.value = est.id;
  form.nombre = est.nombre;
  form.color_hex = est.color_hex;
  nuevoPasillo.value = '';
  ubicacionBorrando.value = null;
  confirmandoBorrado.value = false;
  vista.value = 'form';
};

const atras = () => {
  if (vista.value === 'form') {
    vista.value = 'lista';
    editandoId.value = null;
    limpiarMensajes();
  } else {
    emit('cerrar');
  }
};

const guardar = async () => {
  if (guardando.value) return;
  const nombre = form.nombre.trim();
  if (!nombre) return;

  guardando.value = true;
  limpiarMensajes();
  try {
    const eraNuevo = !editandoId.value;
    const id = await guardarEstablecimiento({
      id: editandoId.value,
      nombre,
      color_hex: form.color_hex,
    });
    if (eraNuevo) {
      // Se queda en el formulario, ya en modo edición, para añadir los pasillos
      editandoId.value = id;
      aviso.value = 'Supermercado creado. Ahora puedes añadir sus pasillos.';
    } else {
      vista.value = 'lista';
      editandoId.value = null;
    }
  } catch (e) {
    console.error(e);
    error.value = mensajeDe(
      e,
      'Ya existe un supermercado con ese nombre.',
      'No se pudo guardar. Inténtalo de nuevo.'
    );
  } finally {
    guardando.value = false;
  }
};

const renombrar = async (ubicacion, evento) => {
  const nombre = evento.target.value.trim();
  if (!nombre || nombre === ubicacion.nombre) {
    evento.target.value = ubicacion.nombre;
    return;
  }
  limpiarMensajes();
  ocupado.value = true;
  try {
    await renombrarUbicacion(ubicacion.id, nombre);
  } catch (e) {
    console.error(e);
    evento.target.value = ubicacion.nombre;
    error.value = mensajeDe(
      e,
      'Ya existe un pasillo con ese nombre en este supermercado.',
      'No se pudo renombrar el pasillo.'
    );
  } finally {
    ocupado.value = false;
  }
};

const mover = async (indice, direccion) => {
  const destino = indice + direccion;
  const ids = ubicacionesEdit.value.map((u) => u.id);
  if (destino < 0 || destino >= ids.length || ocupado.value) return;

  [ids[indice], ids[destino]] = [ids[destino], ids[indice]];
  limpiarMensajes();
  ocupado.value = true;
  try {
    await reordenarUbicaciones(editandoId.value, ids);
  } catch (e) {
    console.error(e);
    error.value = 'No se pudo cambiar el orden. ¿Has creado la función reordenar_ubicaciones en Supabase?';
  } finally {
    ocupado.value = false;
  }
};

const anadir = async () => {
  const nombre = nuevoPasillo.value.trim();
  if (!nombre || ocupado.value) return;
  limpiarMensajes();
  ocupado.value = true;
  try {
    await anadirUbicacion(editandoId.value, nombre);
    nuevoPasillo.value = '';
  } catch (e) {
    console.error(e);
    error.value = mensajeDe(
      e,
      'Ya existe un pasillo con ese nombre en este supermercado.',
      'No se pudo añadir el pasillo.'
    );
  } finally {
    ocupado.value = false;
  }
};

const confirmarBorrarUbicacion = async (ubicacion) => {
  if (ocupado.value) return;
  limpiarMensajes();
  ocupado.value = true;
  try {
    await borrarUbicacion(ubicacion.id);
    ubicacionBorrando.value = null;
  } catch (e) {
    console.error(e);
    error.value = 'No se pudo eliminar el pasillo.';
  } finally {
    ocupado.value = false;
  }
};

const borrar = async () => {
  if (ocupado.value) return;
  limpiarMensajes();
  ocupado.value = true;
  try {
    await borrarEstablecimiento(editandoId.value);
    vista.value = 'lista';
    editandoId.value = null;
    confirmandoBorrado.value = false;
  } catch (e) {
    console.error(e);
    error.value = 'No se pudo eliminar el supermercado.';
    confirmandoBorrado.value = false;
  } finally {
    ocupado.value = false;
  }
};
</script>
