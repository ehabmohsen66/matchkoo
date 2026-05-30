import urllib.request
import urllib.parse
import json

teams = [
    "Mamelodi Sundowns F.C.",
    "Kaizer Chiefs F.C.",
    "Orlando Pirates F.C.",
    "SuperSport United F.C.",
    "Cape Town City F.C.",
    "AmaZulu F.C.",
    "Stellenbosch F.C.",
    "Lamontville Golden Arrows F.C.",
    "TS Galaxy F.C.",
    "Sekhukhune United F.C.",
    "Chippa United F.C.",
    "Richards Bay F.C.",
    "Moroka Swallows F.C.",
    "Polokwane City F.C.",
    "Maritzburg United F.C.",
    "Marumo Gallants F.C."
]

logos = {}

for team in teams:
    query = urllib.parse.quote(team)
    url = f"https://en.wikipedia.org/w/api.php?action=query&prop=pageimages&format=json&piprop=original&titles={query}"
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode())
            pages = data['query']['pages']
            page_id = list(pages.keys())[0]
            if page_id != '-1' and 'original' in pages[page_id]:
                logos[team] = pages[page_id]['original']['source']
                print(f"'{team.replace(' F.C.', '').replace('Lamontville ', '')}': '{logos[team]}',")
            else:
                print(f"No image found for {team}")
    except Exception as e:
        print(f"Error for {team}: {e}")

