import urllib.request
import urllib.parse
import json
import os
import time

teams = [
    "Mamelodi Sundowns",
    "Kaizer Chiefs",
    "Orlando Pirates",
    "SuperSport United",
    "Cape Town City",
    "AmaZulu",
    "Stellenbosch",
    "Golden Arrows",
    "TS Galaxy",
    "Sekhukhune United",
    "Chippa United",
    "Richards Bay",
    "Moroka Swallows",
    "Polokwane City",
    "Maritzburg United",
    "Marumo Gallants"
]

output_dir = "public/images/clubs/"
os.makedirs(output_dir, exist_ok=True)

mappings = {}

for team in teams:
    query = urllib.parse.quote(team)
    url = f"https://www.thesportsdb.com/api/v1/json/3/searchteams.php?t={query}"
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode())
            if data['teams']:
                team_data = data['teams'][0]
                badge_url = team_data.get('strBadge')
                if badge_url:
                    # Download the image
                    filename = team.lower().replace(" ", "_") + ".png"
                    filepath = os.path.join(output_dir, filename)
                    urllib.request.urlretrieve(badge_url, filepath)
                    mappings[team] = f"/images/clubs/{filename}"
                    print(f"Downloaded logo for {team} -> {filepath}")
                else:
                    print(f"No badge URL for {team}")
            else:
                print(f"No team found for {team} on TheSportsDB")
    except Exception as e:
        print(f"Error for {team}: {e}")
    time.sleep(0.5)

print("\n--- Mappings for TEAM_DISPLAY_MAP ---")
for team, path in mappings.items():
    print(f"'{team}': {{ name: '{team}', logo: '{path}' }},")

