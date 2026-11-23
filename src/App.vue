<template>
  <div
    v-if="iniciando"
    class="min-h-dvh grid place-items-center bg-slate-50 text-slate-400 font-bold"
  >
    Cargando…
  </div>

  <LoginView v-else-if="!sesion" />

  <AppPrincipal v-else />

  <AvisoActualizacion />
</template>

<script setup>
import { onMounted } from 'vue';
import { useAuth } from './composables/useAuth';
import LoginView from './components/LoginView.vue';
import AppPrincipal from './components/AppPrincipal.vue';
import AvisoActualizacion from './components/AvisoActualizacion.vue';

const { sesion, iniciando, iniciar } = useAuth();

onMounted(iniciar);
</script>