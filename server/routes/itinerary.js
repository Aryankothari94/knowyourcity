const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const PDFDocument = require('pdfkit');
const { body, validationResult } = require('express-validator');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Gemini Model Candidates (Fallback chain to avoid 503 high demand errors)
const GEMINI_MODELS = ['gemini-1.5-flash', 'gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-flash-latest'];
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Retry Helper with Multi-Model Fallback
async function generateWithRetry(prompt) {
    let lastError = null;
    for (const modelName of GEMINI_MODELS) {
        try {
            console.log(`🤖 [Gemini] Attempting generation with model: ${modelName}`);
            const m = genAI.getGenerativeModel({ model: modelName });
            const result = await m.generateContent(prompt);
            const response = await result.response;
            const text = response.text().trim();
            if (text) return text;
        } catch (err) {
            console.warn(`⚠️ [Gemini] Model ${modelName} failed:`, err.message);
            lastError = err;
        }
    }
    throw lastError || new Error("All Gemini model endpoints are currently undergoing high demand.");
}

// ─── COMPREHENSIVE CITY LANDMARK DATABASE ───
const CITY_LANDMARKS_DB = {
    pune: [
        { name: "Shaniwar Wada Fort", desc: "Historic 18th-century fortification of the Peshwas in Pune. Stunning light & sound show at night.", safety: 98, cost: "₹25", imgTag: "shaniwar wada fort pune" },
        { name: "Aga Khan Palace", desc: "Majestic palace with deep historical significance and serene gardens. Gandhi memorial inside.", safety: 99, cost: "₹25", imgTag: "aga khan palace pune" },
        { name: "Sinhagad Fort", desc: "Ancient hill fortress offering breathtaking mountain views and famous local pitla bhakri.", safety: 96, cost: "₹50", imgTag: "sinhagad fort pune trekking" },
        { name: "Dagadusheth Halwai Ganpati Temple", desc: "Iconic Hindu temple visited by thousands of devotees daily in central Pune.", safety: 98, cost: "Free", imgTag: "dagadusheth ganpati temple pune" },
        { name: "Raja Dinkar Kelkar Museum", desc: "Unique museum showcasing over 20,000 rare Indian artifacts and instruments.", safety: 97, cost: "₹100", imgTag: "kelkar museum pune artifacts" },
        { name: "Osho Teerth Park", desc: "Lush zen garden perfect for morning walks. Adjacent to the famous Osho Ashram.", safety: 98, cost: "₹200", imgTag: "osho teerth park pune garden" },
        { name: "Pataleshwar Cave Temple", desc: "8th-century rock-cut cave temple dedicated to Lord Shiva in the heart of Pune.", safety: 97, cost: "Free", imgTag: "pataleshwar cave temple pune rock" },
        { name: "FC Road Food Street", desc: "Vibrant avenue lined with popular cafes, street food joints, and apparel stores.", safety: 95, cost: "₹300", imgTag: "FC road pune food street" },
        { name: "Saras Baug Garden", desc: "Beautiful manicured park surrounding an island Ganpati temple near Parvati Hill.", safety: 98, cost: "Free", imgTag: "saras baug pune garden temple" },
        { name: "Parvati Hill Temple", desc: "18th century Peshwa-era temple complex atop Parvati Hill offering panoramic city views.", safety: 97, cost: "Free", imgTag: "parvati hill temple pune" },
        { name: "Vetal Tekdi Hill Reserve", desc: "Highest hill point in Pune offering lush greenery and sunset panoramas.", safety: 96, cost: "Free", imgTag: "vetal tekdi hill pune sunset" },
        { name: "National War Museum Pune", desc: "Prestigious military museum displaying fighter jets, tanks, and Indian Army artifacts.", safety: 99, cost: "₹20", imgTag: "national war museum pune" }
    ],
    mumbai: [
        { name: "Gateway of India", desc: "Monumental arch overlooking the Arabian Sea built during the British Raj in 1924.", safety: 99, cost: "Free", imgTag: "gateway of india mumbai" },
        { name: "Marine Drive Promenade", desc: "Iconic 3.6 km Queen's Necklace coastal promenade, stunning at dusk and night.", safety: 99, cost: "Free", imgTag: "marine drive mumbai night" },
        { name: "Chhatrapati Shivaji Maharaj Vastu Sangrahalaya", desc: "Mumbai's premier art and history museum in stunning Indo-Saracenic architecture.", safety: 98, cost: "₹150", imgTag: "chhatrapati shivaji museum mumbai" },
        { name: "Elephanta Caves", desc: "UNESCO World Heritage rock-cut cave temples dedicated to Shiva on Elephanta Island.", safety: 97, cost: "₹260", imgTag: "elephanta caves mumbai" },
        { name: "Colaba Causeway Market", desc: "Bustling market street famous for antiques, fashion, souvenirs and heritage cafes.", safety: 95, cost: "₹500", imgTag: "colaba causeway mumbai market" },
        { name: "Chhatrapati Shivaji Terminus (CSMT)", desc: "UNESCO-listed Gothic revival heritage railway station magnificently lit at night.", safety: 98, cost: "Free", imgTag: "CSMT railway station mumbai heritage" },
        { name: "Juhu Beach", desc: "Mumbai's famous sunset beach known for street food, pav bhaji stalls and sea breeze.", safety: 94, cost: "₹200", imgTag: "juhu beach mumbai sunset" },
        { name: "Bandra Fort & Bandstand", desc: "Portuguese fort ruins offering scenic views of the Bandra-Worli Sea Link.", safety: 96, cost: "Free", imgTag: "bandra fort mumbai sea link" },
        { name: "Siddhivinayak Temple", desc: "Revered 18th-century temple dedicated to Lord Ganesha in Prabhadevi.", safety: 99, cost: "Free", imgTag: "siddhivinayak temple mumbai" },
        { name: "Haji Ali Dargah", desc: "Iconic 15th-century mosque and dargah built on a tidal islet in the Arabian Sea.", safety: 97, cost: "Free", imgTag: "haji ali dargah mumbai sea" }
    ],
    delhi: [
        { name: "Red Fort (Lal Qila)", desc: "Historic Mughal fortress built with red sandstone in Old Delhi, a UNESCO World Heritage Site.", safety: 97, cost: "₹50", imgTag: "red fort delhi" },
        { name: "Qutub Minar", desc: "UNESCO World Heritage site featuring the world's tallest brick minaret.", safety: 98, cost: "₹50", imgTag: "qutub minar delhi" },
        { name: "Humayun's Tomb", desc: "Garden tomb of Mughal Emperor Humayun, architectural precursor to the Taj Mahal.", safety: 98, cost: "₹50", imgTag: "humayun tomb delhi garden" },
        { name: "India Gate", desc: "War memorial archway honoring 70,000 soldiers, surrounded by vast green lawns.", safety: 99, cost: "Free", imgTag: "india gate delhi" },
        { name: "Chandni Chowk", desc: "Historic bustling market famous for street food delicacies, spices and heritage haveli.", safety: 93, cost: "₹300", imgTag: "chandni chowk delhi market street" },
        { name: "Lotus Temple", desc: "Famous lotus-shaped marble Baha'i temple for silent meditation and peace.", safety: 99, cost: "Free", imgTag: "lotus temple delhi" },
        { name: "Lodhi Garden", desc: "Lush 90-acre city park containing 15th-century Sayyid and Lodi dynasty tombs.", safety: 98, cost: "Free", imgTag: "lodhi garden delhi tombs" },
        { name: "Akshardham Temple", desc: "Sprawling Hindu temple complex with traditional Indian art, culture and boat ride.", safety: 99, cost: "₹250", imgTag: "akshardham temple delhi" },
        { name: "Jama Masjid Old Delhi", desc: "One of India's largest mosques, built by Shah Jahan with stunning minarets.", safety: 95, cost: "Free", imgTag: "jama masjid delhi mosque" },
        { name: "National Museum New Delhi", desc: "India's premier museum housing over 2 lakh artifacts spanning 5000 years of history.", safety: 98, cost: "₹20", imgTag: "national museum new delhi" }
    ],
    matheran: [
        { name: "Echo Point Matheran", desc: "Spectacular viewpoint with a natural echo effect and panoramic valleys below.", safety: 96, cost: "Free", imgTag: "echo point matheran view valley" },
        { name: "Panorama Point (Sunset Point)", desc: "The most popular sunset viewpoint in Matheran offering a 360° view of the Sahyadri mountains.", safety: 97, cost: "Free", imgTag: "panorama point matheran sunset hills" },
        { name: "One Tree Hill Point", desc: "Peaceful hilltop with a lone tree offering beautiful valley vistas and cool breeze.", safety: 95, cost: "Free", imgTag: "one tree hill matheran viewpoint" },
        { name: "Charlotte Lake", desc: "Serene picturesque lake inside the forest, primary water source of Matheran. Ideal for nature walks.", safety: 96, cost: "Free", imgTag: "charlotte lake matheran forest" },
        { name: "Toy Train Neral-Matheran", desc: "UNESCO-listed heritage narrow gauge toy train journey through scenic Sahyadri forests.", safety: 99, cost: "₹250", imgTag: "neral matheran toy train heritage" },
        { name: "Louisa Point", desc: "Dramatic cliff-edge viewpoint offering a spectacular view of the Prabal Fort and plains.", safety: 94, cost: "Free", imgTag: "louisa point matheran cliff view" },
        { name: "Alexander Point", desc: "Popular sunrise viewpoint on the edge of a forested cliff overlooking Neral and the plains.", safety: 95, cost: "Free", imgTag: "alexander point matheran sunrise" },
        { name: "Hart Point", desc: "Secluded and scenic view point with lush green forest surroundings and breezy atmosphere.", safety: 95, cost: "Free", imgTag: "hart point matheran forest hill" },
        { name: "Porcupine Point (Marjorie Point)", desc: "Western-facing viewpoint perfect for spotting distant plains, villages and Prabal Fort.", safety: 94, cost: "Free", imgTag: "porcupine point matheran sahyadri" },
        { name: "Chowk Point Matheran", desc: "Central market area offering local street food, chikki, and Matheran's famous red soil souvenirs.", safety: 97, cost: "₹200", imgTag: "matheran market red soil chikki" },
        { name: "Rambagh Point", desc: "Elevated red-mud trail viewpoint with breathtaking views of the Ulhas valley.", safety: 93, cost: "Free", imgTag: "rambagh point matheran trail view" },
        { name: "Lord Point", desc: "Scenic viewpoint offering glimpses of the surrounding valley farms, forests and plains.", safety: 94, cost: "Free", imgTag: "matheran hill station viewpoint nature" }
    ],
    lonavala: [
        { name: "Bhushi Dam", desc: "Popular dam with cascading waterfalls during monsoon. Great for families and nature lovers.", safety: 92, cost: "Free", imgTag: "bhushi dam lonavala waterfall" },
        { name: "Tiger's Leap (Waghdari)", desc: "Dramatic cliff viewpoint shaped like a leaping tiger overlooking the valley.", safety: 94, cost: "Free", imgTag: "tigers leap lonavala cliff" },
        { name: "Lonavala Lake", desc: "Tranquil lake ideal for evening strolls, photography, and picnics with family.", safety: 97, cost: "Free", imgTag: "lonavala lake tranquil" },
        { name: "Rajmachi Fort Trek", desc: "Historic twin-peaked Shrivardhan and Manaranjan forts, popular monsoon trekking destination.", safety: 93, cost: "₹50", imgTag: "rajmachi fort trek lonavala" },
        { name: "Karla Caves", desc: "Ancient Buddhist rock-cut caves dating to the 2nd century BC with stunning architecture.", safety: 97, cost: "₹25", imgTag: "karla caves buddhist lonavala" },
        { name: "Imagica Theme Park", desc: "India's top amusement park with rides, shows, and snow world near Khopoli.", safety: 99, cost: "₹1,200", imgTag: "imagica theme park lonavala" },
        { name: "Lohagad Fort", desc: "Water fort with sweeping views of Pawna Lake, famous for its vinchugad bastion.", safety: 95, cost: "₹25", imgTag: "lohagad fort pune lonavala" }
    ],
    shimla: [
        { name: "The Ridge Shimla", desc: "Open space in the heart of Shimla offering spectacular views of snow-clad mountains.", safety: 99, cost: "Free", imgTag: "the ridge shimla mall road" },
        { name: "Mall Road Shimla", desc: "Vibrant promenade lined with shops, cafes, and colonial-era buildings in the heart of Shimla.", safety: 99, cost: "₹300", imgTag: "mall road shimla colonial" },
        { name: "Jakhu Temple & Ropeway", desc: "Ancient Hanuman temple atop Jakhu Hill at 2455m with panoramic Himalayan views.", safety: 97, cost: "₹150", imgTag: "jakhu temple shimla himalayan view" },
        { name: "Christ Church Shimla", desc: "Second oldest church in North India, neo-Gothic architecture landmark on The Ridge.", safety: 99, cost: "Free", imgTag: "christ church shimla colonial" },
        { name: "Kufri Hill Station", desc: "Scenic hill resort 16km from Shimla famous for skiing, horse riding and Himalayan views.", safety: 97, cost: "₹400", imgTag: "kufri hills shimla skiing" },
        { name: "Toy Train Kalka-Shimla", desc: "UNESCO Heritage narrow gauge railway offering stunning mountain valley views.", safety: 99, cost: "₹350", imgTag: "kalka shimla toy train mountain" },
        { name: "Viceregal Lodge", desc: "Heritage Rashtrapati Niwas — a magnificent Tudor-revival mansion set in Himalayan greenery.", safety: 99, cost: "₹50", imgTag: "viceregal lodge shimla himalayan" }
    ],
    jaipur: [
        { name: "Amber Fort", desc: "Magnificent Rajput fort in amber sandstone with stunning palaces, halls, and mirror chambers.", safety: 98, cost: "₹200", imgTag: "amber fort jaipur rajasthan" },
        { name: "City Palace Jaipur", desc: "A complex of palaces, gardens and courtyards in the heart of Jaipur's old city.", safety: 98, cost: "₹200", imgTag: "city palace jaipur" },
        { name: "Hawa Mahal", desc: "Iconic Palace of Winds with 953 windows built for royal women to observe street life.", safety: 97, cost: "₹50", imgTag: "hawa mahal jaipur pink city" },
        { name: "Jal Mahal Water Palace", desc: "Stunning palace floating in the middle of Man Sagar Lake — a photographers dream.", safety: 98, cost: "Free (view)", imgTag: "jal mahal jaipur lake palace" },
        { name: "Nahargarh Fort", desc: "Hilltop fort offering breathtaking night views of Jaipur city. Famous for the wax museum.", safety: 97, cost: "₹50", imgTag: "nahargarh fort jaipur hilltop" },
        { name: "Jantar Mantar Observatory", desc: "UNESCO World Heritage astronomical observatory with the world's largest stone sundial.", safety: 98, cost: "₹50", imgTag: "jantar mantar jaipur observatory" },
        { name: "Johari Bazaar", desc: "Vibrant gem market famous for precious stones, Rajasthani jewelry and traditional attire.", safety: 95, cost: "₹500", imgTag: "johari bazaar jaipur jewelry market" }
    ],
    goa: [
        { name: "Calangute Beach", desc: "Goa's largest and most famous beach known for water sports, shacks and vibrant nightlife.", safety: 93, cost: "Free", imgTag: "calangute beach goa sunset" },
        { name: "Basilica of Bom Jesus", desc: "UNESCO World Heritage church housing the mortal remains of St. Francis Xavier.", safety: 99, cost: "Free", imgTag: "basilica bom jesus goa church" },
        { name: "Fort Aguada", desc: "Well-preserved Portuguese fort and lighthouse built in 1612 overlooking the Arabian Sea.", safety: 97, cost: "₹50", imgTag: "fort aguada goa lighthouse" },
        { name: "Dudhsagar Waterfalls", desc: "One of India's tallest waterfalls cascading 310 meters through dense forest. Breathtaking.", safety: 90, cost: "₹400", imgTag: "dudhsagar waterfall goa" },
        { name: "Anjuna Flea Market", desc: "Famous Wednesday flea market offering hippie culture, antiques, clothes and handicrafts.", safety: 94, cost: "₹200", imgTag: "anjuna flea market goa" },
        { name: "Palolem Beach", desc: "Serene crescent-shaped beach in South Goa with calm blue waters and wooden shacks.", safety: 96, cost: "Free", imgTag: "palolem beach south goa" },
        { name: "Spice Plantation Tour", desc: "Guided tour through Goa's rich spice plantations with authentic Goan lunch experience.", safety: 99, cost: "₹600", imgTag: "goa spice plantation tour" }
    ],
    agra: [
        { name: "Taj Mahal", desc: "The world's most iconic monument — a UNESCO World Heritage white marble mausoleum by Shah Jahan.", safety: 97, cost: "₹1,100", imgTag: "taj mahal agra sunrise" },
        { name: "Agra Fort", desc: "Mighty UNESCO-listed red sandstone Mughal fort, holding palaces, mosques and Diwan-i-Khas.", safety: 97, cost: "₹50", imgTag: "agra fort red sandstone mughal" },
        { name: "Fatehpur Sikri", desc: "Abandoned Mughal capital city 40km from Agra with stunning Panch Mahal and Buland Darwaza.", safety: 96, cost: "₹50", imgTag: "fatehpur sikri abandoned city mughal" },
        { name: "Itimad-ud-Daulah Tomb (Baby Taj)", desc: "First Mughal building fully built in marble — considered the draft for the Taj Mahal.", safety: 97, cost: "₹50", imgTag: "itimad-ud-daulah baby taj agra" },
        { name: "Mehtab Bagh Moonlight Garden", desc: "Garden across the Yamuna offering the best full-moon reflection view of the Taj Mahal.", safety: 96, cost: "₹25", imgTag: "mehtab bagh garden agra taj view" }
    ],
    varanasi: [
        { name: "Dashashwamedh Ghat Ganga Aarti", desc: "Most important ghat in Varanasi, famous for the spectacular daily Ganga Aarti at dusk.", safety: 95, cost: "Free", imgTag: "dashashwamedh ghat varanasi aarti" },
        { name: "Kashi Vishwanath Temple", desc: "One of the twelve Jyotirlingas — most sacred Hindu temple dedicated to Lord Shiva.", safety: 94, cost: "Free", imgTag: "kashi vishwanath temple varanasi" },
        { name: "Sarnath Deer Park", desc: "Buddhist pilgrimage site where Gautam Buddha delivered his first sermon after enlightenment.", safety: 97, cost: "₹25", imgTag: "sarnath stupa varanasi buddhist" },
        { name: "Manikarnika Ghat", desc: "Sacred burning ghat on the banks of Ganges, believed to offer moksha to those cremated here.", safety: 93, cost: "Free", imgTag: "manikarnika ghat varanasi river" },
        { name: "Boat Ride on River Ganga", desc: "Serene sunrise boat ride on the holy Ganges past dozens of ancient ghats and temples.", safety: 96, cost: "₹200", imgTag: "ganga river varanasi boat sunrise" },
        { name: "Ramnagar Fort Museum", desc: "18th-century sandstone fort of Banaras kings converted into museum with royal artifacts.", safety: 96, cost: "₹25", imgTag: "ramnagar fort varanasi museum" }
    ],
    udaipur: [
        { name: "City Palace Udaipur", desc: "Largest palace in Rajasthan built over 400 years with stunning lake and mountain backdrop.", safety: 98, cost: "₹300", imgTag: "city palace udaipur rajasthan lake" },
        { name: "Lake Pichola Boat Ride", desc: "Romantic boat ride on the gorgeous lake with views of palaces, temples and the Aravalli hills.", safety: 97, cost: "₹400", imgTag: "lake pichola udaipur boat ride" },
        { name: "Jag Mandir Island Palace", desc: "Stunning island palace in Lake Pichola — used as inspiration for the Taj Mahal.", safety: 98, cost: "₹400", imgTag: "jag mandir island palace udaipur" },
        { name: "Jagdish Temple", desc: "17th-century Hindu temple to Lord Vishnu with beautiful carved pillars and elephant sculptures.", safety: 97, cost: "Free", imgTag: "jagdish temple udaipur carved" },
        { name: "Saheliyon-ki-Bari", desc: "Garden of the Maidens — beautiful fountain gardens built for the royal ladies of Udaipur.", safety: 98, cost: "₹50", imgTag: "saheliyon ki bari garden udaipur" },
        { name: "Vintage Car Museum", desc: "Stunning collection of vintage Rolls Royces and royal automobiles of Mewar kings.", safety: 99, cost: "₹250", imgTag: "vintage car museum udaipur rolls royce" }
    ],
    kochi: [
        { name: "Chinese Fishing Nets Fort Kochi", desc: "Iconic large cantilevered Chinese fishing nets at sunset — a symbol of Kerala's heritage.", safety: 97, cost: "Free", imgTag: "chinese fishing nets fort kochi sunset" },
        { name: "Mattancherry Dutch Palace", desc: "Portuguese-built palace with stunning Kerala murals depicting Ramayana scenes.", safety: 97, cost: "₹5", imgTag: "mattancherry palace kochi kerala" },
        { name: "Paradesi Synagogue Jew Town", desc: "Oldest active synagogue in the Commonwealth (1568 AD) with hand-painted Chinese tiles.", safety: 98, cost: "₹5", imgTag: "paradesi synagogue kochi jew town" },
        { name: "Kathakali Performance", desc: "Traditional Kerala classical dance performance with elaborate face paint and costumes.", safety: 99, cost: "₹300", imgTag: "kathakali performance kerala dance" },
        { name: "Cherai Beach", desc: "Pristine beach 25km from Kochi where backwaters meet the sea, great for dolphin spotting.", safety: 96, cost: "Free", imgTag: "cherai beach kochi backwaters" },
        { name: "Kerala Folklore Museum", desc: "Seven-storey heritage museum showcasing 5000 rare artifacts from different eras of Kerala.", safety: 99, cost: "₹150", imgTag: "kerala folklore museum kochi" }
    ],
    mahabaleshwar: [
        { name: "Arthur's Seat Viewpoint", desc: "Spectacular cliff-edge viewpoint offering a breathtaking view of the Konkan coast below.", safety: 95, cost: "Free", imgTag: "arthurs seat mahabaleshwar cliff view" },
        { name: "Venna Lake Boating", desc: "Scenic artificial lake offering boat rides, horse rides and strawberry picking nearby.", safety: 97, cost: "₹150", imgTag: "venna lake mahabaleshwar boating" },
        { name: "Elephant's Head Point", desc: "Viewpoint resembling an elephant's trunk and head, offering deep valley views.", safety: 94, cost: "Free", imgTag: "elephants head point mahabaleshwar" },
        { name: "Mapro Garden Strawberry Farm", desc: "Famous strawberry and food products farm with fresh strawberry picking and jams.", safety: 98, cost: "₹200", imgTag: "mapro garden strawberry mahabaleshwar" },
        { name: "Panchgani Table Land", desc: "Second-highest plateau in Asia offering horse riding, views, and local street food.", safety: 96, cost: "₹100", imgTag: "panchgani tableland plateau viewpoint" },
        { name: "Old Mahabaleshwar Kshetra", desc: "Ancient temples complex with Panchganga Temple where five rivers originate in the Sahyadris.", safety: 98, cost: "Free", imgTag: "panchganga temple mahabaleshwar ancient" }
    ],
    bengaluru: [
        { name: "Bengaluru Palace", desc: "Tudor-style royal residence with intricate wood carvings and lush palace grounds.", safety: 98, cost: "₹250", imgTag: "bengaluru palace tudor" },
        { name: "Cubbon Park", desc: "300-acre green lung of Bangalore filled with bamboo groves and heritage buildings.", safety: 98, cost: "Free", imgTag: "cubbon park bangalore greenery" },
        { name: "Lalbagh Botanical Garden", desc: "Historic 240-acre garden home to 1,000+ flora species and famous flower shows.", safety: 98, cost: "₹30", imgTag: "lalbagh botanical garden bangalore flowers" },
        { name: "Tipu Sultan's Summer Palace", desc: "Teakwood palace showcasing Indo-Islamic architecture in Chamarajpet.", safety: 96, cost: "₹20", imgTag: "tipu sultan palace bangalore" },
        { name: "ISKCON Temple Bangalore", desc: "Magnificent spiritual complex with stunning architecture and serene atmosphere.", safety: 99, cost: "Free", imgTag: "iskcon temple bangalore" },
        { name: "Nandi Hills Sunrise", desc: "Ancient hill fortress 60km outside Bangalore offering magical sunrise above the clouds.", safety: 95, cost: "₹50", imgTag: "nandi hills bangalore sunrise" },
        { name: "Commercial Street", desc: "Bustling retail hub packed with fashion outlets, handicraft stores, and cafes.", safety: 96, cost: "₹400", imgTag: "commercial street bangalore market" }
    ]
};

