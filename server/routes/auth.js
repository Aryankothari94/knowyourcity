const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User');

// Register
router.post('/register', async (req, res) => {
    try {
        const { firstName, lastName, phone, email, dob, password } = req.body;

        // Check if user exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'Email already registered' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        
        const newUser = new User({ 
            firstName, 
            lastName, 
            phone, 
            email, 
            dob, 
            password: hashedPassword 
        });
        await newUser.save();

        res.status(201).json({ message: 'User registered successfully', user: { firstName, email } });
    } catch (err) {
        if (err.name === 'MongooseServerSelectionError' || err.message.includes('buffering')) {
            return res.status(503).json({ message: 'Registration database is temporarily unreachable. Please try again soon.' });
        }
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// Login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: 'Email does not exist. Please sign up first.' });
        }

        // Check password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid password.' });
        }

        res.status(200).json({ message: 'Login successful', user: { firstName: user.firstName, email: user.email } });
    } catch (err) {
        if (err.name === 'MongooseServerSelectionError' || err.message.includes('buffering')) {
            return res.status(503).json({ message: 'Database is currently unavailable. Please try again later.' });
        }
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

module.exports = router;
