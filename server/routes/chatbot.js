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
    model: 'gemini-flash-latest',
    systemInstruction: `You are "City Scout", a high-precision city information specialist. 
    
    STRICT OPERATIONAL RULES:
    1. ANSWER ONLY THE USER QUERY: Do not provide any extra information, safety stats, or conversational filler unless the user specifically asks for it.
    2. EXHAUSTIVE LISTS (GENERAL QUERIES): If the user asks for a category in a city (e.g. "cafes in Ahmedabad", "schools in Delhi"), respond ONLY with an exhaustive list of NAMES. Do not provide descriptions or secondary details yet.
    3. DETAILED INFO (SPECIFIC QUERIES): If the user follows up about a SPECIFIC name from the list, then provide the full details (location, specialty, safety) for that specific spot.
    4. DATA GROUNDING: If the user explicitly asks for "safety", "stats", or "infrastructure", use the [REAL-TIME CITY SCOUT DATABASE] section from the prompt. Otherwise, ignore it.
    5. STYLE: Be extremely concise, direct, and factual.`
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
                [REAL-TIME CITY SCOUT DATABASE FOR ${cityInfo.cityName.toUpperCase()}]:
                - Police Stations: ${cityInfo.safetyStats.policeCount}
                - Hospitals: ${cityInfo.safetyStats.hospitalCount}
                - Fire Stations: ${cityInfo.safetyStats.fireCount}
                - CCTV Cameras: ${cityInfo.safetyStats.cctvCount}
                - Overall Safety Score: ${cityInfo.safetyStats.totalScore}%
                - Density: ${cityInfo.safetyStats.densityPerKm} per km
                `;
            } else {
                databaseInfo = "[DATABASE STATUS]: No live mapping data available for this specific city yet.";
            }
        } catch (dbError) {
            console.error('Database grounding error:', dbError.message);
            databaseInfo = "[DATABASE STATUS]: Unable to reach primary city stats database.";
        }

        // Build context string
        const contextStr = userContext ? 
            `User Location: ${userContext.city} (Lat: ${userContext.lat}, Lng: ${userContext.lng}). ` : 
            "User location is unknown.";

        // Start chat with history
        const chat = model.startChat({
            history: history || [],
            generationConfig: { 
                maxOutputTokens: 1000, 
                temperature: 0.7 
            },
        });

        const prompt = `
        DATABASE INFO (FOR REFERENCE):
        ${databaseInfo}

        USER QUERY: ${message}

        REPLY RULES:
        1. IF THE QUERY IS GENERAL (e.g. "cafes in Ahmedabad"): List ONLY the names of as many spots as possible.
        2. IF THE QUERY IS FOR A SPECIFIC SPOT: Give full details for THAT spot only.
        3. IF THE QUERY ASKS FOR SAFETY/STATS: Use the DATABASE INFO above.
        4. STAY STRICTLY ON TOPIC.
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
