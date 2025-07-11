const express = require('express');
const { callOpenAI } = require('../components/openai');
const dotenv = require('dotenv');
const { askQuestion } = require('../components/cherio');
const serverless = require('serverless-http');

dotenv.config();

// Set up Express server
const app = express();
const PORT = process.env.PORT || 3000;

//app.get('/', async (_, res) => res.send(await callOpenAI("Hello, how are you today?")));
app.get('/', (_, res) => res.send('API running'));
app.get('/api/chat', async (_, res) => res.send(await askQuestion("Quiero pagar con tarjeta")));

// Start the server 
app.listen(PORT, () => console.log(`Servidor en http://localhost:${PORT}`));

// Test the OpenAI integration
module.exports = app;

