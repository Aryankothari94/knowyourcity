import urllib.request
import json
import urllib.parse

def fetch_overpass(lat, lng):
    query = f"""
    [out:json][timeout:30];
    (
      nwr["place"~"suburb|city_district|borough|quarter|neighbourhood|locality|village"](around:15000,{lat},{lng});
      nwr["landuse"="residential"]["name"](around:15000,{lat},{lng});
    );
    out center;
    """
    url = "https://overpass-api.de/api/interpreter"
    data = f"data={urllib.parse.quote(query)}".encode('utf-8')
    req = urllib.request.Request(url, data=data, headers={'User-Agent': 'Mozilla/5.0', 'Content-Type': 'application/x-www-form-urlencoded'})
    try:
        with urllib.request.urlopen(req) as response:
            res = json.loads(response.read().decode())
            names = set()
            for el in res.get('elements', []):
                tags = el.get('tags', {})
                name = tags.get('name') or tags.get('name:en')
                if name:
                    names.add(name)
            print("Areas found:", sorted(list(names)))
    except Exception as e:
        print("Error:", e)

# Solapur coordinates
fetch_overpass(17.6599, 75.9064)
