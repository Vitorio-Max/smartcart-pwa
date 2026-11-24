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
            :disabled="establecimientos.length === 0"
            class="w-full h-12 rounded-2xl bg-emerald-600 text-white font-extrabold flex items-center justify-center gap-2 active:scale-[0.99] transition disabled:opacity-40"
          >
            <Plus :size="20" /> Nuevo producto
          </button>

          <p
            v-if="establecimientos.length === 0"
            class="rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm font-semibold p-3"
          >
            Primero crea un supermercado (menú → Supermercados) para poder asignarle productos.
          </p>

          <div class="relative">
            <Search :size="18" class="absolute left-3.5 top-3.5 text-slate-400 pointer-events-none" />
            <input
              v-model="busqueda"
              type="search"
              placeholder="Buscar producto..."
              autocomplete="off"
              class="w-full h-12 pl-10 pr-4 rounded-2xl bg-white border-2 border-slate-200 focus:border-emerald-500 focus:outline-none text-base"
            />
          </div>

          <select
            v-model="filtroTienda"
            aria-label="Filtrar por supermercado"
            class="w-full h-11 px-3 rounded-xl bg-white border border-slate-200 font-semibold text-sm"
          >
            <option value="todas">Todos los supermercados</option>
            <option v-for="est in establecimientos" :key="est.id" :value="est.id">
              {{ est.nombre }}
            </option>
          </select>

          <div v-if="filtrados.length === 0" class="text-center py-10 text-slate-500">
            <p class="text-4xl mb-2">{{ productos.length === 0 ? '📦' : '🔍' }}</p>
            <p class="font-bold text-slate-700">
              {{ productos.length === 0 ? 'Aún no tienes productos' : 'Sin resultados' }}
            </p>
          </div>

          <ul class="space-y-2.5">
            <li v-for="p in filtrados" :key="p.id">
              <button
                @click="editar(p)"
                class="w-full bg-white rounded-2xl border border-slate-200 shadow-sm p-3.5 flex items-center gap-3 text-left active:bg-slate-50"
              >
                <span class="min-w-0 flex-1">
                  <span class="flex items-center gap-1.5">
                    <span class="font-bold text-slate-900 truncate">{{ p.nombre }}</span>
                    <Star
                      v-if="p.es_basico"
                      :size="14"
                      class="fill-amber-400 text-amber-400 shrink-0"
                    />
                  </span>
                  <span class="flex flex-wrap items-center gap-1.5 mt-1">
                    <span
                      v-if="p.establecimiento"
                      class="text-[11px] font-bold text-white px-2 py-0.5 rounded-md"
                      :style="{ backgroundColor: p.establecimiento.color_hex }"
                    >
                      {{ p.establecimiento.nombre }}
                    </span>
                    <span v-if="p.ubicacion" class="text-xs text-slate-500 font-medium">
                      · {{ p.ubicacion.nombre }}
                    </span>
                  </span>
                </span>
                <span class="text-right shrink-0">
                  <span class="block text-sm font-extrabold tabular-nums">{{ formatEuro(p.precio) }}</span>
                  <span class="block text-[11px] text-slate-400">Stock {{ p.stock_actual }}</span>
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

          <div class="bg-white rounded-2xl border border-slate-200 p-4 space-y-4">
            <div>
              <label for="prod-nombre" class="block text-xs font-extrabold uppercase text-slate-500 mb-1.5">
                Nombre
              </label>
              <input
                id="prod-nombre"
                v-model="form.nombre"
                type="text"
                maxlength="80"
                placeholder="Ej. Leche semidesnatada"
                class="w-full h-12 px-3 rounded-xl border border-slate-300 text-base"
              />
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label for="prod-precio" class="block text-xs font-extrabold uppercase text-slate-500 mb-1.5">
                  Precio (€)
                </label>
                <input
                  id="prod-precio"
                  v-model.number="form.precio"
                  type="number"
                  inputmode="decimal"
                  step="0.01"
                  min="0"
                  class="w-full h-12 px-3 rounded-xl border border-slate-300 text-base tabular-nums"
                />
              </div>
              <div>
                <label for="prod-unidad" class="block text-xs font-extrabold uppercase text-slate-500 mb-1.5">
                  Unidad
                </label>
                <select
                  id="prod-unidad"
                  v-model="form.unidad_medida"
                  class="w-full h-12 px-3 rounded-xl border border-slate-300 bg-white text-base"
                >
                  <option v-for="u in UNIDADES" :key="u.valor" :value="u.valor">{{ u.texto }}</option>
                </select>
              </div>
            </div>

            <div>
              <label for="prod-tienda" class="block text-xs font-extrabold uppercase text-slate-500 mb-1.5">
                Supermercado
              </label>
              <select
                id="prod-tienda"
                v-model="form.establecimiento_id"
                @change="form.ubicacion_id = null"
                class="w-full h-12 px-3 rounded-xl border border-slate-300 bg-white text-base"
              >
                <option value="" disabled>Elige un supermercado…</option>
                <option v-for="est in establecimientos" :key="est.id" :value="est.id">
                  {{ est.nombre }}
                </option>
              </select>
            </div>

            <div>
              <label for="prod-pasillo" class="block text-xs font-extrabold uppercase text-slate-500 mb-1.5">
                Pasillo / zona
              </label>
              <select
                id="prod-pasillo"
                v-model="form.ubicacion_id"
                :disabled="!form.establecimiento_id"
                class="w-full h-12 px-3 rounded-xl border border-slate-300 bg-white text-base disabled:bg-slate-100 disabled:text-slate-400"
              >
                <option :value="null">Sin pasillo</option>
                <option v-for="u in ubicacionesTienda" :key="u.id" :value="u.id">
                  {{ u.nombre }}
                </option>
              </select>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label for="prod-stock" class="block text-xs font-extrabold uppercase text-slate-500 mb-1.5">
                  Stock en casa
                </label>
                <input
                  id="prod-stock"
                  v-model.number="form.stock_actual"
                  type="number"
                  inputmode="numeric"
                  step="1"
                  min="0"
                  class="w-full h-12 px-3 rounded-xl border border-slate-300 text-base tabular-nums"
                />
              </div>
              <div>
                <label for="prod-minimo" class="block text-xs font-extrabold uppercase text-slate-500 mb-1.5">
                  Stock mínimo
                </label>
                <input
                  id="prod-minimo"
                  v-model.number="form.stock_minimo"
                  type="number"
                  inputmode="numeric"
                  step="1"
                  min="0"
                  class="w-full h-12 px-3 rounded-xl border border-slate-300 text-base tabular-nums"
                />
              </div>
            </div>
            <p class="text-xs text-slate-500 -mt-2">
              Cuando el stock baje o iguale al mínimo, aparecerá en alerta en la Despensa.
            </p>

            <button
              type="button"
              role="switch"
              :aria-checked="form.es_basico"
              @click="form.es_basico = !form.es_basico"
              class="w-full min-h-12 px-3 rounded-xl border border-slate-300 flex items-center justify-between active:bg-slate-50"
            >
              <span class="flex items-center gap-2 font-semibold text-slate-800">
                <Star
                  :size="18"
                  :class="form.es_basico ? 'fill-amber-400 text-amber-400' : 'text-slate-300'"
                />
                Producto básico
              </span>
              <span
                :class="[
                  'w-12 h-7 rounded-full p-0.5 transition-colors',
                  form.es_basico ? 'bg-emerald-500' : 'bg-slate-300',
                ]"
              >
                <span
                  :class="[
                    'block w-6 h-6 rounded-full bg-white shadow transition-transform',
                    form.es_basico ? 'translate-x-5' : 'translate-x-0',
                  ]"
                ></span>
              </span>
            </button>

            <button
              @click="guardar"
              :disabled="guardando || !form.nombre.trim() || !form.establecimiento_id"
              class="w-full h-12 rounded-xl bg-emerald-600 text-white font-extrabold disabled:opacity-40 active:scale-[0.99] transition"
            >
              {{ guardando ? 'Guardando…' : editandoId ? 'Guardar cambios' : 'Crear producto' }}
            </button>
          </div>

          <!-- Eliminar -->
          <div v-if="editandoId" class="bg-white rounded-2xl border border-red-100 p-4 space-y-3">
            <h3 class="font-extrabold text-red-700">Eliminar producto</h3>
            <p class="text-sm text-slate-600">
              También desaparecerá de la lista de la compra si estaba en ella.
            </p>
            <button
              v-if="!confirmandoBorrado"
              @click="confirmandoBorrado = true"
              class="w-full h-12 rounded-xl border border-red-300 text-red-600 font-bold active:bg-red-50"
            >
              Eliminar producto
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
                :disabled="guardando"
                class="h-12 rounded-xl bg-red-600 text-white font-extrabold disabled:opacity-50"
              >
                Sí, eliminar
              </button>
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue';
import { ArrowLeft, Plus, ChevronRight, Search, Star } from 'lucide-vue-next';
import { useProductos } from '../composables/useProductos';
import { useLista } from '../composables/useLista';
import { formatEuro } from '../utils/formato';

