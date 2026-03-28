
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// Database Connection
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/knowyourcity';

mongoose.connect(MONGO_URI)
    .then(() => console.log('✅ MongoDB connected successfully'))
    .catch(err => console.error('❌ MongoDB connection error:', err));

// Basic Route for testing
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Know Your City API is running!' });
});

// Routes
const authRoutes = require('./routes/auth');
const mapRoutes = require('./routes/map');
const contactRoutes = require('./routes/contact');

app.use('/api/auth', authRoutes);
app.use('/api/safety', mapRoutes);
app.use('/api/contact', contactRoutes);

app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});





// const newLocal = 'https://knowyourcity-19qg.vercel.app';
// const corsOptions = {
//   // Replace this link with your ACTUAL Vercel URL from your browser address bar
//   origin: newLocal, 
//   methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
//   allowedHeaders: ['Content-Type', 'Authorization'],
//   credentials: true,
//   optionsSuccessStatus: 200
// };

// app.use(cors(corsOptions));
// // Very Important: Handle preflight requests
// app.options('*', cors(corsOptions));





app.use(cors({
    origin: ['https://knowyourcity-19qg.vercel.app', 'https://knowyourcity.vercel.app'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true
}));