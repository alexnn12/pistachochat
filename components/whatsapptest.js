const axios = require('axios');
const dotenv = require('dotenv');

dotenv.config();

/**
 * Sends a test message using the WhatsApp Business API
 * @param {string} phoneNumber - The phone number to send the message to (with country code, no + or spaces)
 * @param {string} message - The message text to send
 * @returns {Promise<object>} - The API response
 */
async function sendWhatsAppTestMessage(phoneNumber, message = "This is a test message from our application.") {
  try {
    // Make sure the WhatsApp token is available
    const token = process.env.WHATSAPP_TOKEN;
    if (!token) {
      throw new Error('WHATSAPP_TOKEN environment variable is not set');
    }

    // WhatsApp Business API endpoint
    const url = `https://graph.facebook.com/v17.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;
    
    // Request payload
    const data = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: phoneNumber,
      type: "text",
      text: {
        preview_url: false,
        body: message
      }
    };

    // Send the request
    const response = await axios.post(url, data, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('WhatsApp message sent successfully:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error sending WhatsApp message:', error.response?.data || error.message);
    throw error;
  }
}

// Example usage:
// sendWhatsAppTestMessage('5491112345678', 'Hello from our app!');

module.exports = { sendWhatsAppTestMessage };