// ── Smart Local Itinerary Generator (Server-side Fallback) ──
function generateSmartFallbackItinerary(city, duration = 3, budget = 'Medium', interests = []) {
    const totalDays = parseInt(duration) || 3;
    const cityKey = city.toLowerCase().trim().split(',')[0].trim();
    const knownLandmarks = CITY_LANDMARKS_DB[cityKey] || null;
    const days = [];

    const timeSlots = ["08:30 AM", "10:30 AM", "12:30 PM", "02:30 PM", "04:30 PM", "07:00 PM"];

    if (knownLandmarks && knownLandmarks.length >= 4) {
        let pool = [...knownLandmarks];
        for (let d = 1; d <= totalDays; d++) {
            const activities = [];
            const slotsCount = Math.min(totalDays <= 2 ? 5 : 4, pool.length);
            for (let i = 0; i < slotsCount; i++) {
                if (pool.length === 0) pool = [...knownLandmarks];
                const place = pool.shift();
                activities.push({
                    time: timeSlots[i],
                    place: place.name,
                    description: place.desc,
                    costEstimate: place.cost,
                    safetyScore: place.safety,
                    imgTag: place.imgTag
                });
            }
            days.push({ dayNumber: d, activities });
        }
    } else {
        // Dynamic for unknown city
        const categories = [
            { suffix: "Famous Hilltop Viewpoint", desc: `Catch breathtaking panoramic views of ${city} and surrounding landscapes from the hilltop.`, safety: 96, cost: "Free" },
            { suffix: "Historic Fort & Monument", desc: `Explore the ancient fortifications, heritage structures, and rich historical legacy of ${city}.`, safety: 98, cost: "₹100" },
            { suffix: "Nature Trail & Forest Walk", desc: `Trek through scenic forest trails and natural reserves in ${city}.`, safety: 95, cost: "Free" },
            { suffix: "Local Cuisine & Street Food Market", desc: `Taste authentic local dishes, regional snacks, and famous street food of ${city}.`, safety: 95, cost: budget === 'High' ? '₹1,500' : '₹300' },
            { suffix: "Sacred Temple & Spiritual Site", desc: `Visit renowned temples and spiritual sites that hold cultural importance in ${city}.`, safety: 97, cost: "Free" },
            { suffix: "Scenic Lake or Waterfall", desc: `Relax by a beautiful lake or cascade in the natural surroundings of ${city}.`, safety: 94, cost: "₹50" }
        ];

        for (let d = 1; d <= totalDays; d++) {
            const activities = [];
            const slotsCount = 4;
            for (let i = 0; i < slotsCount; i++) {
                const c = categories[(d - 1 + i) % categories.length];
                activities.push({
                    time: timeSlots[i],
                    place: `${city} ${c.suffix}`,
                    description: c.desc,
                    costEstimate: c.cost,
                    safetyScore: c.safety,
                    imgTag: `${city} tourism landscape`
                });
            }
            days.push({ dayNumber: d, activities });
        }
    }

    return {
        city: city,
        summary: `A complete ${totalDays}-day travel plan for ${city}. Covers all major attractions, viewpoints, heritage sites, and local cuisine with high safety ratings and optimized daily routes.`,
        totalDays: totalDays,
        days: days
    };
}

