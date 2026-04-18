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
    systemInstruction: `You are "City Scout", a direct and efficient AI city intelligence scout for "Know Your City". 
    
    YOUR PERSONALITY:
    - Precise, helpful, and data-oriented.
    - Minimal fluff. Do not use long introductions or conclusions.
    
    STRICT OPERATIONAL RULES:
    1. REQUEST ADHERENCE: Only provide the data specifically requested by the user. If they ask for "cafes", do not provide safety stats or other city data.
    2. MANDATORY POINT FORMAT: All lists (names, places, stats) MUST be formatted as a clear bulleted list. 
    3. NO UNSOLICITED DATA: Do not mention "safety", "infrastructure", or numbers unless the user explicitly asks for them.
    4. BOLD NAMES: Always bold the names of specific places or entities using **Name**.
    5. JSON OUTPUT: Always respond in the requested JSON format.`
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
        const cityToSearch = userContext?.city || message; 
        
        try {
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
                `;
            } else {
                databaseInfo = "[DATABASE STATUS]: No live mapping data available for this city yet.";
            }
        } catch (dbError) {
            databaseInfo = "[DATABASE STATUS]: Primary database offline.";
        }

        const chat = model.startChat({
            history: history || [],
            generationConfig: { 
                maxOutputTokens: 1000, 
                temperature: 0.8 
            },
        });

        const prompt = `
        DATABASE CONTEXT:
        ${databaseInfo}

        USER REQUEST: ${message}

        RESPONSE RULES:
        1. Speak concisely. Be a direct information scout.
        2. Use bullet points for all lists. No paragraphs for data.
        3. Bold the names of places using **name**.
        4. Provide only the information asked. If asked for a list of names, provide ONLY the list of names.
        5. Do NOT include safety stats or database info unless explicitly requested.
        6. Provide 2-3 relevant "suggestions" for follow-up questions.
        7. OUTPUT FORMAT: Respond ONLY with a valid JSON object:
           {
             "response": "Your concise, point-based answer here",
             "suggestions": ["Follow-up 1", "Follow-up 2"]
           }
        `;

        const result = await chat.sendMessage(prompt);
        const response = await result.response;
        let text = response.text().trim();
        
        // Clean up potential markdown code blocks if Gemini adds them
        if (text.startsWith('```json')) text = text.replace(/^```json/, '').replace(/```$/, '');
        if (text.startsWith('```')) text = text.replace(/^```/, '').replace(/```$/, '');

        try {
            const parsed = JSON.parse(text);
            res.json(parsed);
        } catch (e) {
            // Fallback for non-JSON responses
            res.json({ response: text, suggestions: ["Tell me more about this", "Suggest safety stats", "Nearby attractions"] });
        }

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
