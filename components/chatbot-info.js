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

function getEstadoPagoTexto(estado) {
  switch (estado) {
    case 0: return 'Pendiente';
    case 1: return 'Pagado';
    case 2: return 'Cancelado';
    default: return 'No especificado';
  }
}

function getEstadoEnvioTexto(estado_envio) {
  if (estado_envio === null) return 'Pendiente';
  switch (estado_envio) {
    case 1: return 'Preparando';
    case 2: return 'Empaquetado';
    case 3: return 'Enviado';
    case 4: return 'Entregado';
    default: return 'No especificado';
  }
}

function getFormaPagoTexto(forma_pago) {
  switch (forma_pago) {
    case 1: return 'Mercadopago';
    case 2: return 'Transferencia';
    case 3: return 'Paypal';
    case 4: return 'Producto gratuito';
    case 5: return 'Ualá Bis';
    case 6: return 'Efectivo';
    case 7: return 'Pago a coordinar';
    default: return 'No especificado';
  }
}

async function getVentasSemana(tiendaId) {
  try {
    const fechaInicio = new Date();
    fechaInicio.setDate(fechaInicio.getDate() - 7);
    
    const { data, error } = await supabase
      .from('tiendas_compras')
      .select(`
        compra_id,
        nombre,
        precio,
        precio_dolar,
        estado,
        estado_envio,
        fecha_creado,
        forma_pago,
        cliente_id,
        tienda_producto_id,
        producto_nombre,
        cantidad,
        observaciones,
        direccion,
        variante_nombre,
        variante_id,
        codigo_descuento,
        sena
      `)
      .eq('tienda_id', tiendaId)
      .gte('fecha_creado', fechaInicio.toISOString())
      .order('fecha_creado', { ascending: false });
    
    if (error) {
      console.error('Error fetching ventas:', error);
      return [];
    }
    
    // Transformar los datos para incluir estados en texto
    const ventasConTexto = data.map(venta => ({
      ...venta,
      estado_texto: getEstadoPagoTexto(venta.estado),
      estado_envio_texto: getEstadoEnvioTexto(venta.estado_envio),
      forma_pago_texto: getFormaPagoTexto(venta.forma_pago)
    }));
    
    return ventasConTexto;
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