import urllib.request
import urllib.parse
import json
import time

lat = 19.0760
lng = 72.8777

q_combined = f'''[out:json][timeout:25];(
  node["amenity"="police"](around:15000,{lat},{lng});
  way["amenity"="police"](around:15000,{lat},{lng});
  node["amenity"="hospital"](around:15000,{lat},{lng});
  way["amenity"="hospital"](around:15000,{lat},{lng});
  node["amenity"="clinic"](around:10000,{lat},{lng});
  way["amenity"="clinic"](around:10000,{lat},{lng});
  node["amenity"="fire_station"](around:15000,{lat},{lng});
  way["amenity"="fire_station"](around:15000,{lat},{lng});
  node["emergency"="fire_hydrant"](around:10000,{lat},{lng});
  node["man_made"="surveillance"](around:10000,{lat},{lng});
  way["man_made"="surveillance"](around:10000,{lat},{lng});
  node["surveillance:type"="camera"](around:10000,{lat},{lng});
  node["surveillance:type"="ALPR"](around:10000,{lat},{lng});
  node["amenity"="cctv"](around:10000,{lat},{lng});
);out center tags 500;'''

print('Querying overpass...')
start = time.time()
try:
    req = urllib.request.Request(
        'https://overpass-api.de/api/interpreter', 
        data=urllib.parse.urlencode({'data': q_combined}).encode('utf-8')
    )
    with urllib.request.urlopen(req) as response:
        data = json.loads(response.read().decode('utf-8'))
        print(f"Combined returned {len(data.get('elements', []))} elements")
except Exception as e:
    print(f"Error: {e}")
print(f"Time taken: {time.time() - start:.2f} seconds")
