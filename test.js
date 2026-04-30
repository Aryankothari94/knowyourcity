const cLat = 17.6599;
const cLng = 75.9064;

const query = `[out:json][timeout:30];
  (
    nwr["place"~"suburb|city_district|borough|quarter|neighbourhood|village|locality|hamlet|town"](around:25000,${cLat},${cLng});
    nwr["landuse"="residential"]["name"](around:25000,${cLat},${cLng});
  );
  out center;`;

async function test() {
  try {
    const res = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body: 'data=' + encodeURIComponent(query),
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0'
      }
    });
    if (!res.ok) {
      console.log('Error:', res.status, await res.text());
      return;
    }
    const data = await res.json();
    console.log('Found elements:', data.elements.length);
    const names = new Set();
    data.elements.forEach(el => {
      if (el.tags && el.tags.name) names.add(el.tags.name);
    });
    console.log(Array.from(names).slice(0, 30));
  } catch (err) {
    console.error(err);
  }
}

test();
