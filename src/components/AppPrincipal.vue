<template>
  <div class="min-h-dvh flex flex-col bg-slate-50">
    <HeaderBar
      :tab-activa="tabActiva"
      v-model:modo-lista="modoLista"
      :presupuesto="presupuestoPendiente"
    />

    <main
      class="flex-1 w-full max-w-lg mx-auto px-4 pt-4 pb-[calc(env(safe-area-inset-bottom)+6rem)]"
    >
      <div v-if="errorCarga" class="text-center py-16 space-y-3">
        <p class="font-bold text-slate-700">No se pudieron cargar los datos</p>
        <button
          @click="cargarTodo"
          class="h-11 px-5 rounded-xl bg-slate-900 text-white font-bold"
        >
          Reintentar
        </button>
      </div>

      <div v-else-if="cargando" class="text-center py-16 text-slate-400 font-bold">
        Cargando tu despensa y rutas...
      </div>

      <template v-else>
        <template v-if="tabActiva === 'lista'">
          <ModoCasa v-if="modoLista === 'casa'" />
          <ModoTienda v-else @abrir-escaner="abrirEscaner" />
        </template>

        <BasicosView v-else-if="tabActiva === 'basicos'" />

        <template v-else>
          <DespensaView @abrir-escaner="abrirEscaner" />

          <!-- Cuenta -->
          <div class="mt-10 pt-5 border-t border-slate-200 text-center space-y-2">
            <p class="text-xs text-slate-400 truncate">{{ sesion?.user?.email }}</p>
            <button
              @click="cerrarSesion"
              class="h-11 px-5 rounded-xl bg-white border border-slate-200 text-slate-600 text-sm font-bold inline-flex items-center gap-2 active:bg-slate-100"
            >
              <LogOut :size="18" /> Cerrar sesión
            </button>
          </div>
        </template>
      </template>
    </main>

    <BottomNav v-model:tab-activa="tabActiva" :badges="badges" />

    <ModalEscanerTicket v-if="escanerAbierto" @cerrar="escanerAbierto = false" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { LogOut } from 'lucide-vue-next';
import { useAuth } from '../composables/useAuth';
import { useProductos } from '../composables/useProductos';
import { useLista } from '../composables/useLista';
import { useDespensa } from '../composables/useDespensa';

import HeaderBar from './HeaderBar.vue';
import BottomNav from './BottomNav.vue';
import ModoCasa from './ModoCasa.vue';
import ModoTienda from './ModoTienda.vue';
import BasicosView from './BasicosView.vue';
import DespensaView from './DespensaView.vue';
import ModalEscanerTicket from './ModalEscanerTicket.vue';

const { sesion, cerrarSesion } = useAuth();
const { cargando, cargarDatosBase } = useProductos();
const { itemsLista, presupuestoPendiente, cargarLista } = useLista();
const { productosAlerta } = useDespensa();

const tabActiva = ref('lista');
const modoLista = ref('casa');
const errorCarga = ref(false);
const escanerAbierto = ref(false);

// Badges de la barra inferior: pendientes en la lista y productos por reponer
const badges = computed(() => ({
  lista: itemsLista.value.filter((i) => !i.comprado).length,
  despensa: productosAlerta.value.length,
}));

const abrirEscaner = () => {
  escanerAbierto.value = true;
};

const cargarTodo = async () => {
  errorCarga.value = false;
  try {
    await Promise.all([cargarDatosBase(), cargarLista()]);
  } catch (e) {
    console.error(e);
    errorCarga.value = true;
  }
};

onMounted(cargarTodo);
</script>