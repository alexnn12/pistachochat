# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `npm start` - Runs the production server (node api/index.js)
- `npm run dev` - Runs the development server with nodemon for auto-reload
- `npm install` - Installs dependencies

## Project Architecture

This is a Node.js Express API that implements dual chatbot systems for e-commerce stores: a sophisticated RAG (Retrieval-Augmented Generation) system using LangChain and a simpler chat system with Supabase integration.

### Core Components

**API Layer (`api/index.js`):**
- Express server with CORS enabled for multiple domains (localhost:3002, pistacho.app, regalaleya.com, cintiasalvo.com.ar, belle-girls.com)
- Two main POST endpoints: `/api/chat` (LangChain RAG) and `/api/simple-chat` (direct OpenAI + Supabase)
- Commented RSS endpoints for Facebook and Google Shopping integration
- Returns structured JSON response with `respuesta` field

**RAG Implementation (`components/cherio.js`):**
- Uses LangChain's StateGraph for complex conversation flow with conditional routing
- Implements vector similarity search using MemoryVectorStore with OpenAI embeddings
- Product data is vectorized from the `productos` array (nombre, descripcion, precio)
- AI-powered payment intent detection with keyword fallback
- State machine with nodes: retrieve → checkPaymentIntent → (generate|askPaymentMethod|redirectToMercadoPago)
- Conditional routing based on payment intent and MercadoPago mentions

**Simple Chat System (`components/simple-chat.js`):**
- Direct OpenAI integration with text-based product search
- Supabase integration for store data and vector-based page content search
- Supports conversation history via `mensajes_historial` parameter
- Helicone integration for caching and monitoring

**Supabase Integration (`components/supabase.js`):**
- Database operations for `tiendas`, `tiendas_paginas`, and `tiendas_productos` tables
- Vector similarity search using custom RPC function `buscar_tiendas_paginas`
- OpenAI embeddings integration for semantic search of store pages
- Filters products by specific `producto_tipo` values (6, 8, 10, 13, 17)

**OpenAI Wrapper (`components/openai.js`):**
- Simple LangChain ChatOpenAI wrapper
- Configured for gpt-4o-mini model with temperature 0.7

### API Endpoints

**POST `/api/chat` (LangChain RAG):**
- Uses StateGraph for complex conversation management
- Parameters: `prompt`, `uri`, `tienda`, `productos`, `ai_faqs`

**POST `/api/simple-chat` (Direct + Supabase):**
- Simpler implementation with Supabase store data integration
- Parameters: `prompt`, `tienda`, `productos`, `ai_faqs`, `uri`, `mensajes_historial`

### Key Features

1. **Dual Chat Systems**: LangChain StateGraph vs Simple OpenAI chat
2. **Product Search**: Vector similarity (LangChain) or text matching (Simple)
3. **Payment Intent Detection**: AI-powered detection with MercadoPago routing
4. **Supabase Integration**: Store data, pages content, and vector search
5. **Conversation History**: Support for message history in simple chat
6. **Multi-domain CORS**: Support for multiple e-commerce domains

### Environment Variables

Required in `.env`:
- `OPENAI_API_KEY` - OpenAI API key for LLM and embeddings
- `HELICONE_API_KEY` - Helicone API key for caching/monitoring (optional)
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_ROLE` - Supabase service role key
- `PORT` - Server port (defaults to 3000)

### Database Schema (Supabase)

Key tables:
- `tiendas`: Store information (nombre, tienda_id, uri, dominio)
- `tiendas_paginas`: Store pages with vector embeddings for semantic search
- `tiendas_productos`: Products filtered by specific types

Custom RPC function `buscar_tiendas_paginas` performs vector similarity search using pgvector.

### Deployment

Configured for Vercel deployment with serverless-http adapter:
- `vercel.json` rewrites all routes to `/api`
- Serverless function export in `api/index.js`
- Module exports for serverless compatibility