import { computed } from 'vue';
import { api } from '../services/supabase';
import { useProductos } from './useProductos';
import { useLista } from './useLista';

export const estadoStock = (p) => {
  if (p.stock_actual <= 0) return 'agotado';
  if (p.stock_actual <= p.stock_minimo) return 'bajo';
  return 'ok';
};

// Cola de cambios: se envían en orden y se recarga al terminar la ráfaga
let cola = Promise.resolve();
let pendientes = 0;

export function useDespensa() {
  const { productos, cargarDatosBase } = useProductos();
  const { cantidadesPorProducto, anadirOIncrementar } = useLista();

  const productosDespensa = computed(() =>
    [...productos.value].sort((a, b) => a.nombre.localeCompare(b.nombre))
  );

  const productosAlerta = computed(() =>
    productosDespensa.value.filter((p) => estadoStock(p) !== 'ok')
  );

  const ajustarStock = (producto, delta) => {
    const p = productos.value.find((x) => x.id === producto.id);
    if (!p) return;

    const nuevo = Math.max(0, p.stock_actual + delta);
    const efectivo = nuevo - p.stock_actual;
    if (efectivo === 0) return;

    p.stock_actual = nuevo; // optimista

    pendientes++;
    cola = cola
      .then(() => api.ajustarStock(p.id, efectivo))
      .catch((e) => console.error('No se pudo ajustar el stock:', e))
      .finally(async () => {
        pendientes--;
        if (pendientes === 0) {
          await cargarDatosBase({ silencioso: true }).catch(console.error);
        }
      });
    return cola;
  };

  // Envía a la lista lo que falta para llegar al mínimo (al menos 1)
  const reponer = (producto) => {
    const faltan = Math.max(1, producto.stock_minimo - producto.stock_actual);
    return anadirOIncrementar(producto.id, faltan);
  };

  return {
    productosDespensa,
    productosAlerta,
    cantidadesPorProducto,
    ajustarStock,
    reponer,
  };
}