const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Contact = require('../models/Contact');

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

        const users = await User.find({}, { password: 0 }).sort({ createdAt: -1 }); // Fetch all users, excluding passwords for privacy
        res.status(200).json({ 
            success: true, 
            count: users.length,
            users: users 
        });
    } catch (err) {
        res.status(500).json({ message: 'Error retrieving user list', error: err.message });
    }
});

// GET ALL FEEDBACK - RESTRICTED TO ADMIN
router.get('/feedback', async (req, res) => {
    try {
        const adminToken = req.headers['x-admin-token'];
        if (adminToken !== 'kyc_admin_authorized_session') {
            return res.status(403).json({ message: 'Access denied. Reserved for administrator only.' });
        }

        const feedbacks = await Contact.find().sort({ createdAt: -1 }); 
        res.status(200).json({ 
            success: true, 
            count: feedbacks.length,
            feedbacks: feedbacks 
        });
    } catch (err) {
// CLEAR ALL USERS - RESTRICTED TO ADMIN (DANGER ZONE)
router.post('/clear-all-users', async (req, res) => {
    try {
        const adminToken = req.headers['x-admin-token'];
        if (adminToken !== 'kyc_admin_authorized_session') {
            return res.status(403).json({ message: 'Access denied. Reserved for administrator only.' });
        }

        const result = await User.deleteMany({});
        res.status(200).json({ 
            success: true, 
            message: 'All users have been permanently deleted.',
            deletedCount: result.deletedCount 
        });
    } catch (err) {
        res.status(500).json({ message: 'Error wiping user database', error: err.message });
    }
});

module.exports = router;
