const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express(); // Move this to the top!

// 1. DATABASE CONNECTION
// Render provides the PORT, so we use process.env.PORT
const PORT = process.env.PORT || 10000; 
const MONGO_URI = process.env.MONGO_URI;

if (MONGO_URI) {
    mongoose.connect(MONGO_URI, {
        serverSelectionTimeoutMS: 5000 // Fast fail for local DNS issues
    })
    .then(() => console.log('✅ MongoDB connected successfully'))
    .catch(err => {
        console.error('❌ MongoDB connection error (Backend will stay online):');
        console.error(err.message);
    });
} else {
    console.warn('⚠️ MONGO_URI missing, database features will be disabled.');
}


// 2. MIDDLEWARE
app.use(express.json());

const allowedOrigins = [
    'https://knowyourcity-19qg.vercel.app', 
    'https://knowyourcity.vercel.app'
];

app.use(cors({
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) === -1) {
            return callback(null, true); // Set to true to avoid strict blocks during testing
        }
        return callback(null, true);
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// The modern wildcard fix for Express v5
app.options(/.*$/, cors()); 

app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// 3. ROUTES
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const mapRoutes = require('./routes/map');
const contactRoutes = require('./routes/contact');
const chatbotRoutes = require('./routes/chatbot');

// Move API routes BEFORE the root route for better matching
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/safety', mapRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/chat', chatbotRoutes);


app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Know Your City API is running!' });
});

// Root route so users don't see an error when visiting the backend URL
app.get('/', (req, res) => {
    res.send(`
        <div style="font-family: sans-serif; text-align: center; padding-top: 50px;">
            <h2>✅ Know Your City Backend API is Running!</h2>
            <p>This is the server-side application.</p>
            <p>To view the actual website, please visit: <a href="https://knowyourcity.vercel.app">knowyourcity.vercel.app</a></p>
        </div>
    `);
});


// 4. START SERVER - THE RENDER FIX
// Adding '0.0.0.0' allows Render to detect the open port
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${PORT}`);
});