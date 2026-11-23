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
          <ModoTienda v-else @abrir-escaner="avisoEscaner" />
        </template>

        <BasicosView v-else-if="tabActiva === 'basicos'" />

                <DespensaView v-else @abrir-escaner="avisoEscaner" />
      </template>
    </main>

    <BottomNav v-model:tab-activa="tabActiva" :badges="badges" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useProductos } from './composables/useProductos';
import { useLista } from './composables/useLista';

import HeaderBar from './components/HeaderBar.vue';
import BottomNav from './components/BottomNav.vue';
import ModoCasa from './components/ModoCasa.vue';
import ModoTienda from './components/ModoTienda.vue';
import BasicosView from './components/BasicosView.vue';
import DespensaView from './components/DespensaView.vue';
import { useDespensa } from './composables/useDespensa';

const { cargando, cargarDatosBase } = useProductos();
const { itemsLista, presupuestoPendiente, cargarLista } = useLista();

const { productosAlerta } = useDespensa();

// Nº de productos pendientes en la lista (badge de la pestaña Lista)

const badges = computed(() => ({
  lista: itemsLista.value.filter((i) => !i.comprado).length,
  despensa: productosAlerta.value.length,
}));

const tabActiva = ref('lista');
const modoLista = ref('casa');
const errorCarga = ref(false);


const avisoEscaner = () => {
  alert('El escáner de tickets con IA lo activaremos en el Bloque 3.');
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