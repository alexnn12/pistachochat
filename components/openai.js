const { ChatOpenAI } = require("@langchain/openai");
const dotenv = require('dotenv');

dotenv.config();

// Initialize the ChatOpenAI model
const model = new ChatOpenAI({
    openAIApiKey: process.env.OPENAI_API_KEY, // Make sure to set this environment variable
    temperature: 0.7, // Controls randomness: lower is more deterministic
    modelName: "gpt-4o-mini", // You can change to other models like "gpt-4" if needed
  });
  
  // Example function to call OpenAI
  async function callOpenAI(userMessage) {
    try {
      const response = await model.invoke(userMessage);
      console.log("OpenAI response:", response);
      // Return the content part of the response for browser display
      return response.content;
      // return response;
    } catch (error) {
      console.error("Error calling OpenAI:", error);
      throw error;
    }
  }

// Export the function so it can be imported in other files
module.exports = { callOpenAI };