const express = require('express');
const { callOpenAI } = require('../components/openai');
const dotenv = require('dotenv');
const { askQuestion } = require('../components/cherio');
const serverless = require('serverless-http');
const cors = require('cors');

dotenv.config();

// Set up Express server
const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS for all routes
app.use(cors({
  origin: 'http://localhost:3002',
  methods: ['GET', 'POST'],
  credentials: true
}));

//app.get('/', async (_, res) => res.send(await callOpenAI("Hello, how are you today?")));
app.get('/', (_, res) => res.send('API running'));

app.get('/api/chat', async (_, res) => res.send(await askQuestion("Quiero pagar con tarjeta")));
// Set up middleware to parse JSON bodies
app.use(express.json());

// POST endpoint for chat
app.post('/api/chat', async (req, res) => {
  try {
    const { prompt } = req.body;
    console.log(prompt);
    if (!prompt) {
      return res.status(400).json({ error: 'Message is required' });
    }
    
    const response = await askQuestion(prompt);
    res.json({ response });
  } catch (error) {
    console.error('Error processing chat request:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// Start the server 
app.listen(PORT, () => console.log(`Servidor en http://localhost:${PORT}`));

// Test the OpenAI integration
module.exports = app;
