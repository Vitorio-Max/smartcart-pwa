<template>
  <div>
    <!-- Fondo oscuro -->
    <Transition
      enter-active-class="transition-opacity duration-200"
      enter-from-class="opacity-0"
      leave-active-class="transition-opacity duration-150"
      leave-to-class="opacity-0"
    >
      <div v-if="abierto" class="fixed inset-0 z-50 bg-slate-950/60" @click="$emit('cerrar')"></div>
    </Transition>

    <!-- Panel -->
    <Transition
      enter-active-class="transition-transform duration-200 ease-out"
      enter-from-class="-translate-x-full"
      leave-active-class="transition-transform duration-150 ease-in"
      leave-to-class="-translate-x-full"
    >
      <aside
        v-if="abierto"
        role="dialog"
        aria-modal="true"
        aria-label="Menú"
        class="fixed inset-y-0 left-0 z-50 w-[85%] max-w-xs bg-white shadow-2xl flex flex-col pb-[env(safe-area-inset-bottom)]"
      >
        <!-- Cuenta -->
        <div
          class="bg-slate-900 text-white px-5 pb-5 pt-[calc(env(safe-area-inset-top)+1.5rem)] flex items-center gap-3"
        >
          <div
            class="w-12 h-12 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center text-xl font-black shrink-0"
          >
            {{ inicial }}
          </div>
          <div class="min-w-0">
            <p class="text-[11px] uppercase tracking-wider text-slate-400 font-bold">
              Sesión iniciada
            </p>
            <p class="font-bold truncate">{{ email }}</p>
          </div>
        </div>

        <!-- Opciones -->
        <nav class="flex-1 overflow-y-auto p-3 space-y-1">
          <button
            v-for="op in opciones"
            :key="op.id"
            @click="$emit('abrir', op.id)"
            class="w-full h-14 px-3 rounded-xl flex items-center gap-3 text-left font-bold text-slate-800 active:bg-slate-100"
          >
            <component :is="op.icono" :size="22" class="text-slate-500" />
            <span class="flex-1">{{ op.texto }}</span>
            <ChevronRight :size="18" class="text-slate-300" />
          </button>
        </nav>

        <!-- Cerrar sesión -->
        <div class="p-3 border-t border-slate-200">
          <button
            @click="salir"
            class="w-full h-12 px-3 rounded-xl flex items-center gap-3 font-bold text-red-600 active:bg-red-50"
          >
            <LogOut :size="20" /> Cerrar sesión
          </button>
        </div>
      </aside>
    </Transition>
  </div>
</template>

<script setup>
import { computed, watch, onMounted, onUnmounted } from 'vue';
import { Store, ShoppingBasket, ChevronRight, LogOut } from 'lucide-vue-next';
import { useAuth } from '../composables/useAuth';

const props = defineProps({ abierto: Boolean });
const emit = defineEmits(['cerrar', 'abrir']);

const { sesion, cerrarSesion } = useAuth();

const email = computed(() => sesion.value?.user?.email || '');
const inicial = computed(() => (email.value[0] || '?').toUpperCase());

const opciones = [
  { id: 'tiendas', texto: 'Supermercados', icono: Store },
  { id: 'productos', texto: 'Productos', icono: ShoppingBasket },
];

const salir = async () => {
  emit('cerrar');
  await cerrarSesion();
};

// Bloquear el scroll de la página mientras el menú está abierto
watch(
  () => props.abierto,
  (abierto) => {
    document.body.style.overflow = abierto ? 'hidden' : '';
  }
);

const onKey = (e) => {
  if (e.key === 'Escape' && props.abierto) emit('cerrar');
};
onMounted(() => window.addEventListener('keydown', onKey));
onUnmounted(() => {
  window.removeEventListener('keydown', onKey);
  document.body.style.overflow = '';
});
</script>
