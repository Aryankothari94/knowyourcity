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
    model: 'gemini-2.0-flash',
    systemInstruction: `You are "City Scout", the premier interactive AI for 'Know Your City'. 
    Your mission is to provide deeply impactful, data-driven insights about any city or neighborhood.

    STRICT OPERATIONAL DIRECTIVES:
    1. DOMAIN SPECIFICITY: Only discuss urban features: Safety, Crime Stats, Infrastructure (Police/Hospital/Fire/CCTV), Quality of Life, and Local Recommendations.
    2. DATA GROUNDING: If city database statistics are provided below, you MUST synthesize them into your answer to prove credibility.
    3. PROACTIVE GUIDANCE: If a city is not in our database, acknowledge it and suggest how the user can use our 'Safety Explorer' or 'Crime Maps' to get real-time info.
    4. Guardrails: Refuse off-topic, vulgar, or sensitive queries with a professional redirection to city exploration.
    5. IDENTITY: You are a professional urban explorer's companion. Be authoritative yet helpful.`
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
