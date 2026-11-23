import { ref } from 'vue';
import { supabase } from '../services/supabase';

// Estado compartido por toda la app
const sesion = ref(null);
const iniciando = ref(true);
let arrancado = false;

export function useAuth() {
  // Recupera la sesión guardada y se mantiene atento a cambios (login, logout, renovación)
  const iniciar = async () => {
    if (arrancado) return;
    arrancado = true;
    try {
      const { data } = await supabase.auth.getSession();
      sesion.value = data.session;
    } catch (e) {
      console.error('No se pudo recuperar la sesión:', e);
    } finally {
      iniciando.value = false;
    }
    supabase.auth.onAuthStateChange((_evento, nuevaSesion) => {
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
    await supabase.auth.signOut();
  };

  return { sesion, iniciando, iniciar, iniciarSesion, cerrarSesion };
}