const express = require('express');
const { callOpenAI } = require('../components/openai');
const dotenv = require('dotenv');
const { askQuestion } = require('../components/cherio');
const { simpleChat } = require('../components/simple-chat');
const { generateFacebookRSS } = require('../components/facebook-rss');
const { generateGoogleRSS } = require('../components/google-rss');
const { getTiendaInfo } = require('../components/chatbot-info');
const serverless = require('serverless-http');
const cors = require('cors');

dotenv.config();

// Set up Express server
const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS for all routes
app.use(cors({
  origin: ['http://localhost:3002', 'https://www.pistacho.app','https://www.regalaleya.com','https://www.cintiasalvo.com.ar','https://www.belle-girls.com'],
  methods: ['GET', 'POST'],
  credentials: true
}));

//app.get('/', async (_, res) => res.send(await callOpenAI("Hello, how are you today?")));
app.get('/', (_, res) => res.send('API running'));

app.get('/api/chat', async (_, res) => res.send(await askQuestion("Quiero pagar con tarjeta")));
// Set up middleware to parse JSON bodies
app.use(express.json({ limit: '400kb' }));
app.use(express.urlencoded({ limit: '400kb', extended: true }));

// POST endpoint for chat
app.post('/api/chat', async (req, res) => {
  try {
    const { prompt,uri,tienda,productos, ai_faqs } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Message is required' });
    }
    
    const response = await askQuestion(prompt,tienda,uri,productos,ai_faqs);
    res.json({ respuesta: response });
  } catch (error) {
    console.error('Error processing chat request:', error);
    res.status(500).json({ error: 'Internal server error' });
  } 
});

// POST endpoint for simple chat (without LangChain)
app.post('/api/simple-chat', async (req, res) => {
  try {
    const { prompt, tienda, productos, ai_faqs, uri,mensajes_historial,chat_hash } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Message is required' });
    }
    
    const response = await simpleChat(prompt, tienda, productos, ai_faqs, uri,mensajes_historial,chat_hash);
    res.json({ respuesta: response });
  } catch (error) {
    console.error('Error processing simple chat request:', error);
    res.status(500).json({ error: 'Internal server error' });
  } 
});

// GET endpoint for Facebook RSS XML with date validation
app.get('/facebook/:tienda_uri/:timestamp.xml', async (req, res) => {
  try {
    const { tienda_uri, timestamp } = req.params;
    const providedTime = parseInt(timestamp);
    
    const result = await generateFacebookRSS(tienda_uri, providedTime);
    
    if (!result) {
      return res.status(404).send('Tienda no encontrada');
    }
    
    if (result.error === 'INVALID_DATE') {
      return res.status(400).send('Timestamp inválido');
    }
    
    res.set('Content-Type', 'application/xml');
    res.send(result.xml);
  } catch (error) {
    console.error('Error generating Facebook RSS:', error);
    res.status(500).send('Error interno del servidor');
  }
});

// GET endpoint for Google Shopping RSS XML with date validation
app.get('/google/:tienda_uri/:timestamp.xml', async (req, res) => {
  try {
    const { tienda_uri, timestamp } = req.params;
    const providedTime = parseInt(timestamp);
    
    const result = await generateGoogleRSS(tienda_uri, providedTime);
    
    if (!result) {
      return res.status(404).send('Tienda no encontrada');
    }
    
    if (result.error === 'INVALID_DATE') {
      return res.status(400).send('Timestamp inválido');
    }
    
    res.set('Content-Type', 'application/xml');
    res.send(result.xml);
  } catch (error) {
    console.error('Error generating Google RSS:', error);
    res.status(500).send('Error interno del servidor');
  }
});

// GET endpoint for chatbot tienda info
app.get('/api/chatbot/tiendainfo', async (req, res) => {
  try {
    const { telefono } = req.query;
    
    if (!telefono) {
      return res.status(400).json({ error: 'Teléfono es requerido' });
    }
    
    const tiendaInfo = await getTiendaInfo(telefono);
    
    if (!tiendaInfo) {
      return res.json({
        nombre: null,
        tienda_id: null,
        uri: null,
        dominio: null,
        telefono: telefono,
        cantidadProductos: 0,
        fechadelDia: null,
        ventasSemana: {
          total: 0,
          cantidad: 0,
          ventas: []
        }
      });
    }
    
    res.json(tiendaInfo);
  } catch (error) {
    console.error('Error getting tienda info:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});


// Start the server 
app.listen(PORT, () => console.log(`Servidor en http://localhost:${PORT}`));

// Test the OpenAI integration
module.exports = app;
