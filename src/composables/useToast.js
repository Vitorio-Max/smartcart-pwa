import { ref } from 'vue';

// Estado compartido: se puede usar desde componentes y desde composables
export const toasts = ref([]);
let contador = 0;

export const quitarToast = (id) => {
  toasts.value = toasts.value.filter((t) => t.id !== id);
};

const mostrar = (mensaje, tipo = 'info', duracion = 3500) => {
  // Evitar apilar el mismo aviso varias veces seguidas (p. ej. varios toques sin conexión)
  if (toasts.value.some((t) => t.mensaje === mensaje && t.tipo === tipo)) return;

  const id = ++contador;
  toasts.value.push({ id, mensaje, tipo });
  if (toasts.value.length > 3) toasts.value.shift();
  if (duracion > 0) setTimeout(() => quitarToast(id), duracion);
};

export const toast = {
  exito: (mensaje) => mostrar(mensaje, 'exito', 3000),
  error: (mensaje) => mostrar(mensaje, 'error', 5000),
  info: (mensaje) => mostrar(mensaje, 'info', 3500),
};
