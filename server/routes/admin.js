const express = require('express');
const router = express.Router();
const User = require('../models/User');

// ADMIN LOGIN - Hardcoded specific credentials for the admin
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Exact match as per User Request
        const ADMIN_EMAIL = 'knowyourcity000@gmail.com';
        const ADMIN_PASS = '@Jain2014';

        if (email === ADMIN_EMAIL && password === ADMIN_PASS) {
            return res.status(200).json({ 
                message: 'Admin login successful', 
                admin: { email: ADMIN_EMAIL, role: 'administrator' },
                token: 'kyc_admin_authorized_session' // Simple token for validation
            });
        }
        
        res.status(401).json({ message: 'Invalid Admin credentials.' });
    } catch (err) {
        res.status(500).json({ message: 'Server error during admin login', error: err.message });
    }
});

// GET ALL USERS - RESTRICTED TO ADMIN
router.get('/users', async (req, res) => {
    try {
        // Simple auth check from header for frontend-backend connection
        const adminToken = req.headers['x-admin-token'];
        if (adminToken !== 'kyc_admin_authorized_session') {
            return res.status(403).json({ message: 'Access denied. Reserved for administrator only.' });
        }

        const users = await User.find({}, { password: 0 }); // Fetch all users, excluding passwords for privacy
        res.status(200).json({ 
            success: true, 
            count: users.length,
            users: users 
        });
    } catch (err) {
        res.status(500).json({ message: 'Error retrieving user list', error: err.message });
    }
});

module.exports = router;
