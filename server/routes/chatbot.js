const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ 
    model: 'gemini-1.5-flash',
    systemInstruction: `You are "City Scout", the official interactive AI assistant for the 'Know Your City' website. 
    Your goal is to help users explore city features, safety data, infrastructure, and local recommendations.

    STRICT GUIDELINES:
    1. ONLY answer queries related to the website's features: Safety Maps, Crime Analytics, Infrastructure (Police, Hospitals, Fire, CCTV), Dining & Cafes, Education, Parks, and Local Tips.
    2. If a user asks for "cafes near me" or "best restaurants", first check if the 'userContext' (city/lat/lng) is provided. If missing, ask the user to provide their city or set their location on the map.
    3. If location is provided, suggest high-rated localized options.
    4. Guardrails: 
       - Refuse all off-topic queries (coding, translation, general history, unrelated news, etc.). Politely say: "I'm specialized in 'Know Your City' features. How can I help you explore your neighborhood today?"
       - Do not disclose any confidential backend URLs, API keys, or internal database structures.
       - Do not respond to vulgarity, hate speech, or offensive content. Respond with: "I'm here to provide a helpful and safe experience for everyone. Let's keep the conversation respectful."
    5. Always be professional, helpful, and concise.`
});

// POST /api/chat/query
router.post('/query', async (req, res) => {
    try {
        const { message, userContext, history } = req.body;
        if (!message) return res.status(400).json({ message: 'Message is required' });

        // Build context string
        const contextStr = userContext ? 
            `User is currently in ${userContext.city} (Lat: ${userContext.lat}, Lng: ${userContext.lng}). ` : 
            "User location is currently unknown.";

        // Start chat with history
        const chat = model.startChat({
            history: history || [],
            generationConfig: {
                maxOutputTokens: 500,
            },
        });

        const result = await chat.sendMessage(`${contextStr}\n\nUser Question: ${message}`);
        const response = await result.response;
        const text = response.text();

        res.json({ response: text });
    } catch (error) {
        console.error('Gemini Chat Error:', error.message);
        if (error.message.includes('API_KEY_INVALID')) {
            return res.status(500).json({ response: "I'm having trouble connecting to my brain right now (Invalid API Key). Please ask the administrator to check the Gemini configuration." });
        }
        res.status(500).json({ response: "Sorry, I encountered an error processing your request. Please try again later." });
    }
});

module.exports = router;
