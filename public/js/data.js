/* ═══════════════════════════════════════════════════════════════
   KICKOFF — APP DATA
   Mock data for all dynamic content
═══════════════════════════════════════════════════════════════ */

const DATA = {

  continents: {
    europe: {
      label: 'Europe',
      leagues: [
        { id: 'epl', name: 'Premier League', country: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', emoji: '⚽', logo: 'https://media.api-sports.io/football/leagues/39.png', matches: 48, color: '#38003C' },
        { id: 'laliga', name: 'La Liga', country: '🇪🇸', emoji: '🇪🇸', logo: 'https://media.api-sports.io/football/leagues/140.png', matches: 42, color: '#EE1C25' },
        { id: 'bundesliga', name: 'Bundesliga', country: '🇩🇪', emoji: '🇩🇪', matches: 38, color: '#D3010C', comingSoon: true },
        { id: 'seriea', name: 'Serie A', country: '🇮🇹', emoji: '🇮🇹', matches: 44, color: '#024494', comingSoon: true },
        { id: 'ligue1', name: 'Ligue 1', country: '🇫🇷', emoji: '🇫🇷', matches: 36, color: '#182A4E', comingSoon: true },
        { id: 'ucl', name: 'UEFA Champions League', country: '🇪🇺', emoji: '⭐', logo: 'https://media.api-sports.io/football/leagues/2.png', matches: 22, color: '#1B0E60' },
        { id: 'uel', name: 'Europa League', country: '🇪🇺', emoji: '🟠', matches: 18, color: '#FF6900', comingSoon: true },
        { id: 'eredivisie', name: 'Eredivisie', country: '🇳🇱', emoji: '🇳🇱', matches: 30, color: '#EF7D00', comingSoon: true },
        { id: 'primeirliga', name: 'Primeira Liga', country: '🇵🇹', emoji: '🇵🇹', matches: 34, color: '#009B3A', comingSoon: true },
        { id: 'superlig', name: 'Süper Lig', country: '🇹🇷', emoji: '🇹🇷', matches: 38, color: '#E30A17', comingSoon: true },
      ]
    },
    africa: {
      label: 'Africa',
      leagues: [
        { id: 'egipt', name: 'Egyptian Premier League', country: '🇪🇬', emoji: '🇪🇬', logo: 'https://tmssl.akamaized.net//images/logo/header/egy1.png?lm=1741338264', matches: 30, color: '#C09300' },
        { id: 'caf-cl', name: 'CAF Champions League', country: '🌍', emoji: '🏆', matches: 24, color: '#009A44', comingSoon: true },
        { id: 'afcon', name: 'AFCON 2026', country: '🌍', emoji: '🇲🇦', matches: 32, color: '#C1272D', comingSoon: true },
        { id: 'npfl', name: 'NPFL (Nigeria)', country: '🇳🇬', emoji: '🇳🇬', matches: 28, color: '#008751', comingSoon: true },
        { id: 'psl', name: 'PSL (South Africa)', country: '🇿🇦', emoji: '🇿🇦', matches: 32, color: '#007A4D', comingSoon: true },
        { id: 'caf-cc', name: 'CAF Confederation Cup', country: '🌍', emoji: '🥈', matches: 20, color: '#F77F00', comingSoon: true },
      ]
    },
    americas: {
      label: 'Americas',
      leagues: [
        { id: 'mls', name: 'MLS', country: '🇺🇸', emoji: '🇺🇸', matches: 36, color: '#1A3657', comingSoon: true },
        { id: 'brasileirao', name: 'Brasileirão', country: '🇧🇷', emoji: '🇧🇷', matches: 38, color: '#009C3B', comingSoon: true },
        { id: 'liga-mx', name: 'Liga MX', country: '🇲🇽', emoji: '🇲🇽', matches: 34, color: '#006847', comingSoon: true },
        { id: 'libertadores', name: 'Copa Libertadores', country: '🌎', emoji: '🏆', matches: 26, color: '#F5C518', comingSoon: true },
        { id: 'copa-america', name: 'Copa América 2026', country: '🌎', emoji: '🌎', matches: 28, color: '#003087', comingSoon: true },
        { id: 'arg-primera', name: 'Primera División (ARG)', country: '🇦🇷', emoji: '🇦🇷', matches: 30, color: '#74ACDF', comingSoon: true },
      ]
    },
    asia: {
      label: 'Asia',
      leagues: [
        { id: 'jleague', name: 'J-League', country: '🇯🇵', emoji: '🇯🇵', matches: 34, color: '#00559A', comingSoon: true },
        { id: 'kleague', name: 'K League 1', country: '🇰🇷', emoji: '🇰🇷', matches: 32, color: '#C60C30', comingSoon: true },
        { id: 'saudi', name: 'Saudi Pro League', country: '🇸🇦', emoji: '🇸🇦', matches: 30, color: '#007A3D', comingSoon: true },
        { id: 'chinese-sl', name: 'Chinese Super League', country: '🇨🇳', emoji: '🇨🇳', matches: 30, color: '#DE2910', comingSoon: true },
        { id: 'afc-cl', name: 'AFC Champions League', country: '🌏', emoji: '⭐', matches: 22, color: '#F77F00', comingSoon: true },
        { id: 'isl', name: 'Indian Super League', country: '🇮🇳', emoji: '🇮🇳', matches: 34, color: '#FF7722', comingSoon: true },
      ]
    },
    oceania: {
      label: 'Oceania',
      leagues: [
        { id: 'a-league', name: 'A-League (Australia)', country: '🇦🇺', emoji: '🇦🇺', matches: 28, color: '#003087', comingSoon: true },
        { id: 'nzfl', name: 'NZFL (New Zealand)', country: '🇳🇿', emoji: '🇳🇿', matches: 16, color: '#000000', comingSoon: true },
        { id: 'ofc-cl', name: 'OFC Champions League', country: '🌏', emoji: '🏆', matches: 12, color: '#2E5F96', comingSoon: true },
      ]
    },
    world: {
      label: 'World Cup / Intl',
      leagues: [
        { id: 'wc2026', name: 'FIFA World Cup 2026', country: '🌍', emoji: '🏆', logo: '/images/wc2026-logo.png', matches: 64, color: '#17458F' },
        { id: 'nations', name: 'UEFA Nations League', country: '🇪🇺', emoji: '🇪🇺', matches: 48, color: '#003087', comingSoon: true },
        { id: 'friendly', name: 'Internationals/Friendlies', country: '🌍', emoji: '⚽', matches: '∞', color: '#444', comingSoon: true },
      ]
    }
  },

  todayFixtures: [
    { id: 'f1', league: 'Premier League', leagueFlag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', home: 'Man United', away: 'Arsenal', time: '17:30', predicted: true, homeColor: '#C8102E', awayColor: '#EF0107' },
    { id: 'f2', league: 'La Liga', leagueFlag: '🇪🇸', home: 'Real Madrid', away: 'Barcelona', time: '20:00', predicted: false, homeColor: '#FEBE10', awayColor: '#A50044' },
    { id: 'f3', league: 'Serie A', leagueFlag: '🇮🇹', home: 'AC Milan', away: 'Juventus', time: '19:45', predicted: true, homeColor: '#FB090B', awayColor: '#000000' },
    { id: 'f4', league: 'Bundesliga', leagueFlag: '🇩🇪', home: 'Bayern Munich', away: 'Dortmund', time: '17:30', predicted: false, homeColor: '#DC052D', awayColor: '#FDE100' },
    { id: 'f5', league: 'Ligue 1', leagueFlag: '🇫🇷', home: 'PSG', away: 'Lyon', time: '20:45', predicted: true, homeColor: '#004170', awayColor: '#C50016' },
    { id: 'f6', league: 'CAF Champions League', leagueFlag: '🌍', home: 'Al Ahly', away: 'Wydad', time: '19:00', predicted: false, homeColor: '#CC2936', awayColor: '#C60C30' },
    { id: 'f7', league: 'MLS', leagueFlag: '🇺🇸', home: 'Inter Miami', away: 'NY City', time: '01:30', predicted: false, homeColor: '#F7B5CD', awayColor: '#6CACE4' },
    { id: 'f8', league: 'Saudi Pro League', leagueFlag: '🇸🇦', home: 'Al Nassr', away: 'Al Hilal', time: '19:00', predicted: true, homeColor: '#FFCD00', awayColor: '#2B5CCC' },
  ],

  predictions: [
    {
      id: 'p1', league: 'Premier League', match: 'Man United vs Arsenal', status: 'correct',
      picks: ['Home Win ✓', 'Confidence 70%', 'Over 2.5 ✓'],
      xp: '+140 XP', time: '2h ago'
    },
    {
      id: 'p2', league: 'La Liga', match: 'Real Madrid vs Atletico', status: 'wrong',
      picks: ['Away Win ✗', 'Score 0-2 ✗'],
      xp: '+0 XP', time: 'Yesterday'
    },
    {
      id: 'p3', league: 'Serie A', match: 'Juventus vs Roma', status: 'correct',
      picks: ['Score 2-1 ✓', 'BTTS: No ✓'],
      xp: '+500 XP', time: 'Yesterday'
    },
    {
      id: 'p4', league: 'Champions League', match: 'PSG vs Real Madrid', status: 'pending',
      picks: ['Away Win', 'Score 1-2', 'First Scorer: Mbappe'],
      xp: 'Pending', time: 'Today 20:00'
    },
    {
      id: 'p5', league: 'Bundesliga', match: 'Bayern Munich vs Dortmund', status: 'pending',
      picks: ['Home Win', 'Over 2.5'],
      xp: 'Pending', time: 'Today 17:30'
    },
  ],

  leaderboard: [
    { rank: 1, name: 'Marcus T.', flag: '🇩🇪', level: 'legend', xp: '142,880', acc: '78.4%', seed: 'marcus' },
    { rank: 2, name: 'Alex K.', flag: '🇧🇷', level: 'diamond', xp: '89,420', acc: '73.1%', seed: 'alex' },
    { rank: 3, name: 'Sofia L.', flag: '🇫🇷', level: 'gold', xp: '76,150', acc: '71.8%', seed: 'sofia' },
    { rank: 4, name: 'Yusuf A.', flag: '🇳🇬', level: 'gold', xp: '64,800', acc: '70.2%', seed: 'yusuf' },
    { rank: 5, name: 'Carlos M.', flag: '🇦🇷', level: 'platinum', xp: '58,230', acc: '68.9%', seed: 'carlos' },
    { rank: 6, name: 'Hana K.', flag: '🇯🇵', level: 'gold', xp: '52,100', acc: '67.5%', seed: 'hana' },
    { rank: 7, name: 'Pierre D.', flag: '🇫🇷', level: 'gold', xp: '47,800', acc: '65.8%', seed: 'pierre' },
    { rank: 8, name: 'Ahmed M.', flag: '🇪🇬', level: 'silver', xp: '38,200', acc: '64.3%', seed: 'ahmed' },
    { rank: 9, name: 'Lena S.', flag: '🇩🇪', level: 'silver', xp: '29,900', acc: '62.1%', seed: 'lena' },
    { rank: 10, name: 'Pedro V.', flag: '🇧🇷', level: 'gold', xp: '25,400', acc: '61.7%', seed: 'pedro' },
  ],

  friendsLeaderboard: [
    { rank: 1, name: 'Yusuf A.', flag: '🇳🇬', level: 'gold', xp: '18,200', acc: '70.2%', seed: 'yusuf' },
    { rank: 2, name: 'Ahmed M.', flag: '🇸🇦', level: 'silver', xp: '15,800', acc: '65.4%', seed: 'ahmed' },
    { rank: 3, name: 'Ihab (You)', flag: '🇪🇬', level: 'gold', xp: '12,450', acc: '67.3%', seed: 'kickoff', isYou: true },
    { rank: 4, name: 'Omar H.', flag: '🇪🇬', level: 'silver', xp: '10,900', acc: '63.1%', seed: 'omar' },
    { rank: 5, name: 'Mia T.', flag: '🇬🇧', level: 'bronze', xp: '7,200', acc: '58.9%', seed: 'mia' },
  ],

  miniLeagues: [
    {
      id: 'ml1', name: 'Office FC', badge: '🏢', members: 8, myRank: 2, totalPoints: 340,
      competitions: ['Premier League', 'Champions League'],
      memberSeeds: ['alex', 'sofia', 'marcus', 'kickoff'],
      inviteCode: 'KO-OFFICEFC-4821'
    },
    {
      id: 'ml2', name: 'Egypt Eagles', badge: '🦅', members: 14, myRank: 1, totalPoints: 580,
      competitions: ['AFCON 2026', 'Egyptian Premier League'],
      memberSeeds: ['ahmed', 'omar', 'yusuf', 'kickoff'],
      inviteCode: 'KO-EAGLES-9934'
    },
    {
      id: 'ml3', name: 'El Classico Fanatics', badge: '⚽', members: 22, myRank: 7, totalPoints: 210,
      competitions: ['La Liga'],
      memberSeeds: ['carlos', 'pierre', 'lena', 'kickoff'],
      inviteCode: 'KO-CLASICO-1128'
    },
  ],

  trophies: [
    { id: 't1', icon: '⚽', name: 'First Blood', desc: 'First correct prediction', unlocked: true },
    { id: 't2', icon: '🎯', name: 'Sniper', desc: 'Exact scoreline correct', unlocked: true },
    { id: 't3', icon: '🔥', name: 'On Fire', desc: '7-game streak', unlocked: true },
    { id: 't4', icon: '🚀', name: 'Rocket', desc: 'Reach Gold level', unlocked: true },
    { id: 't5', icon: '👑', name: 'King', desc: 'Win a mini league', unlocked: true },
    { id: 't6', icon: '🌍', name: 'Globetrotter', desc: 'Predict in 5 leagues', unlocked: true },
    { id: 't7', icon: '💯', name: 'Century', desc: '100 correct predictions', unlocked: true },
    { id: 't8', icon: '🏆', name: 'Champion', desc: 'Top 100 Global', unlocked: false },
    { id: 't9', icon: '💎', name: 'Diamond', desc: 'Reach Diamond level', unlocked: false },
    { id: 't10', icon: '⭐', name: 'Legend', desc: 'Reach Legend level', unlocked: false },
    { id: 't11', icon: '🔮', name: 'Oracle', desc: '10 correct scorelines', unlocked: false },
    { id: 't12', icon: '🌟', name: 'Superstar', desc: 'Season trophy winner', unlocked: false },
  ],

  leagueAccuracy: [
    { name: 'Premier League', pct: 72 },
    { name: 'La Liga', pct: 68 },
    { name: 'Serie A', pct: 65 },
    { name: 'AFCON', pct: 71 },
    { name: 'Champions League', pct: 59 },
    { name: 'Bundesliga', pct: 63 },
  ],

  spinPrizes: [
    { label: '+50 XP',    color: '#ABFF4F', textColor: '#1a4d00' },
    { label: '+150 XP',   color: '#29BF12', textColor: '#FFFFFF' },
    { label: 'Double XP', color: '#FF9914', textColor: '#FFFFFF' },
    { label: '+100 XP',   color: '#08BDBD', textColor: '#FFFFFF' },
    { label: '+500 XP',   color: '#F21B3F', textColor: '#FFFFFF' },
    { label: 'Wildcard',  color: '#ABFF4F', textColor: '#1a4d00' },
    { label: '+250 XP',   color: '#29BF12', textColor: '#FFFFFF' },
    { label: 'Shield',    color: '#08BDBD', textColor: '#FFFFFF' },
  ],

  matchDetail: {
    live1: {
      league: 'Premier League', homeName: 'Man United', awayName: 'Arsenal',
      homeAbbr: 'MU', awayAbbr: 'ARS', homeColor: '#C8102E', awayColor: '#EF0107',
      score: '1 – 2', status: "67' LIVE", venue: 'Old Trafford',
      isLive: true,
      homeGP: 42, drawGP: 18, awayGP: 40
    },
    live2: {
      league: 'La Liga', homeName: 'Real Madrid', awayName: 'Barcelona',
      homeAbbr: 'RM', awayAbbr: 'FCB', homeColor: '#FEBE10', awayColor: '#A50044',
      score: '2 – 0', status: "34' LIVE", venue: 'Santiago Bernabéu',
      isLive: true,
      homeGP: 55, drawGP: 20, awayGP: 25
    },
    upcoming1: {
      league: 'Champions League', homeName: 'PSG', awayName: 'Real Madrid',
      homeAbbr: 'PSG', awayAbbr: 'RM', homeColor: '#004170', awayColor: '#FEBE10',
      score: '–', status: 'Today 20:00', venue: 'Parc des Princes',
      isLive: false,
      homeGP: 35, drawGP: 22, awayGP: 43
    }
  }

};