// Route: POST /api/itinerary/generate
router.post('/generate', async (req, res) => {
    const {
        city, duration, budget, interests,
        travelMode, timeAvailability, safetyPreference, pace
    } = req.body;

    if (!city) return res.status(400).json({ status: 'error', message: 'City is required' });

    // Check if we have the city in our database (quick return for known cities)
    const cityKey = city.toLowerCase().trim().split(',')[0].trim();
    if (CITY_LANDMARKS_DB[cityKey]) {
        console.log(`✅ [Itinerary] Found ${city} in local landmark DB. Using verified data.`);
        const fallbackData = generateSmartFallbackItinerary(city, duration, budget, interests);
        return res.json({ status: 'success', data: fallbackData });
    }

    try {
        const prompt = `
        Generate a highly detailed, accurate, and completely unique city itinerary for **${city}**.
        
        USER INPUTS:
        - Duration: ${duration} Days
        - Budget: ${budget}
        - Interests: ${Array.isArray(interests) ? interests.join(', ') : interests}
        - Travel Mode: ${travelMode}
        - Time Availability: ${timeAvailability}
        - Safety Preference: ${safetyPreference}
        - Pace: ${pace}

        CRITICAL INSTRUCTIONS:
        1. Every "place" MUST be a REAL, famous, SPECIFIC named landmark, viewpoint, fort, temple, beach, waterfall, lake, or market in ${city}.
        2. DO NOT use vague/generic names. Use EXACT real place names like "Echo Point", "Charlotte Lake", "Toy Train Neral-Matheran" for hill stations.
        3. DO NOT repeat any place across different days. Every day MUST cover completely different areas and attractions.
        4. Cover ALL types of major tourist attractions: natural viewpoints, heritage sites, adventure spots, food areas, spiritual sites.
        5. Each activity must include: "time", "place" (real specific name), "description" (3-5 sentences), "costEstimate", "safetyScore" (90-99), and "imgTag" (a precise 3-5 word Google search query that would return the EXACT real photo of this place).
        6. If the city is a hill station, focus on viewpoints, nature trails, lakes, waterfalls, toy trains, local markets.
        7. Respond ONLY with valid JSON — no markdown, no extra text.
        
        OUTPUT FORMAT:
        {
          "city": "${city}",
          "summary": "...",
          "totalDays": ${duration},
          "days": [
            {
              "dayNumber": 1,
              "activities": [
                { "time": "09:00 AM", "place": "Real Specific Place Name", "description": "...", "costEstimate": "...", "safetyScore": 96, "imgTag": "specific place name city" }
              ]
            }
          ]
        }
        `;

        let text = await generateWithRetry(prompt);

        // Clean markdown wrapper
        if (text.startsWith('```json')) text = text.replace(/^```json/, '').replace(/```$/, '');
        else if (text.startsWith('```')) text = text.replace(/^```/, '').replace(/```$/, '');

        const startIdx = text.indexOf('{');
        const endIdx = text.lastIndexOf('}');
        if (startIdx !== -1 && endIdx !== -1) {
            const cleaned = text.substring(startIdx, endIdx + 1);
            const itinerary = JSON.parse(cleaned);
            return res.json({ status: 'success', data: itinerary });
        }
        throw new Error('AI returned an invalid format');

    } catch (err) {
        console.warn('⚠️ [Itinerary Generator] AI model failed. Activating Smart Local Fallback:', err.message);
        const fallbackData = generateSmartFallbackItinerary(city, duration, budget, interests);
        return res.json({ status: 'success', data: fallbackData, note: 'Generated via Smart City Engine' });
    }
});

