const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize Gemini
const apiKey = process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.trim() : "";
if (!apiKey) {
    console.error('CRITICAL: GEMINI_API_KEY is missing in server/.env');
}

const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ 
    model: 'gemini-2.5-flash',
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

const CityData = require('../models/CityData');

// POST /api/chat/query
router.post('/query', async (req, res) => {
    console.log('--- Chatbot /query hit! ---');
    try {
        const { message, userContext, history } = req.body;
        if (!message) return res.status(400).json({ message: 'Message is required' });

        // GROUNDING: Look for city data in the database
        let databaseInfo = "";
        const cityToSearch = userContext?.city || message; // Try to extract city from message if context is missing
        
        try {
            // Find city data (case-insensitive)
            const cityInfo = await CityData.findOne({ 
                cityName: new RegExp('^' + cityToSearch.trim() + '$', 'i') 
            });

            if (cityInfo) {
                databaseInfo = `
                REAL-TIME DATA FROM OUR DATABASE FOR ${cityInfo.cityName.toUpperCase()}:
                - Police Stations: ${cityInfo.safetyStats.policeCount}
                - Hospitals: ${cityInfo.safetyStats.hospitalCount}
                - Fire Stations: ${cityInfo.safetyStats.fireCount}
                - CCTV Cameras: ${cityInfo.safetyStats.cctvCount}
                - Overall Safety Score: ${cityInfo.safetyStats.totalScore}%
                
                Top Nearby Landmarks/Zones:
                ${cityInfo.touristZones.slice(0, 3).map(z => `- ${z.name} (Safety: ${z.safetyScore}/100)`).join('\n')}
                `;
            } else {
                databaseInfo = "No specific data for this city found in our latest records. Suggesting general neighborhood explorer tips.";
            }
        } catch (dbError) {
            console.error('Database grounding error:', dbError.message);
            databaseInfo = "Currently unable to reach the live city database, providing general assistance.";
        }

        // Build context string
        const contextStr = userContext ? 
            `User is currently in ${userContext.city} (Lat: ${userContext.lat}, Lng: ${userContext.lng}). ` : 
            "User location is unknown.";

        // Start chat with history
        const chat = model.startChat({
            history: history || [],
            generationConfig: { maxOutputTokens: 600 },
        });

        const prompt = `
        ${contextStr}
        ${databaseInfo}
        
        User Question: ${message}
        
        CRITICAL: If database info is provided above, USE the numbers and facts from it to answer specifically. If no data was found, acknowledge that we are still mapping that area.
        `;

        const result = await chat.sendMessage(prompt);
        const response = await result.response;
        const text = response.text();

        res.json({ response: text });

    } catch (error) {
        console.error('--- Gemini Chat Error Detail ---');
        console.error('Message:', error.message);
        console.error('Stack:', error.stack);
        if (error.response) {
            console.error('Response Data:', error.response.data);
        }
        console.error('-------------------------------');

        if (error.message.includes('API_KEY_INVALID')) {
            return res.status(500).json({ 
                response: "I'm having trouble connecting to my brain right now (Invalid API Key). Please ask the administrator to check the Gemini configuration." 
            });
        }
        if (error.message.includes('quota') || error.message.includes('429')) {
          return res.status(500).json({ 
              response: "I'm a bit overwhelmed with requests right now (Quota Exceeded). Please try again in a few minutes." 
          });
        }
        if (error.message.includes('safety') || error.message.includes('blocked')) {
          return res.status(500).json({ 
              response: "I'm sorry, I cannot discuss that topic as it triggers my safety filters. Let's talk about city features instead!" 
          });
        }

        res.status(500).json({ 
            response: "Sorry, I encountered an error processing your request. (Error: " + error.message + "). Please try again later." 
        });
    }
});

module.exports = router;
