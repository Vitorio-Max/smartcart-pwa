import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

const SELECT_PRODUCTO = `
  *,
  establecimiento:establecimientos(id, nombre, color_hex),
  ubicacion:ubicaciones(id, nombre, orden_recorrido)
`;

export const api = {
  // ---------- Establecimientos y Ubicaciones ----------
  async getEstablecimientos() {
    const { data, error } = await supabase
      .from('establecimientos')
      .select('*, ubicaciones(id, nombre, orden_recorrido)')
      .order('nombre');
    if (error) throw error;
    // Ordenar ubicaciones internamente
    return data.map((est) => ({
      ...est,
      ubicaciones: (est.ubicaciones || []).sort((a, b) => a.orden_recorrido - b.orden_recorrido),
    }));
  },

  async crearUbicacion({ establecimiento_id, nombre, despues_de_orden }) {
    const nuevoOrden = (despues_de_orden ?? 0) + 1;
    const { error: errDesplazar } = await supabase.rpc('desplazar_orden_ubicaciones', {
      p_establecimiento_id: establecimiento_id,
      p_a_partir_de: nuevoOrden,
    });
    if (errDesplazar) throw errDesplazar;

    const { data, error } = await supabase
      .from('ubicaciones')
      .insert({ establecimiento_id, nombre, orden_recorrido: nuevoOrden })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // ---------- Productos / Catálogo ----------
  async getProductos() {
    const { data, error } = await supabase
      .from('productos')
      .select(SELECT_PRODUCTO)
      .order('nombre');
    if (error) throw error;
    return data;
  },

  async crearProducto(payload) {
    const { data, error } = await supabase
      .from('productos')
      .insert(payload)
      .select(SELECT_PRODUCTO)
      .single();
    if (error) throw error;
    return data;
  },

  async actualizarProducto(id, campos) {
    const { data, error } = await supabase
      .from('productos')
      .update({ ...campos, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select(SELECT_PRODUCTO)
      .single();
    if (error) throw error;
    return data;
  },

  // Suma o resta stock de forma atómica (RPC ajustar_stock)
  async ajustarStock(producto_id, delta) {
    const { error } = await supabase.rpc('ajustar_stock', {
      p_producto_id: producto_id,
      p_delta: delta,
    });
    if (error) throw error;
  },

  // ---------- Lista de Compra ----------
  async getListaCompra() {
    const { data, error } = await supabase
      .from('lista_compra')
      .select(`
        *,
        producto:productos(
          ${SELECT_PRODUCTO}
        )
      `)
      .order('created_at');
    if (error) throw error;
    return data;
  },

  // Añade o quita unidades de forma atómica (RPC ajustar_lista)
  async ajustarLista(producto_id, delta = 1) {
    const { error } = await supabase.rpc('ajustar_lista', {
      p_producto_id: producto_id,
      p_delta: delta,
    });
    if (error) throw error;
  },

  async toggleComprado(id, comprado) {
    const { error } = await supabase
      .from('lista_compra')
      .update({ comprado })
      .eq('id', id);
    if (error) throw error;
  },

  async eliminarItemsLista(ids) {
    if (!ids.length) return;
    const { error } = await supabase.from('lista_compra').delete().in('id', ids);
    if (error) throw error;
  },

  // Suma lo comprado al stock y limpia la lista, en una transacción (RPC finalizar_compra)
  async finalizarCompra(itemIds) {
    const { error } = await supabase.rpc('finalizar_compra', { p_item_ids: itemIds });
    if (error) throw error;
  },

  // ---------- Gestión de supermercados y pasillos ----------
  async crearEstablecimiento({ nombre, color_hex }) {
    const { data, error } = await supabase
      .from('establecimientos')
      .insert({ nombre, color_hex })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async actualizarEstablecimiento(id, campos) {
    const { error } = await supabase.from('establecimientos').update(campos).eq('id', id);
    if (error) throw error;
  },

  async eliminarEstablecimiento(id) {
    const { error } = await supabase.from('establecimientos').delete().eq('id', id);
    if (error) throw error;
  },

  async actualizarUbicacion(id, campos) {
    const { error } = await supabase.from('ubicaciones').update(campos).eq('id', id);
    if (error) throw error;
  },

  async eliminarUbicacion(id) {
    const { error } = await supabase.from('ubicaciones').delete().eq('id', id);
    if (error) throw error;
  },

  // Fija el orden del recorrido según la posición en la lista (RPC reordenar_ubicaciones)
  async reordenarUbicaciones(establecimiento_id, ids) {
    const { error } = await supabase.rpc('reordenar_ubicaciones', {
      p_establecimiento_id: establecimiento_id,
      p_ids: ids,
    });
    if (error) throw error;
  },

  // ---------- Gestión de productos ----------
  async eliminarProducto(id) {
    const { error } = await supabase.from('productos').delete().eq('id', id);
    if (error) throw error;
  },

  // ---------- Escáner de tickets con IA ----------
  async invocarProcesarTicket(imageBase64, mimeType) {
    const { data, error } = await supabase.functions.invoke('procesar-ticket', {
      body: { imageBase64, mimeType },
    });
    if (error) {
      // Intentar leer el motivo real que devuelve la Edge Function
      let detalle = error.message;
      try {
        const cuerpo = await error.context.json();
        if (cuerpo?.error) detalle = cuerpo.error;
      } catch {
        try {
          const texto = await error.context.text();
          if (texto) detalle = `${error.context.status}: ${texto.slice(0, 200)}`;
        } catch { /* sin detalle */ }
      }
      throw new Error(detalle);
    }
    return data;
  },

  // Confirma el ticket en lote, en una transacción (RPC confirmar_ticket)
  async confirmarTicket({ nuevos, existentes }) {
    const { error } = await supabase.rpc('confirmar_ticket', {
      p_nuevos: nuevos,
      p_existentes: existentes,
    });
    if (error) throw error;
  },
};
