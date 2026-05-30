const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8') || fs.readFileSync('.env', 'utf8');
const key = env.split('\n').find(l => l.startsWith('FOOTBALL_API_KEY=')).split('=')[1].trim();

async function check() {
  try {
    const res = await fetch(`https://v3.football.api-sports.io/teams?country=South Africa`, {
      headers: { "x-apisports-key": key }
    });
    const data = await res.json();
    const teams = data.response.map(t => ({ id: t.team.id, name: t.team.name, logo: t.team.logo }));
    console.log(JSON.stringify(teams, null, 2));
  } catch (e) {
    console.error("Error:", e);
  }
}
check();
