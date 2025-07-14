const { Document } = require("@langchain/core/documents");
const { ChatPromptTemplate } = require("@langchain/core/prompts");
const { pull } = require("langchain/hub");
const { Annotation, StateGraph } = require("@langchain/langgraph");
const { RecursiveCharacterTextSplitter } = require("@langchain/textsplitters");
const { MemoryVectorStore } = require("langchain/vectorstores/memory");
const { OpenAIEmbeddings } = require("@langchain/openai");
const { ChatOpenAI } = require("@langchain/openai");
const dotenv = require('dotenv');

dotenv.config();

// Initialize the model
const llm = new ChatOpenAI({
  openAIApiKey: process.env.OPENAI_API_KEY,
  temperature: 0.7,
  modelName: "gpt-4o-mini",
  /*
  configuration: {
    baseURL: "https://oai.helicone.ai/v1",
    defaultHeaders: {
      "Helicone-Auth": `Bearer ${process.env.HELICONE_API_KEY}`,
      "Helicone-Cache-Enabled": "true",
    },
  },
  */
});

// Initialize vector store
const vectorStore = new MemoryVectorStore(
  new OpenAIEmbeddings({ openAIApiKey: process.env.OPENAI_API_KEY })
);

// Simple text data instead of loading from web
const sampleText = [
  "Boca Juniors es un club de fútbol que está ubicado en el barrio de Caballito en Buenos Aires, Argentina.",
  "Large language models have revolutionized natural language processing by enabling more human-like text generation.",
  "Retrieval-augmented generation combines the power of language models with the ability to access external knowledge."
];

