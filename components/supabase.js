const { createClient } = require('@supabase/supabase-js');
const { OpenAI } = require('openai');
const dotenv = require('dotenv');

dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE;

const supabase = createClient(supabaseUrl, supabaseKey);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: "https://oai.helicone.ai/v1",
  defaultHeaders: {
    "Helicone-Auth": "Bearer "+ process.env.HELICONE_API_KEY
  }
});

async function getTiendaByUri(uri) {
  try {
    const { data, error } = await supabase
      .from('tiendas')
      .select('nombre, tienda_id,uri,dominio')
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

async function getTiendasPaginasByTiendaId(tiendaId, prompt = null, matchThreshold = 0.4, matchCount = 10) {
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
      model: 'text-embedding-3-small',
      input: prompt,
      
    });
console.log (prompt)
    const queryEmbedding = embedding.data[0].embedding;
    
    console.log('tiendaId:', tiendaId, 'type:', typeof tiendaId);    // Buscar por similitud vectorial usando RPC
    const { data, error } = await supabase.rpc('buscar_tiendas_paginas', {
      query_embedding: queryEmbedding,
      filter_tienda_id: String(tiendaId),
      match_threshold: matchThreshold,
      match_count: matchCount
    });

    console.log('data:', data);

    if (error) {
      console.error('Error in vector search:', error);
      // Fallback a búsqueda normal si falla la vectorial
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('tiendas_paginas')
        .select('*')
        .eq('tienda_id', tiendaId);
      
      return fallbackError ? [] : fallbackData;
    }

    return data || [];
  } catch (error) {
    console.error('Error in getTiendasPaginasByTiendaId:', error);
    return [];
  }
}

async function getProductosByTiendaId(tiendaId) {
  try {
    const { data, error } = await supabase
      .from('tiendas_productos')
      .select('tienda_producto_id, nombre,descripcion,precio,imagen_preview_url')
      .eq('tienda_id', tiendaId)
      .or('producto_tipo.eq.6,producto_tipo.eq.8,producto_tipo.eq.10,producto_tipo.eq.13,producto_tipo.eq.17')

    
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
  getTiendaData,
  getProductosByTiendaId
};

/*CREATE OR REPLACE FUNCTION buscar_tiendas_paginas (
    query_embedding vector(1536),
    filter_tienda_id bigint,
    match_threshold float DEFAULT 0.5,
    match_count int DEFAULT 10
  )
  RETURNS TABLE (
    pagina_id bigint,
    titulo text,
    descripcion text,
     similarity float
  )
  LANGUAGE plpgsql
  AS $$
  BEGIN
    RETURN QUERY
    SELECT
      tp.pagina_id,
      tp.titulo,
      tp.descripcion,
      1 - (tp.descripcion_embeded <=> query_embedding) as similarity
    FROM tiendas_paginas tp
    WHERE tp.tienda_id = filter_tienda_id
      AND tp.descripcion_embeded IS NOT NULL
      AND 1 - (tp.descripcion_embeded <=> query_embedding) > match_threshold
    ORDER BY tp.descripcion_embeded <=> query_embedding
    LIMIT match_count;
  END;
  $$;*/