# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `npm start` - Runs the production server (node api/index.js)
- `npm run dev` - Runs the development server with nodemon for auto-reload
- `npm install` - Installs dependencies

## Project Architecture

This is a Node.js Express API that implements a RAG (Retrieval-Augmented Generation) chatbot for e-commerce stores using LangChain and OpenAI.

### Core Components

**API Layer (`api/index.js`):**
- Express server with CORS enabled for localhost:3002 and pistacho.app
- Main POST endpoint `/api/chat` accepts: `prompt`, `uri`, `tienda`, `productos`, `ai_faqs`
- Returns structured JSON response with `respuesta` field

**RAG Implementation (`components/cherio.js`):**
- Uses LangChain's StateGraph for complex conversation flow
- Implements vector similarity search using MemoryVectorStore with OpenAI embeddings
- Product data is vectorized from the `productos` array (nombre, descripcion, precio)
- Payment intent detection using AI analysis and keyword fallback
- Conditional routing based on payment intent and MercadoPago mentions

**OpenAI Integration (`components/openai.js`):**
- Simple wrapper around LangChain's ChatOpenAI
- Configured for gpt-4o-mini model with temperature 0.7
- Commented Helicone integration for caching/monitoring

### Key Features

1. **Product Search**: Vector similarity search against product catalog
2. **Payment Intent Detection**: AI-powered detection of payment/purchase intent
3. **MercadoPago Integration**: Automatic redirection for MercadoPago payments
4. **Conversation Flow**: StateMachine handling different conversation states

### Environment Variables

Required in `.env`:
- `OPENAI_API_KEY` - OpenAI API key for LLM and embeddings
- `PORT` - Server port (defaults to 3000)

### Deployment

Configured for Vercel deployment with serverless-http adapter:
- `vercel.json` rewrites all routes to `/api`
- Serverless function export in `api/index.js`

### Request/Response Format

POST `/api/chat`:
```json
{
  "prompt": "user message",
  "uri": "store URI",
  "tienda": "store name", 
  "productos": [{"nombre": "...", "descripcion": "...", "precio": "..."}],
  "ai_faqs": "FAQ data"
}
```

Response:
```json
{
  "respuesta": "AI response with product info or payment instructions"
}
```