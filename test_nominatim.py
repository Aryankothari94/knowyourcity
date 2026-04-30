import urllib.request
import json

def geocode(query):
    url = f"https://nominatim.openstreetmap.org/search?q={urllib.parse.quote(query)}&format=json&addressdetails=1"
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    try:
        with urllib.request.urlopen(req) as response:
            res = json.loads(response.read().decode())
            if res:
                print(f"Found {query}:")
                for r in res[:2]:
                    print(f" - {r.get('type')}: {r.get('display_name')}")
            else:
                print(f"Not found: {query}")
    except Exception as e:
        print("Error:", e)

import urllib.parse
geocode("Budhwar Peth, Solapur")
geocode("Navi Peth, Solapur")
