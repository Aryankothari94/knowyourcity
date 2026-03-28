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
            return callback(new Error('CORS policy error'), false);
        }
        return callback(null, true);
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// FIX FOR NODE v22: Changed '*' to '(.*)' to avoid the PathError
app.options('*', cors()); // Or whatever your line 38 is doing

app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// 3. ROUTES
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

