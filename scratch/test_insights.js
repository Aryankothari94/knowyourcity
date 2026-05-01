const express = require('express');
const app = express();
const mongoose = require('mongoose');
require('dotenv').config({ path: 'c:\\VSCODES\\know your city\\server\\.env' });

const mapRoutes = require('c:\\VSCODES\\know your city\\server\\routes\\map.js');

app.use('/api/safety', mapRoutes);

app.listen(10001, async () => {
    console.log("Test server running on port 10001");
    try {
        const res = await fetch('http://localhost:10001/api/safety/insights?lat=19.0760&lng=72.8777&city=Mumbai');
        const data = await res.json();
        console.log("Infrastructures count:", data.infrastructures.length);
        console.log("CCTVs:", data.safetyStats.cctvCount);
        console.log("Fire Stations:", data.safetyStats.fireCount);
        process.exit(0);
    } catch(e) {
        console.error(e);
        process.exit(1);
    }
});
