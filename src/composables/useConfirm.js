import { ref } from 'vue';

// Diálogo activo (null si no hay ninguno)
export const dialogo = ref(null);

// Uso:  const ok = await confirmar({ titulo: '...', mensaje: '...', textoConfirmar: 'Sí' });
export const confirmar = ({
  titulo,
  mensaje = '',
  textoConfirmar = 'Aceptar',
  textoCancelar = 'Cancelar',
}) =>
  new Promise((resolver) => {
    // Si ya hay uno abierto, se cancela el anterior
    dialogo.value?.resolver(false);
    dialogo.value = { titulo, mensaje, textoConfirmar, textoCancelar, resolver };
  });

export const responder = (valor) => {
  const actual = dialogo.value;
  dialogo.value = null;
  actual?.resolver(valor);
};
