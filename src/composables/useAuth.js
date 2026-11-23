import { ref } from 'vue';
import { supabase } from '../services/supabase';

// Estado compartido por toda la app
const sesion = ref(null);
const iniciando = ref(true);
let arrancado = false;

// Sin conexión, supabase-js no puede renovar un token caducado y responde "sin sesión".
// Para poder abrir la app en el súper sin cobertura, se recupera la sesión guardada en el móvil.
const leerSesionGuardada = () => {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const clave = localStorage.key(i);
      if (/^sb-.+-auth-token$/.test(clave)) {
        const guardada = JSON.parse(localStorage.getItem(clave));
        return guardada?.user ? guardada : null;
      }
    }
  } catch {
    /* sin sesión guardada */
  }
  return null;
};

export function useAuth() {
  // Recupera la sesión guardada y se mantiene atento a cambios (login, logout, renovación)
  const iniciar = async () => {
    if (arrancado) return;
    arrancado = true;
    try {
      const { data, error } = await supabase.auth.getSession();
      if (data.session) {
        sesion.value = data.session;
      } else if (!navigator.onLine || error?.name === 'AuthRetryableFetchError') {
        sesion.value = leerSesionGuardada();
      }
    } catch (e) {
      console.error('No se pudo recuperar la sesión:', e);
      if (!navigator.onLine) sesion.value = leerSesionGuardada();
    } finally {
      iniciando.value = false;
    }
    supabase.auth.onAuthStateChange((evento, nuevaSesion) => {
      // La sesión inicial ya se ha gestionado arriba (incluido el caso sin conexión)
      if (evento === 'INITIAL_SESSION') return;
      sesion.value = nuevaSesion;
    });
  };

  const iniciarSesion = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) throw error;
  };

  const cerrarSesion = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.error('Error al cerrar sesión:', e);
    } finally {
      sesion.value = null;
      // Borrar los datos guardados para uso sin conexión
      try {
        if ('caches' in window) await caches.delete('supabase-rest');
      } catch {
        /* nada que borrar */
      }
    }
  };

  return { sesion, iniciando, iniciar, iniciarSesion, cerrarSesion };
}