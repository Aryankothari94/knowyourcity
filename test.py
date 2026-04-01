import urllib.request
import urllib.parse
import json

lat = 19.0760
lng = 72.8777
q_fire = f'[out:json][timeout:15];(node["amenity"="fire_station"](around:15000,{lat},{lng});way["amenity"="fire_station"](around:15000,{lat},{lng});node["emergency"="fire_hydrant"](around:10000,{lat},{lng}););out center tags;'

try:
    req = urllib.request.Request(
        'https://overpass-api.de/api/interpreter', 
        data=urllib.parse.urlencode({'data': q_fire}).encode('utf-8')
    )
    with urllib.request.urlopen(req) as response:
        data = json.loads(response.read().decode('utf-8'))
        print(f"Fire returned {len(data.get('elements', []))} elements")
except Exception as e:
    print(f"Error: {e}")
