import { ref, computed } from 'vue';
import { api } from '../services/supabase';
import { useProductos } from './useProductos';

import { toast } from './useToast';

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

  // Cola: los cambios se envían en orden y se recarga al quedar libre
  let cola = Promise.resolve();
  let pendientes = 0;

  const anadirOIncrementar = (productoId, delta = 1) => {
    // 1) Cambio local inmediato (optimista)
    const existente = itemsLista.value.find((i) => i.producto_id === productoId);
    if (existente) {
      const nueva = existente.cantidad + delta;
      if (nueva <= 0) {
        itemsLista.value = itemsLista.value.filter((i) => i.producto_id !== productoId);
      } else {
        existente.cantidad = nueva;
        if (delta > 0) existente.comprado = false;
      }
    } else if (delta > 0) {
      itemsLista.value.push({
        id: `tmp-${productoId}`,
        producto_id: productoId,
        cantidad: delta,
        comprado: false,
        notas: null,
      });
    }

    // 2) Sincronizar con Supabase, en orden
    pendientes++;
    cola = cola
      .then(() => api.ajustarLista(productoId, delta))
      .catch((e) => {
        console.error('No se pudo actualizar la lista:', e);
        toast.error('No se pudo guardar el cambio. Revisa tu conexión.');
      }).finally(async () => {
        pendientes--;
        if (pendientes === 0) await cargarLista().catch(console.error);
      });
    return cola;
  };

  const alternarComprado = async (item) => {
    // Si el item acaba de añadirse, esperar a que exista en la base de datos
    if (String(item.id).startsWith('tmp-')) await cola;

    const original = itemsLista.value.find((i) => i.producto_id === item.producto_id);
    if (!original) return;

    const nuevo = !original.comprado;
    original.comprado = nuevo; // optimista
    try {
      await api.toggleComprado(original.id, nuevo);
    } catch (e) {
      original.comprado = !nuevo; // revertir
      console.error('No se pudo marcar el producto:', e);
      toast.error('No se pudo marcar el producto. Revisa tu conexión.');    }
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