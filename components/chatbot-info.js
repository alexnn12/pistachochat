const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE;

const supabase = createClient(supabaseUrl, supabaseKey);

// Normalizar teléfono para manejar diferentes formatos
function normalizeTelefono(telefono) {
  if (!telefono) return telefono;
  
  // Remover espacios y caracteres especiales
  let cleanPhone = telefono.replace(/[\s\-\(\)]/g, '');
  
  // Si empieza con +549, mantenerlo
  if (cleanPhone.startsWith('+549')) {
    return cleanPhone;
  }
  
  // Si empieza con +54 pero no +549, agregar el 9
  if (cleanPhone.startsWith('+54') && !cleanPhone.startsWith('+549')) {
    return cleanPhone.replace('+54', '+549');
  }
  
  // Si empieza con 549, agregar +
  if (cleanPhone.startsWith('549')) {
    return '+' + cleanPhone;
  }
  
  // Si empieza con 54 pero no 549, agregar 9 después del 54
  if (cleanPhone.startsWith('54') && !cleanPhone.startsWith('549')) {
    return '+549' + cleanPhone.substring(2);
  }
  
  // Si no tiene código de país, agregar +549
  if (!cleanPhone.startsWith('+')) {
    return '+549' + cleanPhone;
  }
  
  return cleanPhone;
}

async function getTiendaByTelefono(telefono) {
  try {
    const normalizedPhone = normalizeTelefono(telefono);
    console.log('Original phone:', telefono, 'Normalized phone:', normalizedPhone);
    const { data, error } = await supabase
      .from('tiendas')
      .select('nombre, tienda_id,uri,dominio,fecha,usuario_id,texto_inicial')
      .eq('whatsapp', normalizedPhone)
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

async function getCarritoItems(compraId) {
  try {
    const { data, error } = await supabase
      .from('tiendas_carritos')
      .select(`
        producto_nombre,
        sku,
        variante_nombre,
        cantidad,
        precio
      `)
      .eq('compra_id', compraId);
    
    if (error) {
      console.error('Error fetching carrito items:', error);
      return [];
    }
    
    return data;
  } catch (error) {
    console.error('Error in getCarritoItems:', error);
    return [];
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
        producto_nombre,
        cantidad,
        observaciones,
        direccion,
        variante_nombre,
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
    
    // Transformar los datos para incluir estados en texto y carrito items
    const ventasConTexto = await Promise.all(data.map(async (venta) => {
      const carritoItems = await getCarritoItems(venta.compra_id);
      
      return {
        ...venta,
        estado_texto: getEstadoPagoTexto(venta.estado),
        estado_envio_texto: getEstadoEnvioTexto(venta.estado_envio),
        forma_pago_texto: getFormaPagoTexto(venta.forma_pago),
        carrito_items: carritoItems
      };
    }));
    
    return ventasConTexto;
  } catch (error) {
    console.error('Error in getVentasSemana:', error);
    return [];
  }
}

// Generar hash único por día y teléfono
function generateDailyChatHash(telefono) {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  return `${telefono}_${today}`;
}

async function getChatMessagesByTelefono(telefono) {
  try {
    const normalizedPhone = normalizeTelefono(telefono);
    const chatHash = generateDailyChatHash(normalizedPhone);
    
    const { data, error } = await supabase
      .from('tiendas_chats_admin')
      .select('texto_json')
      .eq('chat_hash', chatHash)
      .single();
    
    if (error || !data) {
      return [];
    }
    
    // Obtener los últimos 10 mensajes
    let mensajes = data.texto_json || [];
    
    // Asegurar que sea un array
    if (!Array.isArray(mensajes)) {
      try {
        // Intentar parsear si es un string JSON
        mensajes = typeof mensajes === 'string' ? JSON.parse(mensajes) : [];
      } catch (e) {
        console.error('Error parsing texto_json:', e);
        mensajes = [];
      }
    }
    
    return mensajes.slice(-10).map(mensaje => ({
      timestamp: mensaje.timestamp,
      pregunta: mensaje.pregunta,
      respuesta: mensaje.respuesta,
      hora: new Date(mensaje.timestamp).toLocaleTimeString('es-AR')
    }));
  } catch (error) {
    console.error('Error in getChatMessagesByTelefono:', error);
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
    const chatMessages = await getChatMessagesByTelefono(telefono);
    
    const ventasTotal = ventas.reduce((sum, venta) => sum + (venta.precio || 0), 0);
    
    // Contar ventas por estado
    const ventasPagadas = ventas.filter(v => v.estado === 1).length;
    const ventasPendientes = ventas.filter(v => v.estado === 0).length;
    const ventasCanceladas = ventas.filter(v => v.estado === 2).length;
    
    // Contar por forma de pago
    const formasPago = ventas.reduce((acc, venta) => {
      const forma = venta.forma_pago_texto;
      acc[forma] = (acc[forma] || 0) + 1;
      return acc;
    }, {});
    
    return {
      tienda: {
        nombre: tienda.nombre,
        dominio: tienda.dominio || `www.pistacho.app/${tienda.uri}`,
        cantidadProductosActivos: productos.length,
        fechadelDia: new Date().toLocaleDateString('es-AR')
      },
      resumenVentasSemana: {
        totalVentas: ventas.length,
        montoTotal: `$${ventasTotal.toLocaleString()}`,
        ventasPagadas: ventasPagadas,
        ventasPendientes: ventasPendientes,
        ventasCanceladas: ventasCanceladas,
        formasPagoUsadas: formasPago
      },
      chatDelDia: {
        totalMensajes: chatMessages.length,
        ultimosMensajes: chatMessages
      },
      detalleVentas: ventas.map(venta => ({
        compra: `#${venta.compra_id}`,
        cliente: venta.nombre,
        fechaCompra: new Date(venta.fecha_creado).toLocaleDateString('es-AR'),
        montoTotal: `$${venta.precio?.toLocaleString() || 0}`,
        estadoPago: venta.estado_texto,
        estadoEnvio: venta.estado_envio_texto,
        metodoPago: venta.forma_pago_texto,
        direccionEnvio: venta.direccion || 'No especificada',
        observaciones: venta.observaciones || 'Sin observaciones',
        descuento: venta.codigo_descuento || 'Sin descuento',
        productosComprados: venta.carrito_items.map(item => ({
          producto: item.producto_nombre,
          sku: item.sku || 'Sin SKU',
          variante: item.variante_nombre || 'Sin variante',
          cantidad: item.cantidad,
          precioUnitario: `$${item.precio?.toLocaleString() || 0}`
        }))
      }))
    };
  } catch (error) {
    console.error('Error in getTiendaInfo:', error);
    return null;
  }
}

module.exports = {
  getTiendaInfo
};