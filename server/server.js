const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();

// 1. DATABASE CONNECTION
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

mongoose.connect(MONGO_URI)
    .then(() => console.log('✅ MongoDB connected successfully'))
    .catch(err => console.error('❌ MongoDB connection error:', err));

// 2. MIDDLEWARE (Order is critical!)
app.use(express.json());

// Set up CORS to allow your Vercel site
const allowedOrigins = [
    'https://knowyourcity-19qg.vercel.app', 
    'https://knowyourcity.vercel.app'
];

app.use(cors({
    origin: function (origin, callback) {
        // allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) === -1) {
            return callback(new Error('CORS policy: This origin is not allowed'), false);
        }
        return callback(null, true);
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Important: Handle preflight (OPTIONS) requests
app.options('*', cors());

// Logging Middleware
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// 3. ROUTES (Defined AFTER middleware)
const authRoutes = require('./routes/auth');
const mapRoutes = require('./routes/map');
const contactRoutes = require('./routes/contact');

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Know Your City API is running!' });
});

app.use('/api/auth', authRoutes);
app.use('/api/safety', mapRoutes);
app.use('/api/contact', contactRoutes);

// 4. START SERVER
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});