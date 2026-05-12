const fs = require('fs');
const env = fs.readFileSync('.env', 'utf8');
const key = env.split('\n').find(l => l.startsWith('FOOTBALL_API_KEY=')).split('=')[1].trim();

async function check() {
  try {
    const res = await fetch(`https://v3.football.api-sports.io/leagues?country=Egypt`, {
      headers: { "x-apisports-key": key }
    });
    const data = await res.json();
    console.log(JSON.stringify(data, null, 2));
  } catch (e) {
    console.error("Error:", e);
  }
}
check();
