require('dotenv').config();

async function getMapplsToken() {
    const clientId = process.env.MAPMYINDIA_CLIENT_ID;
    const clientSecret = process.env.MAPMYINDIA_CLIENT_SECRET;
    console.log("clientId:", !!clientId);
    const params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');
    params.append('client_id', clientId);
    params.append('client_secret', clientSecret);
    const res = await fetch('https://outpost.mapmyindia.com/api/security/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params
    });
    const data = await res.json();
    return data.access_token;
}

async function fetchMapplsPOI(lat, lng, keyword, radius = 5000) {
    const token = await getMapplsToken();
    const url = `https://atlas.mapmyindia.com/api/places/textsearch/json?query=${encodeURIComponent(keyword)}&location=${lat},${lng}&radius=${radius}`;
    const res = await fetch(url, { headers: { 'Authorization': `bearer ${token}` } });
    const data = await res.json();
    console.log(`Keyword: ${keyword}, Results:`, data.suggestedLocations?.length);
    return data.suggestedLocations || [];
}

async function main() {
    await fetchMapplsPOI(19.0760, 72.8777, 'fire station', 8000);
    await fetchMapplsPOI(19.0760, 72.8777, 'cctv', 8000);
}

main().catch(console.error);