async function initializeRAG({question,tienda,uri,productos,ai_faqs}) {
  // Create document from sample text
  //const docs = sampleText.map(text => new Document({ pageContent: text }));

  const docs = productos.map(
    producto => new Document({ pageContent: producto.nombre + " " 
        + producto.descripcion + " "
         + producto.precio }));

         

  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000, chunkOverlap: 200
  });
  const allSplits = await splitter.splitDocuments(docs);

  // Index chunks
  await vectorStore.addDocuments(allSplits);

  // Define prompt for question-answering
  const promptTemplate = await pull("rlm/rag-prompt");

  // Define state for application
  const InputStateAnnotation = Annotation.Root({
    question: Annotation,
    tienda: Annotation,
    uri: Annotation,
    productos: Annotation,
    ai_faqs: Annotation
  });

  const StateAnnotation = Annotation.Root({
    question: Annotation,
    context: Annotation,
    answer: Annotation,
    paymentIntent: Annotation,
    paymentMethod: Annotation,
    mercadoPagoIntent: Annotation,
    tienda: Annotation,
    uri: Annotation,
    productos: Annotation,
    ai_faqs: Annotation
  });

  // Define application steps
  const retrieve = async (state) => {
    console.log("retrieve", state.question, state.tienda);
    const retrievedDocs = await vectorStore.similaritySearch(state.question);
    return { context: retrievedDocs };
  };

  const generate = async (state) => {
    const docsContent = state.context.map(doc => doc.pageContent).join("\n");
    
    const storePrompt = ChatPromptTemplate.fromTemplate(
      "Eres un asistente virtual para una tienda online que vende los siguientes productos:\n\n{context}\n\n" +
      "Responde a la siguiente pregunta del cliente de manera amable y profesional, " +
      "ofreciendo información precisa sobre los productos disponibles:\n\n{question}"
    );
    
    const messages = await storePrompt.invoke({ 
      question: state.question, 
      context: docsContent 
    });
    /*const docsContent = state.context.map(doc => doc.pageContent).join("\n");
    const messages = await promptTemplate.invoke({ question: state.question, context: docsContent });
    const response = await llm.invoke(messages);
    return { answer: response.content };*/
    const response = await llm.invoke(messages);
    return { answer: response.content };
  };

  // Check if the question is about making a payment using AI
  const checkPaymentIntent = async (state) => {
    // Use the LLM to detect payment intent and payment method
    const paymentIntentPrompt = ChatPromptTemplate.fromTemplate(
      "Analiza el siguiente mensaje y determina:\n" +
      "1. Si el usuario tiene intención de pagar o comprar algo (responde 'true' o 'false')\n" +
      "2. Si menciona específicamente MercadoPago (responde 'true' o 'false')\n\n" +
      "Mensaje del usuario: {question}\n\n" +
      "Responde en formato JSON con las propiedades 'paymentIntent' y 'mercadoPagoIntent'"
    );
    
    const messages = await paymentIntentPrompt.invoke({ question: state.question });
    const response = await llm.invoke(messages);
    
    try {
      // Parse the JSON response from the LLM
      console.log("response",response);
      //const result = JSON.parse(response.content);
      //console.log("result",result);
      return {
        paymentIntent: response.paymentIntent === true,
        mercadoPagoIntent: response.mercadoPagoIntent === true
      };
    } catch (error) {
      console.error("Error parsing LLM response for payment intent:", error);
      // Fallback to keyword-based detection if AI parsing fails
      const paymentKeywords = ["pagar", "pago", "comprar", "abonar", "payment", "pay"];
      const hasPaymentIntent = paymentKeywords.some(keyword => 
        state.question.toLowerCase().includes(keyword)
      );
      const hasMercadoPagoIntent = state.question.toLowerCase().includes("mercadopago");
      
      return { 
        paymentIntent: hasPaymentIntent,
        mercadoPagoIntent: hasMercadoPagoIntent
      };
    }
  };

  // Ask for payment method if payment intent is detected
  const askPaymentMethod = async (state) => {
    return { 
      answer: "Esta es la tienda: " + state.tienda + "Esta es la uri: " + state.uri + "cantidad de productos: " + state.productos.length + "Por favor, indique su método de pago preferido: MercadoPago, Tarjeta de crédito, transferencia bancaria o efectivo.",
      paymentMethod: null   
    };
  };
  
  // Redirect to MercadoPago
  const redirectToMercadoPago = async (state) => {
    return {
      answer: "Será redirigido a MercadoPago para completar su pago. <a href='https://www.mercadopago.com.ar'>Haga clic aquí para ir a MercadoPago</a>",
      paymentMethod: "mercadopago"
    };
  };

  const getProducts = async (state) => {
    return {
      answer: "Esta es la lista de productos: " + state.productos + "\nProductos encontrados en la búsqueda: " + state.context.map(doc => doc.pageContent).join(", "),
      products: state.productos,
      retrievedProducts: state.context
    };
  };
  // Router function to determine next step based on payment intent
  const router = (state) => {
    if (state.mercadoPagoIntent) {
      return "redirectToMercadoPago";
    } else if (state.paymentIntent) {
      return "askPaymentMethod";
    }
    return "generate";
  };

  // Compile application
  const graph = new StateGraph(StateAnnotation)
    .addNode("retrieve", retrieve)
    .addNode("checkPaymentIntent", checkPaymentIntent)
    .addNode("askPaymentMethod", askPaymentMethod)
    .addNode("redirectToMercadoPago", redirectToMercadoPago)
    .addNode("getProducts", getProducts)
    .addNode("generate", generate)
    .addEdge("__start__", "retrieve")
    .addEdge("retrieve", "checkPaymentIntent")
    .addConditionalEdges("checkPaymentIntent", router)
    .addEdge("askPaymentMethod", "__end__")
    .addEdge("redirectToMercadoPago", "__end__")
    .addEdge("generate", "__end__")
    .compile();
    
  return graph;
}

async function askQuestion(question,tienda,uri,productos,ai_faqs)  {
  const graph = await initializeRAG({question,tienda,uri,productos,ai_faqs});
  const inputs = { question,tienda,uri,productos,ai_faqs };
  //console.log(inputs);
  const result = await graph.invoke(inputs);
  console.log(result.answer);
  return result.answer;
}

module.exports = { initializeRAG, askQuestion };