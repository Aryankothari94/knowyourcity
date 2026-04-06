const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);

async function test(modelName) {
    console.log(`Testing ${modelName}...`);
    try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent('Hi');
        const response = await result.response;
        console.log(`✅ ${modelName} works: ${response.text()}`);
    } catch (e) {
        console.log(`❌ ${modelName} failed: ${e.message}`);
    }
}

async function run() {
    await test('gemini-1.5-flash');
    await test('gemini-1.5-flash-latest');
    await test('gemini-flash-latest');
}

run();
