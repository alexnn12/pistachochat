const express = require('express');
const { callOpenAI } = require('../components/openai');
const dotenv = require('dotenv');
const { askQuestion } = require('../components/cherio');
const { simpleChat } = require('../components/simple-chat');
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
    const { prompt, tienda, productos, ai_faqs, uri,mensajes_historial } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Message is required' });
    }
    
    const response = await simpleChat(prompt, tienda, productos, ai_faqs, uri,mensajes_historial);
    res.json({ respuesta: response });
  } catch (error) {
    console.error('Error processing simple chat request:', error);
    res.status(500).json({ error: 'Internal server error' });
  } 
});


// Start the server 
app.listen(PORT, () => console.log(`Servidor en http://localhost:${PORT}`));

// Test the OpenAI integration
module.exports = app;
