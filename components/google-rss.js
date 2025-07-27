const { getTiendaByUri, getProductosByTiendaId } = require('./supabase');

async function generateGoogleRSS(tienda_uri) {
  try {
    // Obtener tienda por URI
    const tienda = await getTiendaByUri(tienda_uri);
    if (!tienda) {
      return null;
    }
    
    // Obtener productos de la tienda
    const productos = await getProductosByTiendaId(tienda.tienda_id);
    
    // Generar XML RSS para Google Shopping
    const rssXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0">
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
  
  // Determinar la URL base según si tiene dominio propio
  const baseUrl = tienda.dominio ? `https://${tienda.dominio}` : 'https://www.pistacho.app';
  const productUrl = `${baseUrl}/${tienda_uri}-pagina?item=${producto.tienda_producto_id}`;
  
  return `<item>
<g:id>${producto.tienda_producto_id || producto.id}</g:id>
<title><![CDATA[${producto.nombre || 'Sin título'}]]></title>
<description><![CDATA[${producto.descripcion || 'Sin descripción'}]]></description>
<link>${producto.link || productUrl}</link>
<g:image_link>${imageUrl}</g:image_link>
<g:availability>in_stock</g:availability>
<g:condition>new</g:condition>
<g:price>${producto.precio || '0'}.00 ARS</g:price>
<g:google_product_category>212</g:google_product_category>
<g:identifier_exists>no</g:identifier_exists>
<g:shipping_weight>0 kg</g:shipping_weight>
<g:product_type><![CDATA[${producto.categoria || 'general'}]]></g:product_type>
</item>`;
}).join('\n')}
</channel>
</rss>`;
    
    return rssXml;
  } catch (error) {
    console.error('Error generating Google RSS:', error);
    return null;
  }
}

module.exports = {
  generateGoogleRSS
};