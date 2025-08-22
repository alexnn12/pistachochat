const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE;

const supabase = createClient(supabaseUrl, supabaseKey);

async function getTiendaByTelefono(telefono) {
  try {
 //  console.log(telefono);
    // Add '+' prefix to phone number if it doesn't already have one
    if (telefono && !telefono.startsWith('+')) {
      telefono = '+' + telefono;
      console.log('Formatted phone number:', telefono);
    }
    const { data, error } = await supabase
      .from('tiendas')
      .select('nombre, tienda_id,uri,dominio,fecha,usuario_id,texto_inicial')
      .eq('whatsapp', telefono)
      .single();
    console.log(data);
    if (error) {
      console.error('Error fetching tienda by telefono:', error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('Error in getTiendaByTelefono:', error);
    return null;
  }
}

async function getProductosByTiendaId(tiendaId) {
  try {
    const { data, error } = await supabase
      .from('tiendas_productos')
      .select('tienda_producto_id, nombre, descripcion, precio')
      .eq('tienda_id', tiendaId);
      
    
    if (error) {
      console.error('Error fetching productos:', error);
      return [];
    }
    
    return data;
  } catch (error) {
    console.error('Error in getProductosByTiendaId:', error);
    return [];
  }
}

async function getVentasSemana(tiendaId) {
  try {
    const fechaInicio = new Date();
    fechaInicio.setDate(fechaInicio.getDate() - 7);
    
    const { data, error } = await supabase
      .from('tiendas_compras')
      .select('*')
      .eq('tienda_id', tiendaId)
      .gte('fecha_creado', fechaInicio.toISOString())
      .order('fecha_creado', { ascending: false });
    
    if (error) {
      console.error('Error fetching ventas:', error);
      return [];
    }
    
    return data;
  } catch (error) {
    console.error('Error in getVentasSemana:', error);
    return [];
  }
}

async function getTiendaInfo(telefono) {
  try {
    const tienda = await getTiendaByTelefono(telefono);
    if (!tienda) {
      return null;
    }
    
    const productos = await getProductosByTiendaId(tienda.tienda_id);
    const ventas = await getVentasSemana(tienda.tienda_id);
    
    const ventasTotal = ventas.reduce((sum, venta) => sum + (venta.total || 0), 0);
    
    return {
      nombre: tienda.nombre,
      tienda_id: tienda.tienda_id,
      uri: tienda.uri,
      dominio: tienda.dominio,
      telefono: tienda.telefono,
      cantidadProductos: productos.length,
      ventasSemana: {
        total: ventasTotal,
        cantidad: ventas.length,
        ventas: ventas
      }
    };
  } catch (error) {
    console.error('Error in getTiendaInfo:', error);
    return null;
  }
}

module.exports = {
  getTiendaInfo
};