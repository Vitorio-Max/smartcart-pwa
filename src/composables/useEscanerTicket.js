import { ref, computed } from 'vue';
import { api } from '../services/supabase';
import { useProductos } from './useProductos';
import { useLista } from './useLista';

// ---------- Utilidades ----------
const normalizar = (s = '') =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();

const tokens = (s) => new Set(normalizar(s).split(' ').filter(Boolean));

// Similitud de Jaccard entre las palabras de dos nombres (0 a 1)
const similitud = (a, b) => {
  const A = tokens(a);
  const B = tokens(b);
  if (!A.size || !B.size) return 0;
  let comunes = 0;
  for (const t of A) if (B.has(t)) comunes++;
  return comunes / (A.size + B.size - comunes);
};

const UMBRAL = 0.6;

const blobABase64 = (blob) =>
  new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(',')[1]);
    r.onerror = () => reject(new Error('No se pudo leer la imagen.'));
    r.readAsDataURL(blob);
  });

// Reduce y recomprime la foto para no enviar 10 MB desde el móvil
async function comprimirImagen(file, maxLado = 2000, calidad = 0.82) {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const escala = Math.min(1, maxLado / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * escala);
  canvas.height = Math.round(bitmap.height * escala);
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();
  const blob = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', calidad));
  if (!blob) throw new Error('No se pudo procesar la imagen.');
  return { base64: await blobABase64(blob), mimeType: 'image/jpeg' };
}

// Si la función no responde a tiempo, cortar la espera con un error claro
const conTimeout = (promesa, ms, mensaje) =>
  Promise.race([
    promesa,
    new Promise((_, reject) => setTimeout(() => reject(new Error(mensaje)), ms)),
  ]);