const emit = defineEmits(['cerrar']);

const { productos, establecimientos, guardarProducto, borrarProducto } = useProductos();
const { cargarLista } = useLista();

const UNIDADES = [
  { valor: 'ud', texto: 'Unidad (ud)' },
  { valor: 'kg', texto: 'Kilo (kg)' },
  { valor: 'pack', texto: 'Pack' },
  { valor: 'l', texto: 'Litro (l)' },
];

const vista = ref('lista'); // 'lista' | 'form'
const editandoId = ref(null);
const busqueda = ref('');
const filtroTienda = ref('todas');
const guardando = ref(false);
const error = ref('');
const confirmandoBorrado = ref(false);

const formVacio = () => ({
  nombre: '',
  establecimiento_id: '',
  ubicacion_id: null,
  precio: 0,
  unidad_medida: 'ud',
  stock_actual: 0,
  stock_minimo: 1,
  es_basico: false,
});
const form = reactive(formVacio());

const normalizar = (s = '') =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

const filtrados = computed(() => {
  const q = normalizar(busqueda.value);
  return productos.value.filter(
    (p) =>
      (filtroTienda.value === 'todas' || p.establecimiento_id === filtroTienda.value) &&
      normalizar(p.nombre).includes(q)
  );
});

const ubicacionesTienda = computed(() => {
  const est = establecimientos.value.find((e) => e.id === form.establecimiento_id);
  return [...(est?.ubicaciones || [])].sort((a, b) => a.orden_recorrido - b.orden_recorrido);
});

