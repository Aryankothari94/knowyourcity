const mongoose = require('mongoose');
const CrimeData = require('../server/models/CrimeData');
require('dotenv').config({ path: '../server/.env' });

async function seedCrimes() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB');

        const count = await CrimeData.countDocuments();
        if (count === 0) {
            console.log('Seeding sample crimes...');
            const samples = [
                {
                    cityName: 'Mumbai',
                    type: 'Theft',
                    severity: 'Medium',
                    location: { type: 'Point', coordinates: [72.8777, 19.0760] },
                    date: new Date()
                },
                {
                    cityName: 'Delhi',
                    type: 'Harassment',
                    severity: 'High',
                    location: { type: 'Point', coordinates: [77.2090, 28.6139] },
                    date: new Date()
                },
                {
                    cityName: 'Bangalore',
                    type: 'Snatching',
                    severity: 'Medium',
                    location: { type: 'Point', coordinates: [77.5946, 12.9716] },
                    date: new Date()
                }
            ];
            await CrimeData.insertMany(samples);
            console.log('Seeded 3 crimes.');
        } else {
            console.log(`Already have ${count} crimes.`);
        }
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

seedCrimes();
