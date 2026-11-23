import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const api = {
  // Establecimientos y Ubicaciones
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

  // Productos / Catálogo
  async getProductos() {
    const { data, error } = await supabase
      .from('productos')
      .select(`
        *,
        establecimiento:establecimientos(id, nombre, color_hex),
        ubicacion:ubicaciones(id, nombre, orden_recorrido)
      `)
      .order('nombre');
    if (error) throw error;
    return data;
  },

  async crearProducto(payload) {
    const { data, error } = await supabase
      .from('productos')
      .insert(payload)
      .select(`
        *,
        establecimiento:establecimientos(id, nombre, color_hex),
        ubicacion:ubicaciones(id, nombre, orden_recorrido)
      `)
      .single();
    if (error) throw error;
    return data;
  },

  async actualizarProducto(id, campos) {
    const { data, error } = await supabase
      .from('productos')
      .update({ ...campos, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select(`
        *,
        establecimiento:establecimientos(id, nombre, color_hex),
        ubicacion:ubicaciones(id, nombre, orden_recorrido)
      `)
      .single();
    if (error) throw error;
    return data;
  },

  // Lista de Compra
    async getListaCompra() {
    const { data, error } = await supabase
      .from('lista_compra')
      .select(`
        *,
        producto:productos(
          *,
          establecimiento:establecimientos(id, nombre, color_hex),
          ubicacion:ubicaciones(id, nombre, orden_recorrido)
        )
      `)
      .order('created_at');
    if (error) throw error;
    return data;
  },

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

  // Edge Function IA
  async invocarProcesarTicket(imageBase64, mimeType) {
    const { data, error } = await supabase.functions.invoke('procesar-ticket', {
      body: { imageBase64, mimeType },
    });
    if (error) throw error;
    return data;
  },

  async finalizarCompra(itemIds) {
    const { error } = await supabase.rpc('finalizar_compra', { p_item_ids: itemIds });
    if (error) throw error;
  },

};