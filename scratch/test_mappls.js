const clientId = '96dHZVzsAutgIKF74uENn7WzrhP6YgmHLDzIl-9LvBE7Ev6MHEKNdeRhV8wLaBohdEDzOlBNDhE7M6wXbqylEA==';
const clientSecret = 'lrFxI-iSEg9eoeEivSNVsoPuyRPWkvkR1DUM2UDp2jp-pKfXfA6KQuE66b2zX2ZHgETlAWw82Y0IinfWj_bVgInnXg2GzZJ3';

async function testMappls() {
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
    console.log("Token response:", data);

    const token = data.access_token;
    
    const url = `https://atlas.mapmyindia.com/api/places/textsearch/json?query=fire%20station&location=19.0760,72.8777&radius=5000`;
    const res2 = await fetch(url, {
        headers: { 'Authorization': `bearer ${token}` }
    });
    console.log("Status:", res2.status);
    const text2 = await res2.text();
    console.log("POI response:", text2);
}

testMappls();
