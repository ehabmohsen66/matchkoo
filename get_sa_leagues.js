const fs = require('fs');
const env = fs.readFileSync('.env', 'utf8');
const key = env.split('\n').find(l => l.startsWith('FOOTBALL_API_KEY=')).split('=')[1].trim();

async function check() {
  try {
    const res = await fetch(`https://v3.football.api-sports.io/leagues?country=South Africa`, {
      headers: { "x-apisports-key": key }
    });
    const data = await res.json();
    console.log(JSON.stringify(data.response.map(l => ({id: l.league.id, name: l.league.name})), null, 2));
  } catch (e) {
    console.error("Error:", e);
  }
}
check();
