const { createClient } = require('@supabase/supabase-js');
const { OpenAI } = require('openai');
const dotenv = require('dotenv');

dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE;

const supabase = createClient(supabaseUrl, supabaseKey);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Función para calcular similitud coseno
function cosineSimilarity(vecA, vecB) {
  if (vecA.length !== vecB.length) return 0;
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

async function getTiendaByUri(uri) {
  try {
    const { data, error } = await supabase
      .from('tiendas')
      .select('*')
      .eq('uri', uri)
      .single();
    
    if (error) {
      console.error('Error fetching tienda:', error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('Error in getTiendaByUri:', error);
    return null;
  }
}

async function getTiendasPaginasByTiendaId(tiendaId, prompt = null, matchThreshold = 0.5, matchCount = 10) {
  try {
    if (!prompt) {
      // Si no hay prompt, buscar todas las páginas de la tienda
      const { data, error } = await supabase
        .from('tiendas_paginas')
        .select('*')
        .eq('tienda_id', tiendaId);
      
      if (error) {
        console.error('Error fetching tiendas_paginas:', error);
        return [];
      }
      
      return data;
    }

    // Generar embedding del prompt
    const embedding = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: prompt,
    });

    const queryEmbedding = embedding.data[0].embedding;
    
    // Buscar por similitud vectorial directamente
    const { data, error } = await supabase
      .from('tiendas_paginas')
      .select('*, descripcion_embeded')
      .eq('tienda_id', tiendaId)
      .limit(matchCount);

    if (error) {
      console.error('Error in vector search:', error);
      // Fallback a búsqueda normal si falla la vectorial
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('tiendas_paginas')
        .select('*')
        .eq('tienda_id', tiendaId);
      
      return fallbackError ? [] : fallbackData;
    }

    // Calcular similitud coseno y filtrar
    const resultsWithSimilarity = data
      .map(item => {
        if (!item.descripcion_embeded) return null;
        const similarity = cosineSimilarity(queryEmbedding, item.descripcion_embeded);
        return { ...item, similarity };
      })
      .filter(item => item && item.similarity > matchThreshold)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, matchCount);

    return resultsWithSimilarity;
  } catch (error) {
    console.error('Error in getTiendasPaginasByTiendaId:', error);
    return [];
  }
}

async function getTiendaData(uri, prompt = null) {
  try {
    const tienda = await getTiendaByUri(uri);
    if (!tienda) {
      return { tienda: null, paginas: [] };
    }
    
    const paginas = await getTiendasPaginasByTiendaId(tienda.tienda_id, prompt);
    
    return {
      tienda,
      paginas
    };
  } catch (error) {
    console.error('Error in getTiendaData:', error);
    return { tienda: null, paginas: [] };
  }
}

module.exports = {
  getTiendaByUri,
  getTiendasPaginasByTiendaId,
  getTiendaData
};