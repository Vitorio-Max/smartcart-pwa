import { ref, computed } from 'vue';
import { api } from '../services/supabase';

const productos = ref([]);
const establecimientos = ref([]);
const cargando = ref(false);

const ordenarPorNombre = () =>
  productos.value.sort((a, b) => a.nombre.localeCompare(b.nombre));

export function useProductos() {
  // Con { silencioso: true } recarga sin mostrar la pantalla de carga
  const cargarDatosBase = async ({ silencioso = false } = {}) => {
    if (!silencioso) cargando.value = true;
    try {
      const [ests, prods] = await Promise.all([
        api.getEstablecimientos(),
        api.getProductos(),
      ]);
      establecimientos.value = ests;
      productos.value = prods;
    } finally {
      if (!silencioso) cargando.value = false;
    }
  };

  const recargar = () => cargarDatosBase({ silencioso: true });

  const basicos = computed(() => productos.value.filter((p) => p.es_basico));

  const productosBajoMinimo = computed(() =>
    productos.value.filter((p) => p.stock_actual <= p.stock_minimo)
  );

  const crearProductoRapido = async (nuevoProd) => {
    const creado = await api.crearProducto(nuevoProd);
    productos.value.push(creado);
    ordenarPorNombre();
    return creado;
  };

  const cambiarUbicacionProducto = async (productoId, nuevaUbicacionId, establecimientoId = null) => {
    const payload = { ubicacion_id: nuevaUbicacionId };
    if (establecimientoId) payload.establecimiento_id = establecimientoId;
    const actualizado = await api.actualizarProducto(productoId, payload);
    const idx = productos.value.findIndex((p) => p.id === productoId);
    if (idx !== -1) productos.value[idx] = actualizado;
    return actualizado;
  };

  const crearPasilloYAsignar = async ({ establecimiento_id, nombre, despues_de_orden, productoId }) => {
    const nuevaUbi = await api.crearUbicacion({ establecimiento_id, nombre, despues_de_orden });
    // Refrescar establecimientos para tener los orden_recorrido desplazados al día
    establecimientos.value = await api.getEstablecimientos();
    if (productoId) {
      await cambiarUbicacionProducto(productoId, nuevaUbi.id, establecimiento_id);
    }
    return nuevaUbi;
  };

  const alternarBasico = async (producto) => {
    const p = productos.value.find((x) => x.id === producto.id);
    if (!p) return;
    const nuevo = !p.es_basico;
    p.es_basico = nuevo; // optimista
    try {
      await api.actualizarProducto(p.id, { es_basico: nuevo });
    } catch (e) {
      p.es_basico = !nuevo; // revertir
      console.error('No se pudo cambiar el estado de básico:', e);
    }
  };

  // ---------- Gestión de supermercados ----------
  // Crea (sin id) o actualiza (con id). Devuelve el id del supermercado.
  const guardarEstablecimiento = async ({ id = null, nombre, color_hex }) => {
    let idFinal = id;
    if (id) {
      await api.actualizarEstablecimiento(id, { nombre, color_hex });
    } else {
      const creado = await api.crearEstablecimiento({ nombre, color_hex });
      idFinal = creado.id;
    }
    await recargar();
    return idFinal;
  };

  const borrarEstablecimiento = async (id) => {
    const n = productos.value.filter((p) => p.establecimiento_id === id).length;
    if (n > 0) throw new Error(`El supermercado tiene ${n} producto(s).`);
    await api.eliminarEstablecimiento(id);
    await recargar();
  };

  // ---------- Gestión de pasillos ----------
  const renombrarUbicacion = async (id, nombre) => {
    await api.actualizarUbicacion(id, { nombre });
    await recargar();
  };

  // Añade un pasillo al final del recorrido
  const anadirUbicacion = async (establecimientoId, nombre) => {
    const est = establecimientos.value.find((e) => e.id === establecimientoId);
    const maximo = Math.max(0, ...(est?.ubicaciones || []).map((u) => u.orden_recorrido));
    await api.crearUbicacion({
      establecimiento_id: establecimientoId,
      nombre,
      despues_de_orden: maximo,
    });
    await recargar();
  };

  // Los productos de ese pasillo quedan "sin pasillo" (lo hace la base de datos)
  const borrarUbicacion = async (id) => {
    await api.eliminarUbicacion(id);
    await recargar();
  };

  // idsOrdenados: ids de los pasillos en el orden deseado del recorrido
  const reordenarUbicaciones = async (establecimientoId, idsOrdenados) => {
    const est = establecimientos.value.find((e) => e.id === establecimientoId);
    if (est) {
      // Cambio inmediato en pantalla
      const porId = new Map(est.ubicaciones.map((u) => [u.id, u]));
      est.ubicaciones = idsOrdenados.map((id, i) => ({
        ...porId.get(id),
        orden_recorrido: i + 1,
      }));
    }
    try {
      await api.reordenarUbicaciones(establecimientoId, idsOrdenados);
    } finally {
      await recargar(); // sincroniza (y deshace el cambio si falló)
    }
  };

  // ---------- Gestión de productos ----------
  // Crea (sin id) o actualiza (con id)
  const guardarProducto = async ({ id = null, ...campos }) => {
    if (!id) return crearProductoRapido(campos);

    const actualizado = await api.actualizarProducto(id, campos);
    const idx = productos.value.findIndex((p) => p.id === id);
    if (idx !== -1) productos.value[idx] = actualizado;
    else productos.value.push(actualizado);
    ordenarPorNombre();
    return actualizado;
  };

  const borrarProducto = async (id) => {
    await api.eliminarProducto(id);
    productos.value = productos.value.filter((p) => p.id !== id);
  };

  return {
    productos,
    establecimientos,
    cargando,
    basicos,
    productosBajoMinimo,
    cargarDatosBase,
    crearProductoRapido,
    cambiarUbicacionProducto,
    crearPasilloYAsignar,
    alternarBasico,
    guardarEstablecimiento,
    borrarEstablecimiento,
    renombrarUbicacion,
    anadirUbicacion,
    borrarUbicacion,
    reordenarUbicaciones,
    guardarProducto,
    borrarProducto,
  };
}
