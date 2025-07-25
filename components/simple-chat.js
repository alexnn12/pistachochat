const { OpenAI } = require('openai');
const dotenv = require('dotenv');
const { getTiendaData } = require('./supabase');

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  // Helicone integration for caching and monitoring
  baseURL: "https://oai.helicone.ai/v1",
  defaultHeaders: {
    "Helicone-Auth": "Bearer "+ process.env.HELICONE_API_KEY
  }
});

// Función simple que busca productos relevantes usando texto
function findRelevantProducts(prompt, productos) {
  if (!productos || productos.length === 0) return [];
  
  const promptLower = prompt.toLowerCase();
  const keywords = promptLower.split(' ').filter(word => word.length > 2);
  
  return productos.filter(producto => {
    const productText = (producto.nombre + ' ' + producto.descripcion).toLowerCase();
    return keywords.some(keyword => productText.includes(keyword));
  }).slice(0, 100); // Máximo 5 productos
}

async function simpleChat(prompt, tienda = '', productos = [], ai_faqs = '', uri = '',mensajes_historial = '') {
  try {
    // Obtener datos de Supabase si se proporciona URI
    let tiendaData = null;
    let paginasData = [];
    
    if (uri) {
      const supabaseData = await getTiendaData(uri, prompt);
      tiendaData = supabaseData.tienda;
      paginasData = supabaseData.paginas;
   //   console.log(tiendaData);
   //   console.log(paginasData);
    }
    
    // Buscar productos relevantes
    const relevantProducts = findRelevantProducts(prompt, productos);
    
    // Crear contexto con productos
    let context = '';
    if (relevantProducts.length > 0) {
      context = 'Productos disponibles:\n' + 
        relevantProducts.map(p => `- ${p.nombre}: ${p.descripcion} - ${p.precio}`).join('\n') + '\n\n';
    }
    
    // Añadir información de la tienda de Supabase
    if (tiendaData) {
      context += `Información de la tienda: ${JSON.stringify(tiendaData)}\n\n`;
    }
    
    // Añadir información de páginas de la tienda
    if (paginasData.length > 0) {
      context += `Páginas de la tienda:\n` + 
        paginasData.map(p => `- ${JSON.stringify(p)}`).join('\n') + '\n\n';
    }
    
    // Mensaje del sistema
    const nombreTienda = tiendaData?.nombre || tienda || 'una tienda online';
    let systemMessage = `Eres un asistente virtual amable y profesional para ${nombreTienda}. 
Ayuda a los clientes con información sobre productos y responde sus preguntas de manera útil.
Da respuestas cortas y concisas. No usar negritas.
${context ? 'Usa la información de productos y tienda proporcionada para dar respuestas precisas.' : ''}`;

    if (mensajes_historial) {
      systemMessage += `\n\nHistorial de mensajes: ${mensajes_historial.map(m => m.role + ': ' + m.content).join('\n')}`;
    }
 //   console.log(systemMessage);

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.7,
      messages: [
        { role: "system", content: systemMessage },
        { role: "user", content: context + prompt }
      ],
    });

    return completion.choices[0].message.content;
  } catch (error) {
    console.error('Error in simpleChat:', error);
    return 'Disculpa, hubo un error procesando tu consulta. Por favor intenta de nuevo.';
  }
}

module.exports = { simpleChat };