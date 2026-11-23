<template>
  <div
    class="min-h-dvh flex flex-col justify-center bg-slate-900 px-6 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]"
  >
    <div class="w-full max-w-sm mx-auto space-y-8">
      <div class="text-center space-y-2">
        <p class="text-5xl">🛒</p>
        <h1 class="text-2xl font-black text-white tracking-tight">SmartCart</h1>
        <p class="text-sm text-slate-400">Inicia sesión para ver tu lista y tu despensa</p>
      </div>

      <form @submit.prevent="enviar" class="space-y-3">
        <div>
          <label for="login-email" class="sr-only">Email</label>
          <input
            id="login-email"
            v-model="email"
            type="email"
            inputmode="email"
            autocomplete="email"
            autocapitalize="none"
            required
            placeholder="Email"
            class="w-full h-14 px-4 rounded-2xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 text-base focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div>
          <label for="login-password" class="sr-only">Contraseña</label>
          <input
            id="login-password"
            v-model="password"
            type="password"
            autocomplete="current-password"
            required
            placeholder="Contraseña"
            class="w-full h-14 px-4 rounded-2xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 text-base focus:outline-none focus:border-emerald-500"
          />
        </div>

        <p v-if="error" role="alert" class="text-sm font-semibold text-red-400">{{ error }}</p>

        <button
          type="submit"
          :disabled="enviando || !email || !password"
          class="w-full h-14 rounded-2xl bg-emerald-500 text-slate-950 font-extrabold text-base disabled:opacity-50 active:scale-[0.99] transition"
        >
          {{ enviando ? 'Entrando…' : 'Entrar' }}
        </button>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useAuth } from '../composables/useAuth';

const { iniciarSesion } = useAuth();

const email = ref('');
const password = ref('');
const enviando = ref(false);
const error = ref('');

const traducir = (msg = '') => {
  if (/invalid login credentials/i.test(msg)) return 'Email o contraseña incorrectos.';
  if (/email not confirmed/i.test(msg)) return 'Tu email aún no está confirmado.';
  if (/rate limit|too many/i.test(msg)) return 'Demasiados intentos. Espera un momento.';
  if (/fetch|network/i.test(msg)) return 'Sin conexión. Revisa tu internet.';
  return 'No se pudo iniciar sesión. Inténtalo de nuevo.';
};

const enviar = async () => {
  if (enviando.value) return;
  enviando.value = true;
  error.value = '';
  try {
    await iniciarSesion(email.value, password.value);
    // Al iniciar sesión, App.vue cambia solo a la pantalla principal
  } catch (e) {
    error.value = traducir(e?.message);
  } finally {
    enviando.value = false;
  }
};
</script>