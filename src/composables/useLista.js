import { ref, computed } from 'vue';
import { api } from '../services/supabase';
import { useProductos } from './useProductos';

const itemsLista = ref([]);

export function useLista() {
  const { productos, establecimientos, cargarDatosBase } = useProductos();

  const cargarLista = async () => {
    itemsLista.value = await api.getListaCompra();
  };

  // Fuente de verdad: productos y ubicaciones actuales
  const productosPorId = computed(
    () => new Map(productos.value.map((p) => [p.id, p]))
  );

  const ubicacionesPorId = computed(() => {
    const mapa = new Map();
    for (const est of establecimientos.value) {
      for (const u of est.ubicaciones || []) mapa.set(u.id, u);
    }
    return mapa;
  });

  // Items con producto y pasillo siempre actualizados
  const items = computed(() =>
    itemsLista.value.map((item) => {
      const base = productosPorId.value.get(item.producto_id) ?? item.producto;
      if (!base) return item;
      const ubicacion = base.ubicacion_id
        ? ubicacionesPorId.value.get(base.ubicacion_id) ?? null
        : null;
      return { ...item, producto: { ...base, ubicacion } };
    })
  );

  const cantidadesPorProducto = computed(() => {
    const map = {};
    for (const item of itemsLista.value) map[item.producto_id] = item.cantidad;
    return map;
  });

  const presupuestoPendiente = computed(() =>
    items.value
      .filter((i) => !i.comprado)
      .reduce((acc, i) => acc + Number(i.producto?.precio || 0) * i.cantidad, 0)
  );

  const anadirOIncrementar = async (productoId, delta = 1) => {
    await api.upsertItemLista(productoId, delta);
    await cargarLista();
  };

  const alternarComprado = async (item) => {
    // `item` puede ser una copia enriquecida: se modifica el original por id
    const original = itemsLista.value.find((i) => i.id === item.id);
    if (!original) return;
    const nuevo = !original.comprado;
    original.comprado = nuevo; // optimista
    try {
      await api.toggleComprado(original.id, nuevo);
    } catch (e) {
      original.comprado = !nuevo; // revertir
      console.error('No se pudo marcar el producto:', e);
    }
  };

  const obtenerListaTiendaPorEstablecimiento = (establecimientoId) => {
    const filtrados = items.value.filter(
      (i) => i.producto?.establecimiento_id === establecimientoId
    );
    const porNombre = (a, b) => a.producto.nombre.localeCompare(b.producto.nombre);

    const pendientes = filtrados.filter((i) => !i.comprado);
    const enCarro = filtrados.filter((i) => i.comprado).sort(porNombre);

    const gruposMap = new Map();
    for (const item of pendientes) {
      const ubi = item.producto.ubicacion;
      const key = ubi ? ubi.id : 'sin-ubicacion';
      if (!gruposMap.has(key)) {
        gruposMap.set(key, {
          ubicacionId: key,
          nombre: ubi ? ubi.nombre : 'Sin pasillo asignado',
          orden: ubi ? ubi.orden_recorrido : 9999,
          items: [],
        });
      }
      gruposMap.get(key).items.push(item);
    }

    const seccionesOrdenadas = Array.from(gruposMap.values())
      .sort((a, b) => a.orden - b.orden)
      .map((s) => ({ ...s, items: s.items.sort(porNombre) }));

    return { seccionesOrdenadas, enCarro };
  };

  const finalizarCompraManual = async (establecimientoId) => {
    const ids = items.value
      .filter((i) => i.comprado && i.producto?.establecimiento_id === establecimientoId)
      .map((i) => i.id);
    if (!ids.length) return;

    await api.finalizarCompra(ids);
    await Promise.all([cargarLista(), cargarDatosBase({ silencioso: true })]);
  };

  return {
    itemsLista,
    items,
    cantidadesPorProducto,
    presupuestoPendiente,
    cargarLista,
    anadirOIncrementar,
    alternarComprado,
    obtenerListaTiendaPorEstablecimiento,
    finalizarCompraManual,
  };
}