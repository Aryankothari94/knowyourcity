const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
require('dotenv').config();

const apiKey = process.env.GEMINI_API_KEY;
let log = 'Listing all models for: ' + apiKey.substring(0, 10) + '...\n';

async function list() {
    try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
        const res = await fetch(url);
        const data = await res.json();
        
        if (data.models) {
            data.models.forEach(m => {
                log += `- ${m.name} (Quotas: ${JSON.stringify(m.supportedGenerationMethods)})\n`;
            });
        } else {
            log += 'Error: ' + JSON.stringify(data) + '\n';
        }
    } catch (e) {
        log += 'Exception: ' + e.message + '\n';
    }
    fs.writeFileSync('model_quotas.txt', log);
}

list();