// Route: POST /api/itinerary/send-email
router.post('/send-email', [
    body('email').isEmail().normalizeEmail(),
    body('itineraryData').notEmpty(),
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ status: 'error', message: 'Invalid email address' });
    }

    const { email, itineraryData, message } = req.body;

    try {
        const doc = new PDFDocument({ margin: 50 });
        let buffers = [];
        doc.on('data', buffers.push.bind(buffers));

        return new Promise((resolve, reject) => {
            doc.on('end', async () => {
                const pdfBuffer = Buffer.concat(buffers);

                const transporter = nodemailer.createTransport({
                    host: 'smtp.gmail.com',
                    port: 587,
                    secure: false,
                    auth: {
                        user: process.env.EMAIL_USER,
                        pass: process.env.EMAIL_PASS
                    },
                    tls: { rejectUnauthorized: false }
                });

                const emailHtml = `
                    <div style="font-family: 'Segoe UI', sans-serif; color: #333; max-width: 700px; margin: 0 auto; border: 1px solid #ddd; border-radius: 12px; overflow: hidden;">
                        <div style="background: #0f172a; padding: 30px; text-align: center; color: white;">
                            <h1 style="margin: 0; color: #00e5ff;">🗺️ Your Smart Itinerary</h1>
                            <p style="margin: 10px 0 0; opacity: 0.8; font-size: 1.1rem;">Exploration Guide for <strong>${itineraryData.city}</strong></p>
                        </div>
                        <div style="padding: 30px; line-height: 1.6;">
                            <p>Hi there,</p>
                            <p>We've crafted a special travel plan just for you. Here's your complete adventure guide!</p>
                            <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 5px solid #00e5ff;">
                                <h3 style="margin-top: 0; color: #0f172a;">Plan Overview</h3>
                                <p style="margin: 0;">${itineraryData.summary}</p>
                            </div>
                            ${message ? `<div style="padding: 15px; background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; font-style: italic; margin-bottom: 25px;">"${message}"</div>` : ''}
                            ${itineraryData.days.map(day => `
                                <div style="margin-bottom: 30px;">
                                    <h2 style="color: #00e5ff; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">Day ${day.dayNumber}</h2>
                                    ${day.activities.map(act => `
                                        <div style="margin-bottom: 15px; padding-left: 15px; border-left: 2px solid #cbd5e1;">
                                            <div style="font-weight: bold; font-size: 1rem;">
                                                <span style="color: #64748b;">${act.time}</span> &mdash; ${act.place}
                                            </div>
                                            <div style="color: #475569; font-size: 0.9rem; margin: 4px 0;">${act.description}</div>
                                            <div style="font-size: 0.8rem; color: #94a3b8;">
                                                💰 Cost: ${act.costEstimate} | 🛡️ Safety Score: ${act.safetyScore}%
                                            </div>
                                        </div>
                                    `).join('')}
                                </div>
                            `).join('')}
                            <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee;">
                                <a href="https://knowyourcitys.in" style="display: inline-block; padding: 12px 25px; background: #00e5ff; color: #000; text-decoration: none; border-radius: 30px; font-weight: bold;">Explore More on Know Your City</a>
                            </div>
                        </div>
                        <div style="background: #f1f5f9; padding: 20px; text-align: center; font-size: 0.8rem; color: #64748b;">
                            <p style="margin: 0;">&copy; 2026 KnowYourCitys.in | Built for Smart Travelers 🚀</p>
                        </div>
                    </div>
                `;

                const mailOptions = {
                    from: '"Know Your City" <' + process.env.EMAIL_USER + '>',
                    to: email,
                    subject: `Your Personalized ${itineraryData.city} Itinerary 🏙️`,
                    html: emailHtml,
                    attachments: [{ filename: 'itinerary.pdf', content: pdfBuffer }]
                };

                try {
                    await transporter.sendMail(mailOptions);
                    res.json({ status: 'success', message: 'Email sent successfully' });
                    resolve();
                } catch (err) {
                    console.error('Email send error:', err);
                    res.status(500).json({ status: 'error', message: 'Failed to send email' });
                    reject(err);
                }
            });

            // PDF GENERATION
            doc.rect(0, 0, doc.page.width, 110).fill('#0f172a');
            doc.fillColor('#00e5ff').fontSize(24).font('Helvetica-Bold').text('🏙️ KNOW YOUR CITY', 50, 32);
            doc.fillColor('#ffffff').fontSize(14).font('Helvetica-Bold').text(`Smart Itinerary Guide: ${itineraryData.city}`, 50, 62);
            doc.fillColor('#94a3b8').fontSize(9).font('Helvetica').text(`Total Duration: ${itineraryData.totalDays} Days • Safe Neighborhood Exploration`, 50, 82);
            doc.moveDown(4);

            doc.rect(50, 130, doc.page.width - 100, 50).fillAndStroke('#f8fafc', '#00e5ff');
            doc.fillColor('#0f172a').fontSize(10).font('Helvetica-Bold').text('Trip Summary:', 62, 140);
            doc.fillColor('#334155').fontSize(9.5).font('Helvetica').text(itineraryData.summary, 62, 154, { width: doc.page.width - 124, align: 'left' });
            doc.y = 195;

            itineraryData.days.forEach(day => {
                if (doc.y > 640) doc.addPage();
                doc.fillColor('#00e5ff').fontSize(16).font('Helvetica-Bold').text(`🚩 DAY ${day.dayNumber} — PLACES TO VISIT`);
                doc.rect(50, doc.y + 2, doc.page.width - 100, 2).fill('#00e5ff');
                doc.moveDown(1);

                day.activities.forEach(act => {
                    if (doc.y > 670) doc.addPage();
                    doc.fillColor('#0f172a').fontSize(11).font('Helvetica-Bold').text(`⏰ ${act.time}  |  📍 ${act.place}`);
                    doc.fillColor('#475569').font('Helvetica').fontSize(9.5).text(act.description, { indent: 12, align: 'left', width: doc.page.width - 124 });
                    doc.fillColor('#00e676').font('Helvetica-Bold').fontSize(8.5).text(`🛡️ Safety Score: ${act.safetyScore}%  •  💰 Est. Cost: ${act.costEstimate}`, { indent: 12 });
                    doc.moveDown(1.1);
                });
                doc.moveDown(0.8);
            });

            if (doc.y > 690) doc.addPage();
            doc.moveDown(2);
            doc.fontSize(9).fillColor('#64748b').text('Generated by Know Your City (knowyourcitys.in)', { align: 'center' });
            doc.text('Built for Smart & Safe Travelers 🚀', { align: 'center' });
            doc.end();
        });

    } catch (err) {
        console.error('Email Route Error:', err);
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
});

module.exports = router;