// ---------- Composable ----------
export function useEscanerTicket() {
  const { productos, establecimientos, cargarDatosBase } = useProductos();
  const { cargarLista } = useLista();

  // inicial | procesando | revision | guardando | hecho | error
  const estado = ref('inicial');
  const error = ref('');
  const fecha = ref('');
  const detectado = ref('');
  const establecimientoId = ref('');
  const itemsOriginales = ref([]);
  const filas = ref([]);
  const resultado = ref({ creados: 0, actualizados: 0, precios: 0 });

  const establecimiento = computed(
    () => establecimientos.value.find((e) => e.id === establecimientoId.value) || null
  );
  const ubicacionesTienda = computed(() => establecimiento.value?.ubicaciones || []);
  const productosTienda = computed(() =>
    productos.value.filter((p) => p.establecimiento_id === establecimientoId.value)
  );

  const productoDe = (id) => productos.value.find((p) => p.id === id);

  const hayCambioPrecio = (f) => {
    const p = productoDe(f.productoId);
    return !!p && f.precio > 0 && Math.abs(Number(p.precio) - f.precio) >= 0.005;
  };
  const precioActual = (f) => Number(productoDe(f.productoId)?.precio || 0);

  const detectarTienda = (nombre) => {
    const d = normalizar(nombre);
    if (!d) return '';
    const est = establecimientos.value.find((e) => {
      const n = normalizar(e.nombre);
      return n && (d.includes(n) || n.includes(d));
    });
    return est?.id || '';
  };

  const buscarCoincidencia = (item) => {
    let mejor = null;
    let mejorScore = 0;
    for (const p of productosTienda.value) {
      const score = Math.max(
        similitud(item.nombre_normalizado, p.nombre),
        similitud(item.nombre_ticket, p.nombre)
      );
      if (score > mejorScore) {
        mejor = p;
        mejorScore = score;
      }
    }
    return mejorScore >= UMBRAL ? mejor : null;
  };

  const construirFilas = () => {
    filas.value = itemsOriginales.value.map((it, i) => {
      const coincidencia = buscarCoincidencia(it);
      const fila = {
        key: `${i}-${it.nombre_ticket}`,
        nombre_ticket: it.nombre_ticket,
        cantidad: Math.max(1, Number(it.cantidad) || 1),
        precio: Number(it.precio_unitario) || 0,
        descartado: !!it.es_descartable,
        productoId: coincidencia?.id ?? null,
        actualizarPrecio: false,
        nuevo: { nombre: it.nombre_normalizado || it.nombre_ticket, ubicacion_id: null },
      };
      fila.actualizarPrecio = hayCambioPrecio(fila);
      return fila;
    });
  };

  const cambiarTienda = (id) => {
    establecimientoId.value = id;
    construirFilas(); // se vuelve a cruzar con el catálogo de esa tienda
  };

  const vincular = (fila, valor) => {
    fila.productoId = valor || null;
    fila.actualizarPrecio = hayCambioPrecio(fila);
  };

  const procesarArchivo = async (file) => {
    if (!file) return;
    error.value = '';
    estado.value = 'procesando';
    try {
      const { base64, mimeType } = await comprimirImagen(file);
      const ticket = await conTimeout(
        api.invocarProcesarTicket(base64, mimeType),
        70_000,
        'La lectura está tardando demasiado. Inténtalo de nuevo en unos minutos.'
      );
      itemsOriginales.value = ticket.items || [];
      if (!itemsOriginales.value.length) {
        throw new Error(
          'No se han encontrado productos. Prueba con una foto más nítida, con buena luz y el ticket completo.'
        );
      }
      fecha.value = ticket.fecha || '';
      detectado.value = ticket.establecimiento_detectado || '';
      establecimientoId.value =
        detectarTienda(detectado.value) ||
        (establecimientos.value.length === 1 ? establecimientos.value[0].id : '');
      construirFilas();
      estado.value = 'revision';
    } catch (e) {
      console.error(e);
      error.value = e.message || 'No se pudo leer el ticket.';
      estado.value = 'error';
    }
  };

  const activas = computed(() => filas.value.filter((f) => !f.descartado));
  const filasExistentes = computed(() => activas.value.filter((f) => f.productoId));
  const filasNuevas = computed(() => activas.value.filter((f) => !f.productoId));
  const filasDescartadas = computed(() => filas.value.filter((f) => f.descartado));

  const puedeConfirmar = computed(
    () =>
      !!establecimientoId.value &&
      activas.value.length > 0 &&
      filasNuevas.value.every((f) => f.nuevo.nombre.trim())
  );

  const confirmar = async () => {
    if (!puedeConfirmar.value || estado.value === 'guardando') return;
    estado.value = 'guardando';
    error.value = '';

    const nuevos = filasNuevas.value.map((f) => ({
      nombre: f.nuevo.nombre.trim(),
      precio: f.precio,
      cantidad: f.cantidad,
      establecimiento_id: establecimientoId.value,
      ubicacion_id: f.nuevo.ubicacion_id,
    }));
    const existentes = filasExistentes.value.map((f) => ({
      producto_id: f.productoId,
      cantidad: f.cantidad,
      nuevo_precio: f.actualizarPrecio && hayCambioPrecio(f) ? f.precio : null,
    }));

    try {
      await api.confirmarTicket({ nuevos, existentes });
      resultado.value = {
        creados: nuevos.length,
        actualizados: existentes.length,
        precios: existentes.filter((e) => e.nuevo_precio !== null).length,
      };
      await Promise.all([cargarDatosBase({ silencioso: true }), cargarLista()]);
      estado.value = 'hecho';
    } catch (e) {
      console.error(e);
      error.value = 'No se pudo guardar (no se ha modificado nada). Inténtalo de nuevo.';
      estado.value = 'revision';
    }
  };

  const reiniciar = () => {
    estado.value = 'inicial';
    error.value = '';
    filas.value = [];
    itemsOriginales.value = [];
  };

  return {
    estado, error, fecha, detectado, establecimientoId, filas, resultado,
    establecimientos, ubicacionesTienda, productosTienda,
    activas, filasExistentes, filasNuevas, filasDescartadas, puedeConfirmar,
    hayCambioPrecio, precioActual,
    procesarArchivo, cambiarTienda, vincular, confirmar, reiniciar,
  };
}