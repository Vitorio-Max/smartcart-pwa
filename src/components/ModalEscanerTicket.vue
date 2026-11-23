<template>
  <div class="fixed inset-0 z-50 flex flex-col bg-slate-50">
    <header
      class="bg-slate-900 text-white px-4 pb-3 pt-[calc(env(safe-area-inset-top)+0.75rem)] flex items-center justify-between"
    >
      <h2 class="font-extrabold text-base">📸 Escanear ticket</h2>
      <button
        @click="$emit('cerrar')"
        aria-label="Cerrar"
        class="w-11 h-11 -mr-2 rounded-full flex items-center justify-center active:bg-slate-800"
      >
        <X :size="22" />
      </button>
    </header>

    <!-- Inputs ocultos -->
    <input ref="inputCamara" type="file" accept="image/*" capture="environment" class="hidden" @change="alElegir" />
    <input ref="inputGaleria" type="file" accept="image/*" class="hidden" @change="alElegir" />

    <div class="flex-1 overflow-y-auto">
      <div class="max-w-lg mx-auto p-4 space-y-4">
        <!-- 1. Elegir foto -->
        <div v-if="estado === 'inicial'" class="text-center py-10 space-y-5">
          <p class="text-5xl">🧾</p>
          <div>
            <p class="font-extrabold text-slate-900 text-lg">Fotografía tu ticket</p>
            <p class="text-sm text-slate-500 mt-1">
              Con buena luz, bien plano y completo. La IA lo leerá y tú revisas antes de guardar.
            </p>
          </div>
          <div class="space-y-3">
            <button
              @click="inputCamara.click()"
              class="w-full h-14 rounded-2xl bg-emerald-600 text-white font-extrabold flex items-center justify-center gap-2 active:scale-[0.99] transition"
            >
              <Camera :size="22" /> Hacer foto
            </button>
            <button
              @click="inputGaleria.click()"
              class="w-full h-12 rounded-2xl bg-white border border-slate-300 text-slate-800 font-bold flex items-center justify-center gap-2 active:bg-slate-100"
            >
              <ImagePlus :size="20" /> Elegir de la galería
            </button>
          </div>
        </div>

        <!-- 2. Procesando -->
        <div v-else-if="estado === 'procesando'" class="text-center py-20 space-y-4">
          <div class="mx-auto w-12 h-12 rounded-full border-4 border-slate-200 border-t-emerald-500 animate-spin"></div>
          <p class="font-bold text-slate-800">Leyendo tu ticket…</p>
          <p class="text-sm text-slate-500">Puede tardar unos segundos.</p>
        </div>

        <!-- Error de lectura -->
        <div v-else-if="estado === 'error'" class="text-center py-12 space-y-4">
          <p class="text-4xl">⚠️</p>
          <p class="font-bold text-slate-800">No se pudo leer el ticket</p>
          <p class="text-sm text-red-600 font-semibold break-words">{{ error }}</p>
          <button
            @click="reiniciar"
            class="h-12 px-6 rounded-xl bg-slate-900 text-white font-bold"
          >
            Probar con otra foto
          </button>
        </div>

        <!-- 5. Hecho -->
        <div v-else-if="estado === 'hecho'" class="text-center py-12 space-y-4">
          <p class="text-5xl">✅</p>
          <p class="font-extrabold text-slate-900 text-lg">Ticket guardado</p>
          <ul class="text-sm text-slate-600 space-y-1">
            <li>{{ resultado.actualizados }} producto(s) sumados a la despensa</li>
            <li v-if="resultado.creados">{{ resultado.creados }} producto(s) nuevos creados</li>
            <li v-if="resultado.precios">{{ resultado.precios }} precio(s) actualizados</li>
          </ul>
          <button
            @click="$emit('cerrar')"
            class="h-12 px-8 rounded-xl bg-slate-900 text-white font-bold"
          >
            Cerrar
          </button>
        </div>

        <!-- 3-4. Revisión -->
        <template v-else>
          <div class="bg-white rounded-2xl border border-slate-200 p-3.5 space-y-2">
            <label class="text-xs font-extrabold uppercase text-slate-500">Tienda del ticket</label>
            <select
              :value="establecimientoId"
              @change="cambiarTienda($event.target.value)"
              class="w-full h-12 px-3 rounded-xl border border-slate-300 bg-white font-semibold"
            >
              <option value="" disabled>Elige la tienda…</option>
              <option v-for="est in establecimientos" :key="est.id" :value="est.id">
                {{ est.nombre }}
              </option>
            </select>
            <p class="text-xs text-slate-500">
              Detectado: {{ detectado || '—' }}<span v-if="fechaBonita"> · {{ fechaBonita }}</span>
            </p>
          </div>

          <p
            v-if="!establecimientoId"
            class="text-sm font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-3"
          >
            Elige la tienda para cruzar los productos con tu catálogo.
          </p>

          <template v-else>
            <!-- 🟢 Existentes -->
            <section v-if="filasExistentes.length" class="space-y-2.5">
              <h3 class="text-sm font-extrabold text-emerald-700">
                🟢 Ya en tu catálogo ({{ filasExistentes.length }})
              </h3>
              <ul class="space-y-2.5">
                <li
                  v-for="f in filasExistentes"
                  :key="f.key"
                  class="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-3 space-y-2"
                >
                  <div class="flex items-start gap-2">
                    <div class="min-w-0 flex-1">
                      <p class="font-bold text-slate-900 leading-tight">
                        {{ productosTienda.find((p) => p.id === f.productoId)?.nombre }}
                      </p>
                      <p class="text-[11px] text-slate-500 truncate">Ticket: {{ f.nombre_ticket }}</p>
                    </div>
                    <button
                      @click="f.descartado = true"
                      aria-label="Descartar línea"
                      class="w-10 h-10 shrink-0 rounded-full flex items-center justify-center text-slate-400 active:bg-white"
                    >
                      <X :size="18" />
                    </button>
                  </div>

                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-1">
                      <button @click="f.cantidad = Math.max(1, f.cantidad - 1)" aria-label="Restar" class="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center active:bg-slate-100"><Minus :size="18" /></button>
                      <span class="w-8 text-center font-black tabular-nums">{{ f.cantidad }}</span>
                      <button @click="f.cantidad++" aria-label="Sumar" class="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center active:bg-slate-100"><Plus :size="18" /></button>
                    </div>
                    <span class="text-sm font-bold tabular-nums">{{ formatEuro(f.precio) }}</span>
                  </div>

                  <label
                    v-if="hayCambioPrecio(f)"
                    class="flex items-center gap-2.5 text-sm font-semibold text-slate-800 min-h-10"
                  >
                    <input type="checkbox" v-model="f.actualizarPrecio" class="w-5 h-5 accent-emerald-600" />
                    Actualizar precio: {{ formatEuro(precioActual(f)) }} → {{ formatEuro(f.precio) }}
                  </label>

                  <select
                    :value="f.productoId"
                    @change="vincular(f, $event.target.value)"
                    class="w-full h-10 px-2 rounded-xl border border-slate-300 bg-white text-xs font-medium"
                  >
                    <option value="">➕ No es este: crear producto nuevo</option>
                    <option v-for="p in productosTienda" :key="p.id" :value="p.id">{{ p.nombre }}</option>
                  </select>
                </li>
              </ul>
            </section>

            <!-- 🟡 Nuevos -->
            <section v-if="filasNuevas.length" class="space-y-2.5">
              <h3 class="text-sm font-extrabold text-amber-700">
                🟡 Productos nuevos ({{ filasNuevas.length }})
              </h3>
              <ul class="space-y-2.5">
                <li
                  v-for="f in filasNuevas"
                  :key="f.key"
                  class="rounded-2xl border border-amber-300 bg-amber-50 p-3 space-y-2"
                >
                  <div class="flex items-start gap-2">
                    <input
                      v-model="f.nuevo.nombre"
                      type="text"
                      aria-label="Nombre del producto"
                      class="flex-1 min-w-0 h-11 px-3 rounded-xl border border-slate-300 bg-white font-bold text-base"
                    />
                    <button
                      @click="f.descartado = true"
                      aria-label="Descartar línea"
                      class="w-10 h-10 shrink-0 rounded-full flex items-center justify-center text-slate-400 active:bg-white"
                    >
                      <X :size="18" />
                    </button>
                  </div>
                  <p class="text-[11px] text-slate-500 truncate">Ticket: {{ f.nombre_ticket }}</p>

                  <div class="grid grid-cols-2 gap-2">
                    <select
                      v-model="f.nuevo.ubicacion_id"
                      class="h-11 px-2 rounded-xl border border-slate-300 bg-white text-sm font-medium"
                    >
                      <option :value="null">Sin pasillo</option>
                      <option v-for="u in ubicacionesTienda" :key="u.id" :value="u.id">{{ u.nombre }}</option>
                    </select>
                    <select
                      :value="''"
                      @change="vincular(f, $event.target.value)"
                      class="h-11 px-2 rounded-xl border border-slate-300 bg-white text-sm font-medium"
                    >
                      <option value="">Vincular a existente…</option>
                      <option v-for="p in productosTienda" :key="p.id" :value="p.id">{{ p.nombre }}</option>
                    </select>
                  </div>

                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-1">
                      <button @click="f.cantidad = Math.max(1, f.cantidad - 1)" aria-label="Restar" class="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center active:bg-slate-100"><Minus :size="18" /></button>
                      <span class="w-8 text-center font-black tabular-nums">{{ f.cantidad }}</span>
                      <button @click="f.cantidad++" aria-label="Sumar" class="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center active:bg-slate-100"><Plus :size="18" /></button>
                    </div>
                    <span class="text-sm font-bold tabular-nums">{{ formatEuro(f.precio) }}</span>
                  </div>
                </li>
              </ul>
            </section>

            <!-- ⚪ Descartadas -->
            <section v-if="filasDescartadas.length" class="space-y-2">
              <h3 class="text-sm font-extrabold text-slate-500">
                ⚪ Descartadas ({{ filasDescartadas.length }})
              </h3>
              <ul class="space-y-1.5">
                <li
                  v-for="f in filasDescartadas"
                  :key="f.key"
                  class="flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2"
                >
                  <span class="flex-1 min-w-0 truncate text-sm text-slate-500 line-through">
                    {{ f.nombre_ticket }}
                  </span>
                  <button
                    @click="f.descartado = false"
                    class="h-9 px-3 rounded-lg text-xs font-bold text-slate-700 bg-white border border-slate-200 active:bg-slate-50"
                  >
                    Recuperar
                  </button>
                </li>
              </ul>
            </section>
          </template>
        </template>
      </div>
    </div>

    <!-- Pie con confirmación -->
    <footer
      v-if="estado === 'revision' || estado === 'guardando'"
      class="bg-white border-t border-slate-200 p-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]"
    >
      <div class="max-w-lg mx-auto space-y-2">
        <p v-if="error" class="text-sm font-semibold text-red-600">{{ error }}</p>
        <button
          @click="confirmar"
          :disabled="!puedeConfirmar || estado === 'guardando'"
          class="w-full h-14 rounded-2xl bg-emerald-600 text-white font-extrabold active:scale-[0.99] transition disabled:opacity-40"
        >
          {{ estado === 'guardando' ? 'Guardando…' : `Confirmar y guardar (${activas.length})` }}
        </button>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { X, Camera, ImagePlus, Minus, Plus } from 'lucide-vue-next';
import { useEscanerTicket } from '../composables/useEscanerTicket';
import { formatEuro } from '../utils/formato';

const emit = defineEmits(['cerrar']);

const {
  estado, error, fecha, detectado, establecimientoId, filas, resultado,
  establecimientos, ubicacionesTienda, productosTienda,
  activas, filasExistentes, filasNuevas, filasDescartadas, puedeConfirmar,
  hayCambioPrecio, precioActual,
  procesarArchivo, cambiarTienda, vincular, confirmar, reiniciar,
} = useEscanerTicket();

const inputCamara = ref(null);
const inputGaleria = ref(null);

const alElegir = (e) => {
  const archivo = e.target.files?.[0];
  e.target.value = ''; // permite volver a elegir la misma foto
  procesarArchivo(archivo);
};

const fechaBonita = computed(() => {
  const d = new Date(fecha.value);
  return fecha.value && !isNaN(d) ? d.toLocaleDateString('es-ES') : '';
});

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