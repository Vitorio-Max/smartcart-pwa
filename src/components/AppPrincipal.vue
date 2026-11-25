<template>
  <div class="min-h-dvh flex flex-col bg-slate-50">
    <HeaderBar
      :tab-activa="tabActiva"
      v-model:modo-lista="modoLista"
      :presupuesto="presupuestoPendiente"
      @abrir-menu="menuAbierto = true"
    />

    <main
      class="flex-1 w-full max-w-lg mx-auto px-4 pt-4 pb-[calc(env(safe-area-inset-bottom)+6rem)]"
    >
      <AvisoConexion />

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
          <ModoTienda v-else />
        </template>

        <BasicosView v-else-if="tabActiva === 'basicos'" />

        <DespensaView v-else @abrir-escaner="abrirEscaner" />
      </template>
    </main>

    <BottomNav v-model:tab-activa="tabActiva" :badges="badges" />

    <ModalEscanerTicket v-if="escanerAbierto" @cerrar="escanerAbierto = false" />

    <!-- Menú y pantallas de gestión -->
    <MenuLateral :abierto="menuAbierto" @cerrar="menuAbierto = false" @abrir="abrirPanel" />
    <GestionTiendas v-if="panel === 'tiendas'" @cerrar="panel = null" />
    <GestionProductos v-if="panel === 'productos'" @cerrar="panel = null" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
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
import AvisoConexion from './AvisoConexion.vue';
import MenuLateral from './MenuLateral.vue';
import GestionTiendas from './GestionTiendas.vue';
import GestionProductos from './GestionProductos.vue';

const { cargando, cargarDatosBase } = useProductos();
const { itemsLista, presupuestoPendiente, cargarLista } = useLista();
const { productosAlerta } = useDespensa();

const tabActiva = ref('lista');
const modoLista = ref('casa');
const errorCarga = ref(false);
const escanerAbierto = ref(false);
const menuAbierto = ref(false);
const panel = ref(null); // null | 'tiendas' | 'productos'

// Badges de la barra inferior: pendientes en la lista y productos por reponer
const badges = computed(() => ({
  lista: itemsLista.value.filter((i) => !i.comprado).length,
  despensa: productosAlerta.value.length,
}));

const abrirEscaner = () => {
  escanerAbierto.value = true;
};

const abrirPanel = (nombre) => {
  menuAbierto.value = false;
  panel.value = nombre;
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