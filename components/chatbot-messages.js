const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE;

const supabase = createClient(supabaseUrl, supabaseKey);

// Generar hash único por día y teléfono
function generateDailyChatHash(telefono) {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  return `${telefono}_${today}`;
}

async function getTiendaByTelefono(telefono) {
  try {
    if (telefono && !telefono.startsWith('+')) {
      telefono = '+' + telefono;
    }
    
    const { data, error } = await supabase
      .from('tiendas')
      .select('tienda_id, usuario_id')
      .eq('whatsapp', telefono)
      .single();
    
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

async function saveMessage(telefono, pregunta, respuesta) {
  try {
    // Formatear teléfono
    if (telefono && !telefono.startsWith('+')) {
      telefono = '+' + telefono;
    }

    // Obtener tienda por teléfono
    const tienda = await getTiendaByTelefono(telefono);
    if (!tienda) {
      return { success: false, error: 'Tienda no encontrada para este teléfono' };
    }

    console.log('tienda:', tienda);
    // Generar hash diario
    const chatHash = generateDailyChatHash(telefono);
    
    // Buscar chat existente del día
    const { data: existingChat, error: searchError } = await supabase
      .from('tiendas_chats_admin')
      .select('*')
      .eq('chat_hash', chatHash)
      .eq('tienda_id', tienda.tienda_id)
      .single();

    const nuevoMensaje = {
      timestamp: new Date().toISOString(),
      pregunta: pregunta,
      respuesta: respuesta
    };
    if (existingChat) {
      // Actualizar chat existente
      let textosExistentes = Array.isArray(existingChat.texto_json) 
        ? existingChat.texto_json 
        : (typeof existingChat.texto_json === 'string' 
            ? JSON.parse(existingChat.texto_json) 
            : []);
      
      console.log('textosExistentes:', textosExistentes);
      // Asegurar que sea un array
      if (!Array.isArray(textosExistentes)) {
        textosExistentes = [];
      }
      
      textosExistentes.push(nuevoMensaje);

      const { data, error } = await supabase
        .from('tiendas_chats_admin')
        .update({ 
          texto_json: textosExistentes,
          fecha_actualizacion: new Date().toISOString() 
        })
        .eq('chat_hash', chatHash)
        .select();

      if (error) {
        console.error('Error updating chat:', error);
        return { success: false, error: error.message };
      }

      return { success: true, data: data[0] };
    } else {
      // Crear nuevo chat
      const { data, error } = await supabase
        .from('tiendas_chats_admin')
        .insert({
          chat_hash: chatHash,
          tienda_id: tienda.tienda_id,
          usuario_id: tienda.usuario_id,
          texto_json: [nuevoMensaje],
          fecha: new Date().toISOString(),
          fecha_actualizacion: new Date().toISOString()
        })
        .select();

      if (error) {
        console.error('Error creating chat:', error);
        return { success: false, error: error.message };
      }

      return { success: true, data: data[0] };
    }
  } catch (error) {
    console.error('Error in saveMessage:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  saveMessage
};