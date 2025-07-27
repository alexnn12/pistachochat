const { getTiendaByUri, getProductosByTiendaId } = require('./supabase');

async function generateFacebookRSS(tienda_uri) {
  try {
    // Obtener tienda por URI
    const tienda = await getTiendaByUri(tienda_uri);
    if (!tienda) {
      return null;
    }
    
    // Obtener productos de la tienda
    const productos = await getProductosByTiendaId(tienda.tienda_id);
    
    //<condition>new</condition> -- lo quite
    //<brand><![CDATA[${tienda.nombre || tienda_uri}]]></brand>

    // Generar XML RSS para Facebook
    const rssXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
<channel>
${productos.map(producto => {
  // Extraer primera imagen del array o string vacío
  let imageUrl = '';
  if (producto.imagen_preview_url) {
    try {
      const imageArray = JSON.parse(producto.imagen_preview_url);
      imageUrl = Array.isArray(imageArray) && imageArray.length > 0 ? imageArray[0] : '';
    } catch (e) {
      // Si no es JSON válido, usar como string directo
      imageUrl = producto.imagen_preview_url;
    }
  }
  
  return `<item>
<id>${producto.tienda_producto_id || producto.id}</id>
<title><![CDATA[${producto.nombre || 'Sin título'}]]></title>
<description><![CDATA[${producto.descripcion || 'Sin descripción'}]]></description>
<link>${producto.link || `https://www.pistacho.app/${tienda_uri}-pagina?item=${producto.tienda_producto_id}`}</link>
<image_link>${imageUrl}</image_link>
<availability>in stock</availability>
<price>${producto.precio || '0'}.00 ARS</price>
<product_type><![CDATA[${producto.categoria || 'general'}]]></product_type>
</item>`;
}).join('\n')}
</channel>
</rss>`;
    
    return rssXml;
  } catch (error) {
    console.error('Error generating Facebook RSS:', error);
    return null;
  }
}

module.exports = {
  generateFacebookRSS
};