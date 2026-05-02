/* ═══════════════════════════════════════════════════════════════
   KICKOFF — CLUBS DATABASE
   Authentic team data for major global leagues
═══════════════════════════════════════════════════════════════ */

const TEAMS_DB = {
  // ─── EUROPE ──────────────────────────────────────────────────────────
  'Premier League': [
    'Arsenal', 'Aston Villa', 'Bournemouth', 'Brentford', 'Brighton', 
    'Chelsea', 'Crystal Palace', 'Everton', 'Fulham', 'Ipswich Town',
    'Leicester City', 'Liverpool', 'Man City', 'Man United', 'Newcastle United', 
    'Nottingham Forest', 'Southampton', 'Tottenham', 'West Ham', 'Wolves'
  ],
  'La Liga': [
    'Athletic Club', 'Atletico Madrid', 'Osasuna', 'Leganes', 'Alaves', 
    'Barcelona', 'Getafe', 'Girona', 'Rayo Vallecano', 'Celta Vigo', 
    'Mallorca', 'Real Betis', 'Real Madrid', 'Real Sociedad', 'Real Valladolid',
    'Sevilla', 'Las Palmas', 'Espanyol', 'Valencia', 'Villarreal'
  ],
  'Serie A': [
    'AC Milan', 'Atalanta', 'Bologna', 'Cagliari', 'Como',
    'Empoli', 'Fiorentina', 'Genoa', 'Inter Milan', 'Juventus',
    'Lazio', 'Lecce', 'Monza', 'Napoli', 'Parma',
    'Roma', 'Salernitana', 'Torino', 'Udinese', 'Venezia'
  ],
  'Bundesliga': [
    'Augsburg', 'Bayer Leverkusen', 'Bayern Munich', 'Bochum', 'Werder Bremen',
    'Dortmund', 'B. Monchengladbach', 'Eintracht Frankfurt', 'Freiburg', 'Heidenheim',
    'Hoffenheim', 'Holstein Kiel', 'RB Leipzig', 'Mainz 05', 'St. Pauli',
    'Stuttgart', 'Union Berlin', 'Wolfsburg'
  ],
  'Ligue 1': [
    'Angers', 'Auxerre', 'Brest', 'Le Havre', 'RC Lens',
    'Lille', 'Lyon', 'Marseille', 'Monaco', 'Montpellier',
    'Nantes', 'Nice', 'PSG', 'Reims', 'Rennes',
    'Strasbourg', 'Saint-Etienne', 'Toulouse'
  ],
  'UEFA Champions League': [
    'Real Madrid', 'Man City', 'Bayern Munich', 'PSG', 'Inter Milan',
    'Arsenal', 'Barcelona', 'Bayer Leverkusen', 'Liverpool', 'Juventus',
    'AC Milan', 'Atletico Madrid', 'Dortmund', 'RB Leipzig', 'Aston Villa'
  ],

  // ─── AFRICA ──────────────────────────────────────────────────────────
  'Egyptian Premier League': [
    'Al Ahly', 'Zamalek', 'Pyramids FC', 'ZED FC', 'Future FC',
    'Al Masry', 'Al Ittihad', 'Smouha', 'Ceramica Cleopatra', 'Talaea El Gaish',
    'ENPPI', 'Ismaily', 'National Bank', 'Ghazl El Mahalla', 'Petrojet'
  ],
  'CAF Champions League': [
    'Al Ahly', 'Wydad AC', 'Mamelodi Sundowns', 'Esperance', 'Raja CA',
    'CR Belouizdad', 'TP Mazembe', 'Simba SC', 'ASEC Mimosas', 'Petro de Luanda',
    'Young Africans', 'Zamalek'
  ],
  'NPFL (Nigeria)': [
    'Enyimba', 'Rivers United', 'Remo Stars', 'Enugu Rangers', 'Shooting Stars',
    'Kano Pillars', 'Sporting Lagos', 'Akwa United', 'Kwara United', 'Lobi Stars'
  ],

  // ─── AMERICAS ────────────────────────────────────────────────────────
  'MLS': [
    'Inter Miami', 'LA Galaxy', 'LAFC', 'Columbus Crew', 'FC Cincinnati',
    'NY Red Bulls', 'NYCFC', 'Seattle Sounders', 'Portland Timbers', 'Orlando City',
    'Atlanta United', 'Chicago Fire', 'Toronto FC', 'CF Montreal'
  ],
  'Brasileirão': [
    'Palmeiras', 'Flamengo', 'Botafogo', 'Atletico Mineiro', 'São Paulo',
    'Gremio', 'Fluminense', 'Cruzeiro', 'Internacional', 'Corinthians',
    'Vasco da Gama', 'Bahia', 'Athletico Paranaense'
  ],
  'Primera División (ARG)': [
    'River Plate', 'Boca Juniors', 'Racing Club', 'Independiente', 'San Lorenzo',
    'Talleres', 'Estudiantes', 'Velez Sarsfield', 'Rosario Central', 'Newells Old Boys'
  ],

  // ─── ASIA & REST OF WORLD ────────────────────────────────────────────
  'Saudi Pro League': [
    'Al Hilal', 'Al Nassr', 'Al Ittihad', 'Al Ahli', 'Al Shabab',
    'Al Ettifaq', 'Al Taawoun', 'Al Qadsiah', 'Al Fateh', 'Damac'
  ],
  'J-League': [
    'Vissel Kobe', 'Yokohama F. Marinos', 'Kawasaki Frontale', 'Urawa Reds', 'Kashima Antlers',
    'Sanfrecce Hiroshima', 'Nagoya Grampus', 'Gamba Osaka', 'FC Tokyo'
  ],
  'A-League (Australia)': [
    'Sydney FC', 'Melbourne City', 'Melbourne Victory', 'Wellington Phoenix', 'Adelaide United',
    'Western Sydney Wanderers', 'Macarthur FC', 'Central Coast Mariners'
  ]
};

// Expose a helper to fetch random real teams for a league
function getRealTeamsForLeague(leagueName, numMatches = 6) {
  let teams = TEAMS_DB[leagueName] || TEAMS_DB['Premier League']; // fallback
  
  // Create a copy and shuffle
  const shuffled = [...teams].sort(() => Math.random() - 0.5);
  const matches = [];
  
  for (let i = 0; i < Math.min(numMatches, Math.floor(shuffled.length / 2)); i++) {
    matches.push({
      home: shuffled[i * 2],
      away: shuffled[i * 2 + 1]
    });
  }
  
  return matches;
}