const titulo = computed(() => {
  if (vista.value === 'lista') return 'Productos';
  return editandoId.value ? 'Editar producto' : 'Nuevo producto';
});

const nuevo = () => {
  error.value = '';
  confirmandoBorrado.value = false;
  editandoId.value = null;
  Object.assign(form, formVacio());
  // Si hay un filtro de tienda activo, se parte de esa tienda
  if (filtroTienda.value !== 'todas') form.establecimiento_id = filtroTienda.value;
  else if (establecimientos.value.length === 1) form.establecimiento_id = establecimientos.value[0].id;
  vista.value = 'form';
};

const editar = (p) => {
  error.value = '';
  confirmandoBorrado.value = false;
  editandoId.value = p.id;
  Object.assign(form, {
    nombre: p.nombre,
    establecimiento_id: p.establecimiento_id || '',
    ubicacion_id: p.ubicacion_id || null,
    precio: Number(p.precio) || 0,
    unidad_medida: p.unidad_medida || 'ud',
    stock_actual: p.stock_actual ?? 0,
    stock_minimo: p.stock_minimo ?? 1,
    es_basico: !!p.es_basico,
  });
  vista.value = 'form';
};

const atras = () => {
  if (vista.value === 'form') {
    vista.value = 'lista';
    editandoId.value = null;
    error.value = '';
  } else {
    emit('cerrar');
  }
};

const entero = (valor) => Math.max(0, Math.round(Number(valor) || 0));

const guardar = async () => {
  if (guardando.value) return;
  const nombre = form.nombre.trim();
  if (!nombre) return;
  if (!form.establecimiento_id) {
    error.value = 'Elige un supermercado.';
    return;
  }

  guardando.value = true;
  error.value = '';
  try {
    await guardarProducto({
      id: editandoId.value,
      nombre,
      establecimiento_id: form.establecimiento_id,
      ubicacion_id: form.ubicacion_id || null,
      precio: Math.max(0, Number(form.precio) || 0),
      unidad_medida: form.unidad_medida,
      stock_actual: entero(form.stock_actual),
      stock_minimo: entero(form.stock_minimo),
      es_basico: form.es_basico,
    });
    vista.value = 'lista';
    editandoId.value = null;
  } catch (e) {
    console.error(e);
    error.value =
      e?.code === '23505'
        ? 'Ya existe un producto con ese nombre en ese supermercado.'
        : 'No se pudo guardar. Inténtalo de nuevo.';
  } finally {
    guardando.value = false;
  }
};

const borrar = async () => {
  if (guardando.value) return;
  guardando.value = true;
  error.value = '';
  try {
    await borrarProducto(editandoId.value);
    await cargarLista(); // la base de datos también lo quita de la lista de la compra
    vista.value = 'lista';
    editandoId.value = null;
  } catch (e) {
    console.error(e);
    error.value = 'No se pudo eliminar el producto.';
    confirmandoBorrado.value = false;
  } finally {
    guardando.value = false;
  }
};
</script>
