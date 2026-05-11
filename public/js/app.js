/* ═══════════════════════════════════════════════════════════════
   KICKOFF — MAIN APPLICATION LOGIC
═══════════════════════════════════════════════════════════════ */

'use strict';

// ─── STATE ──────────────────────────────────────────────────────
const state = {
  currentPage: 'home',
  currentContinent: 'europe',
  currentLeague: null,
  predFilter: 'upcoming',
  lbScope: 'global',
  lbPeriod: 'week',
  spinDone: false,
  selectedResult: null,
  bttsChoice: 'yes',
  goalsChoice: 'over',
  totalXP: 0,
};

// ─── NAVIGATION ──────────────────────────────────────────────────
function navigate(page) {
  // Hide all pages
  document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.querySelectorAll('.mobile-nav-item').forEach(n => n.classList.remove('active'));

  // Show target page
  const target = document.getElementById(`page-${page}`);
  if (target) {
    target.classList.remove('hidden');
    target.classList.add('page');
  }

  // Mark nav active
  const navItem = document.getElementById(`nav-${page}`);
  if (navItem) navItem.classList.add('active');
  const mNavItem = document.getElementById(`mnav-${page}`);
  if (mNavItem) mNavItem.classList.add('active');

  state.currentPage = page;

  // Initialize page content
  if (page === 'home') initHome();
  if (page === 'discover') initDiscover();
  if (page === 'predictions') initPredictions();
  if (page === 'leaderboard') initLeaderboard();
  if (page === 'minileague') initMiniLeagues();
  if (page === 'profile') initProfile();
  if (page === 'vote') initVote();

  // Close mobile sidebar
  document.getElementById('sidebar').classList.remove('mobile-open');

  // Scroll to top
  document.getElementById('main-content').scrollTop = 0;

  // Animate with Framer Motion if available
  if (window.animatePageEnter && target) {
    setTimeout(() => window.animatePageEnter(target), 0);
  }
}

function toggleMobileSidebar() {
  document.getElementById('sidebar').classList.toggle('mobile-open');
}

// ─── HOME PAGE ───────────────────────────────────────────────────
function initHome() {
  renderLiveMatches();
  renderFixturesList();
  renderMiniLeaderboard();
  loadHomeWidgets();
}

async function loadHomeWidgets() {
  // Top Predictors widget
  const predEl = document.getElementById('home-top-predictors');
  try {
    const lb = await fetch('/api/leaderboard').then(r => r.ok ? r.json() : []);
    if (predEl && lb.length > 0) {
      predEl.innerHTML = lb.slice(0, 5).map((u, i) =>
        '<div style="display:flex;align-items:center;gap:12px;padding:10px 14px;background:' + (u.isMe ? 'rgba(60,184,46,0.08)' : 'rgba(255,255,255,0.03)') + ';border-radius:12px;border:1px solid ' + (u.isMe ? 'rgba(60,184,46,0.2)' : 'rgba(255,255,255,0.05)') + '">' +
          '<div style="font-weight:800;min-width:28px;color:' + (i===0?'#ffd700':i===1?'#c0c0c0':i===2?'#cd7f32':'rgba(255,255,255,0.4)') + ';text-align:center">' + (i===0?'🥇':i===1?'🥈':i===2?'🥉':'#'+(i+1)) + '</div>' +
          '<img src="https://api.dicebear.com/7.x/avataaars/svg?seed=' + encodeURIComponent(u.name) + '" width="32" height="32" style="border-radius:50%;border:2px solid rgba(255,255,255,0.1)">' +
          '<div style="flex:1">' +
            '<div style="font-weight:700;color:#fff;font-size:0.85rem">' + u.name + (u.isMe ? ' <span style="font-size:0.65rem;color:var(--green)">YOU</span>' : '') + '</div>' +
          '</div>' +
          '<div style="font-weight:800;color:var(--green);font-size:0.82rem">' + (u.xp||0).toLocaleString() + ' XP</div>' +
        '</div>'
      ).join('');
    } else if (predEl) {
      predEl.innerHTML = '<div style="text-align:center;color:var(--text-muted);padding:20px;font-size:0.85rem">No predictors yet. Be the first!</div>';
    }
  } catch(e) { if (predEl) predEl.innerHTML = ''; }

  // Top Clubs widget
  const clubEl = document.getElementById('home-top-clubs');
  try {
    const clubs = await fetch('/api/clubs/leaderboard?period=weekly').then(r => r.ok ? r.json() : []);
    if (clubEl && clubs.length > 0) {
      clubEl.innerHTML = clubs.slice(0, 8).map((c, i) =>
        '<div style="padding:8px 14px;border-radius:100px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);font-size:0.78rem;font-weight:700;color:rgba(255,255,255,0.75)">' +
          (i===0?'🥇 ':i===1?'🥈 ':i===2?'🥉 ':('')) + c.clubName +
          ' <span style="color:var(--green);font-size:0.65rem">' + c.votes + 'v</span>' +
        '</div>'
      ).join('');
    } else if (clubEl) {
      clubEl.innerHTML = '<div style="color:var(--text-muted);font-size:0.85rem;padding:12px">No votes this week yet. <button onclick="navigate(&apos;vote&apos;)" style="background:none;border:none;color:var(--green);cursor:pointer;font-weight:700">Cast a vote!</button></div>';
    }
  } catch(e) { if (clubEl) clubEl.innerHTML = ''; }
}


async function renderLiveMatches() {
  const container = document.getElementById('live-now-cards');
  if (!container) return;
  
  try {
    const matches = await fetch('/api/matches').then(r => r.ok ? r.json() : []);
    
    // Exact names of the active leagues
    const ACTIVE_LEAGUES = ['premier league', 'la liga', 'uefa champions league', 'egyptian premier league', 'fifa world cup'];
    
    const liveMatches = matches.filter(m => {
      const tName = (m.tournament?.name || '').toLowerCase().replace(/ \d{4}$/, '').trim();
      return ACTIVE_LEAGUES.includes(tName) && m.status === 'LIVE';
    });

    if (!liveMatches.length) {
      container.innerHTML = '<div style="color:var(--text-muted);font-size:0.85rem;padding:20px 0;">No live matches right now. Check back during match time!</div>';
      return;
    }

    container.innerHTML = liveMatches.map(m => {
      const matchId = m.id;
      const min = m.minute ? m.minute + "'" : '';
      return '<div class="match-card live-card" onclick="openRealMatchDetail(\'' + matchId + '\')">' +
        '<div class="match-card-header">' +
          '<span class="match-league">' + (m.tournament?.name || 'Match') + '</span>' +
          '<span class="match-minute live-badge">' + min + '</span>' +
        '</div>' +
        '<div class="match-teams">' +
          '<div class="team-block">' +
            '<div class="team-badge" style="background:#1a3a5c;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:12px">' +
              (m.homeLogo ? '<img src="'+m.homeLogo+'" width="40" height="40" style="border-radius:50%">' : m.homeTeam.substring(0,3).toUpperCase()) +
            '</div>' +
            '<span class="team-name">' + m.homeTeam + '</span>' +
            '<span class="team-score">' + (m.homeScore ?? 0) + '</span>' +
          '</div>' +
          '<div class="vs-block">VS</div>' +
          '<div class="team-block team-block-right">' +
            '<span class="team-score">' + (m.awayScore ?? 0) + '</span>' +
            '<span class="team-name">' + m.awayTeam + '</span>' +
            '<div class="team-badge" style="background:#3a1a2a;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:12px">' +
              (m.awayLogo ? '<img src="'+m.awayLogo+'" width="40" height="40" style="border-radius:50%">' : m.awayTeam.substring(0,3).toUpperCase()) +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>';
    }).join('');
  } catch(e) {
    container.innerHTML = '<div style="color:var(--text-muted);font-size:0.85rem;padding:20px 0;">Failed to load live matches.</div>';
  }
}

async function renderFixturesList() {
  const container = document.getElementById('fixtures-list');
  if (!container) return;
  container.innerHTML = '<div style="text-align:center;color:var(--text-muted);padding:32px;">Loading fixtures...</div>';
  try {
    const matches = await fetch('/api/matches').then(r => r.ok ? r.json() : []);
    const today = new Date(); today.setHours(0,0,0,0);
    const tomorrow = new Date(today); tomorrow.setDate(today.getDate()+2);
    
    // Only show matches from active leagues
    const todays = matches.filter(m => { 
        const d = new Date(m.matchDate);
        const tName = (m.tournament?.name || '').toLowerCase().replace(/ \d{4}$/, '').trim();
        const isActive = ACTIVE_LEAGUE_NAMES.includes(tName);
        return isActive && d >= today && d < tomorrow; 
    });
    if (!todays.length) {
      container.innerHTML = '<div style="text-align:center;color:var(--text-muted);padding:32px;font-size:0.88rem;">No matches scheduled today in your leagues. Check Discover for upcoming fixtures.</div>';
      return;
    }
    container.innerHTML = todays.map(m => {
      const matchId = m.id;
      const isDouble = state.doubleMarkedMatch === matchId;
      const doubleBg = isDouble ? '#ff9914' : 'rgba(255,153,20,0.1)';
      const doubleColor = isDouble ? '#000' : '#ff9914';
      const t = new Date(m.matchDate);
      const timeStr = t.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'});
      const hasPred = !!m.userPrediction;
      const flag = m.tournament?.name ? '' : '⚽';
      return '<div class="fixture-row" onclick="openRealMatchDetail(\'' + matchId + '\')" role="button" tabindex="0">' +
        '<div class="fixture-league-badge">' + (m.homeLogo ? '<img src="'+m.homeLogo+'" width="24" height="24" style="border-radius:50%">' : flag) + '</div>' +
        '<div class="fixture-teams">' +
          '<div class="fixture-league-name">' + (m.tournament?.name||'Match') + '</div>' +
          '<div class="fixture-team-names">' + m.homeTeam + ' vs ' + m.awayTeam + '</div>' +
        '</div>' +
        '<div style="display:flex;align-items:center;gap:8px;margin-left:auto">' +
          (hasPred ? '<span style="color:var(--green);font-size:1.1rem;font-weight:900" title="Predicted">&#10003;</span>' : '') +
          (m.status==='LIVE' ? '<span style="color:#f21b3f;font-size:0.65rem;font-weight:800;padding:2px 7px;border-radius:100px;background:rgba(242,27,63,0.15);border:1px solid rgba(242,27,63,0.3)">LIVE</span>' : '') +
          '<button onclick="event.stopPropagation();toggleDoubleXP(\'' + matchId + '\')" title="Double XP" style="background:'+doubleBg+';border:1px solid '+doubleBg+';color:'+doubleColor+';font-size:0.65rem;font-weight:800;padding:3px 8px;border-radius:100px;cursor:pointer">2x</button>' +
          '<div class="fixture-time">' + (m.status==='COMPLETED'?(m.homeScore+'–'+m.awayScore):timeStr) + '</div>' +
        '</div>' +
      '</div>';
    }).join('');
  } catch(e) {
    container.innerHTML = '<div style="text-align:center;color:var(--text-muted);padding:32px;">Could not load fixtures</div>';
  }
}

function toggleDoubleXP(matchId) {
  if (state.doubleMarkedMatch === matchId) {
    state.doubleMarkedMatch = null;
    showNotification('Double XP removed', 'info');
  } else {
    if (state.doubleMarkedMatch) { showNotification('Only one Double XP per round allowed', 'warning'); return; }
    state.doubleMarkedMatch = matchId;
    showNotification('Double XP marked! 2x XP if correct.', 'success');
  }
  renderFixturesList();
}

function renderMiniLeaderboard() {
  const container = document.getElementById('mini-leaderboard') || document.getElementById('home-top-predictors');
  if (!container) return;

  container.innerHTML = DATA.friendsLeaderboard.map(u => {
    const rankClass = u.rank === 1 ? 'gold-rank' : u.rank === 2 ? 'silver-rank' : u.rank === 3 ? 'bronze-rank' : u.isYou ? 'you-rank' : '';
    return `
      <div class="mini-lb-row ${u.isMe ? 'you-row' : ''}" role="row">
        <div class="lb-rank ${rankClass}">${u.rank === 1 ? '🥇' : u.rank === 2 ? '🥈' : u.rank === 3 ? '🥉' : '#'+u.rank}</div>
        <div class="lb-avatar">
          <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=${u.seed}" alt="${u.name}" width="36" height="36">
          <div class="level-badge-sm ${u.level}">${u.level[0].toUpperCase()}</div>
        </div>
        <div class="lb-info">
          <div class="lb-name">
            <span class="lb-name-flag">${u.flag}</span>
            ${u.isMe ? '<strong>' + u.name + '</strong>' : u.name}
            ${u.isMe ? '<span class="level-badge ' + u.level + '">YOU</span>' : ''}
          </div>
          <div class="lb-sub">${u.acc} accuracy</div>
        </div>
        <div class="lb-right">
          <div class="lb-xp">${u.xp} XP</div>
        </div>
      </div>
    `;
  }).join('');
}

// ─── DISCOVER PAGE ───────────────────────────────────────────────
function initDiscover() {
  renderLeagues(state.currentContinent);
}

function selectContinent(id) {
  state.currentContinent = id;
  document.querySelectorAll('.continent-card').forEach(c => c.classList.remove('active-continent'));
  document.getElementById(`cont-${id}`).classList.add('active-continent');

  // Hide league fixtures if open
  document.getElementById('league-fixtures-section').classList.add('hidden');
  document.getElementById('leagues-section').classList.remove('hidden');

  renderLeagues(id);
}

// Active league names — everything else shows as Coming Soon
// Matches both bare names AND year-suffixed names from DB (e.g. 'Premier League 2025')
const ACTIVE_LEAGUE_NAMES = [
  'premier league',
  'premier league 2025',
  'premier league 2026',
  'egyptian premier league',
  'egyptian premier league 2025',
  'egyptian premier league 2026',
  'la liga',
  'la liga 2025',
  'la liga 2026',
  'fifa world cup',
  'fifa world cup 2026',
  'world cup',
  'world cup 2026',
  'champions league',
  'champions league 2025',
  'champions league 2026',
  'uefa champions league',
  'uefa champions league 2025',
  'uefa champions league 2026',
];

function _isLeagueActive(l) {
  if (l.comingSoon === true) return false;
  // Real DB tournaments injected by backend_api: check name against exact whitelist
  if (l._realId || (l.id && l.id.length > 10 && !/^(epl|liga|ucl|egy|wc|caf|mls|bun|ser|l1)/.test(l.id))) {
    const cleanName = (l.name || '').toLowerCase().trim();
    return ACTIVE_LEAGUE_NAMES.includes(cleanName);
  }
  return true; // static leagues gated by comingSoon flag in data.js
}

function renderLeagues(continentId) {
  const data = DATA.continents[continentId];
  if (!data) return;

  document.getElementById("leagues-title").textContent = data.label + " Leagues & Cups";
  const grid = document.getElementById("leagues-grid");

  if (!data.leagues || data.leagues.length === 0) {
    grid.innerHTML = "<div style=\"text-align:center;color:var(--text-muted);padding:48px;font-size:0.9rem;\">No leagues or cups available to predict in this region yet.</div>";
    return;
  }

  grid.innerHTML = data.leagues.map(l => {
    const isInviteOnly = l.registrationMode === "INVITE_ONLY";
    const isActive = _isLeagueActive(l);
    const safeName = l.name.replace(/'/g, "\'");
    const safeId = String(l.id).replace(/'/g, "\'");

    if (!isActive) {
      // ── Coming Soon card — disabled, no click ─────────────────────
      return "<div class=\"league-card\" style=\"cursor:not-allowed;opacity:0.45;position:relative;user-select:none;\">" +
        "<div class=\"league-card-icon\" style=\"filter:grayscale(0.6)\">" + l.emoji + "</div>" +
        "<div class=\"league-card-info\">" +
          "<div class=\"league-card-name\" style=\"color:rgba(255,255,255,0.5)\">" + l.country + " " + l.name + "</div>" +
          "<div class=\"league-card-meta\">" +
            "<span style=\"font-size:0.6rem;font-weight:800;padding:2px 8px;border-radius:100px;" +
              "background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12);color:rgba(255,255,255,0.4);" +
              "letter-spacing:0.5px;text-transform:uppercase\">🔒 Coming Soon</span>" +
          "</div>" +
        "</div>" +
      "</div>";
    }

    // ── Active card ────────────────────────────────────────────────
    return "<div class=\"league-card\" onclick=\"openLeagueFixtures('" + safeId + "','" + safeName + "')\" style=\"cursor:pointer\">" +
      "<div class=\"league-card-icon\">" + l.emoji + "</div>" +
      "<div class=\"league-card-info\">" +
        "<div class=\"league-card-name\">" + l.country + " " + l.name + "</div>" +
        "<div class=\"league-card-meta\">" + l.matches + " matches" +
          (isInviteOnly ? " \u00a0<span style=\"font-size:0.6rem;font-weight:800;padding:2px 6px;border-radius:100px;background:rgba(255,153,20,0.15);color:#ff9914\">\uD83D\uDD12 Invite Only</span>" : "") +
          (l.prizes ? " \u00a0<span style=\"font-size:0.6rem;font-weight:800;padding:2px 6px;border-radius:100px;background:rgba(255,153,20,0.08);color:rgba(255,153,20,0.8)\">\uD83C\uDFC6 Prizes</span>" : "") +
        "</div>" +
      "</div>" +
      (l.registered ? "<span style=\"font-size:0.65rem;font-weight:800;color:var(--green);margin-left:auto\">&#10003; Joined</span>" : "") +
    "</div>";
  }).join("");
}

function openLeagueFixtures(leagueId, leagueName) {
  state.currentLeague = leagueId;
  document.getElementById('leagues-section').classList.add('hidden');
  document.getElementById('league-fixtures-section').classList.remove('hidden');

  // Show prizes if available for this league
  const prizesSection = document.getElementById('league-prizes-section');
  const tournament = (DATA.continents.world?.leagues || []).find(l => l.id === leagueId || l._realId === leagueId);
  if (prizesSection) {
    if (tournament?.prizes) {
      prizesSection.style.display = 'block';
      const prizesContent = document.getElementById('league-prizes-content');
      if (prizesContent) prizesContent.textContent = tournament.prizes;
    } else {
      prizesSection.style.display = 'none';
    }
  }
  document.getElementById('league-fixtures-title').textContent = `${leagueName} Fixtures`;

  const container = document.getElementById('fixtures-full-list');
  container.innerHTML = '<div style="text-align:center;color:var(--text-muted);padding:32px;">Loading fixtures...</div>';

  // leagueId is a CUID (25 chars) when it is a real tournament synced from the admin panel.
  // Static mock leagues use short ids like 'epl', 'caf-cl', etc.
  const looksLikeRealId = leagueId.length > 10;

  if (looksLikeRealId) {
    fetch('/api/matches?tournamentId=' + encodeURIComponent(leagueId))
      .then(r => r.ok ? r.json() : [])
      .then(matches => {
        if (matches && matches.length > 0) {
          _renderRealFixtures(container, matches, leagueName);
        } else {
          _renderMockFixtures(container, leagueName);
        }
      })
      .catch(() => _renderMockFixtures(container, leagueName));
  } else {
    _renderMockFixtures(container, leagueName);
  }
}

/** Render real DB-backed fixtures, wired to openRealMatchDetail with the correct match ID */
function _renderRealFixtures(container, matches, leagueName) {
  container.innerHTML = matches.map(m => {
    const t = new Date(m.matchDate);
    const timeStr = t.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    const hasPred = !!m.userPrediction;
    const isCompleted = m.status === 'COMPLETED';
    const isLive = m.status === 'LIVE';
    const scoreOrTime = isCompleted ? (m.homeScore + '\u2013' + m.awayScore) : (isLive ? '\uD83D\uDD34 LIVE' : timeStr);
    return '<div class="fixture-row" onclick="openRealMatchDetail(\'' + m.id + '\')" role="button" tabindex="0">' +
      '<div class="fixture-league-badge">&#x26BD;</div>' +
      '<div class="fixture-teams">' +
        '<div class="fixture-league-name">' + leagueName + '</div>' +
        '<div class="fixture-team-names">' + m.homeTeam + ' vs ' + m.awayTeam + '</div>' +
      '</div>' +
      '<div style="display:flex;align-items:center;gap:8px;margin-left:auto">' +
        (hasPred ? '<span style="color:var(--green);font-size:1rem" title="Predicted">&#10003;</span>' : '') +
        '<div class="fixture-time">' + scoreOrTime + '</div>' +
      '</div>' +
    '</div>';
  }).join('');
}

/** No real DB fixtures yet — show a clean empty state */
function _renderMockFixtures(container, leagueName) {
  container.innerHTML = 
    '<div style="text-align:center;padding:64px 24px;">' +
      '<div style="font-size:2.5rem;margin-bottom:16px">📭</div>' +
      '<div style="font-weight:800;font-size:1.05rem;color:#fff;margin-bottom:8px">No Upcoming Fixtures</div>' +
      '<div style="color:rgba(255,255,255,0.4);font-size:0.85rem;">No ' + leagueName + ' matches are scheduled yet.<br>Check back soon — fixtures update daily.</div>' +
    '</div>';
}


function generateFixturesForLeague(leagueName) {
  const times = ['14:00', '16:30', '17:00', '19:00', '19:45', '20:00', '20:30', '21:00'];
  const flags = { 'Premier League': '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'La Liga': '🇪🇸', 'Serie A': '🇮🇹', 'Bundesliga': '🇩🇪', 'Ligue 1': '🇫🇷', 'Egyptian Premier League': '🇪🇬' };
  
  // Use our real teams database
  let matches = [];
  try {
    matches = getRealTeamsForLeague(leagueName);
  } catch(e) {
    matches = [{home: 'Team A', away: 'Team B'}];
  }

  const fixtures = [];
  for (let i = 0; i < matches.length; i++) {
    fixtures.push({
      home: matches[i].home,
      away: matches[i].away,
      time: times[Math.floor(Math.random() * times.length)],
      predicted: Math.random() > 0.6,
      flag: flags[leagueName] || '⚽'
    });
  }
  return fixtures;
}

function backToLeagues() {
  document.getElementById('league-fixtures-section').classList.add('hidden');
  document.getElementById('leagues-section').classList.remove('hidden');
}

// ─── PREDICTIONS PAGE ────────────────────────────────────────────
function initPredictions() {
  renderPredictions('pending');
}

function filterPreds(filter) {
  state.predFilter = filter;
  document.querySelectorAll('#pred-filter-tabs .filter-tab').forEach(t => t.classList.remove('active'));
  event.target.classList.add('active');
  renderPredictions(filter);
}

async function renderPredictions(filter) {
  const container = document.getElementById('predictions-list');
  if (!container) return;
  container.innerHTML = '<div style="text-align:center;color:var(--text-muted);padding:32px;">Loading...</div>';
  let preds = [];
  try {
    const apiFilter = filter === 'upcoming' ? 'upcoming' : 'completed';
    const raw = await fetch('/api/predictions?filter=' + apiFilter).then(r => r.ok ? r.json() : []);
    preds = raw.map(p => ({
      matchId: p.matchId,
      league: p.match?.tournament?.name || 'Match',
      match: p.match?.homeTeam + ' vs ' + p.match?.awayTeam,
      status: p.match?.status === 'UPCOMING' ? 'pending' : p.match?.status === 'LIVE' ? 'pending' : p.xpEarned > 0 ? 'correct' : p.match?.status === 'COMPLETED' ? 'wrong' : 'pending',
      picks: [p.homeScore + '–' + p.awayScore, p.firstGoalScorer ? 'First: '+p.firstGoalScorer : null].filter(Boolean),
      xp: p.xpEarned ? '+' + p.xpEarned + ' XP' : 'Pending',
    }));
    if (filter === 'correct') preds = preds.filter(p => p.status === 'correct');
    else if (filter === 'wrong') preds = preds.filter(p => p.status === 'wrong');
    else if (filter === 'upcoming') preds = preds.filter(p => p.status === 'pending');
  } catch(e) {}

  if (preds.length === 0) {
    container.innerHTML = '<div style="text-align:center;color:var(--text-muted);padding:48px;font-size:0.9rem;">No ' + filter + ' predictions yet</div>';
    return;
  }

  // Group by league/cup
  const groups = {};
  preds.forEach(p => {
    const key = p.league || 'Other';
    if (!groups[key]) groups[key] = [];
    groups[key].push(p);
  });

  container.innerHTML = Object.entries(groups).map(([league, items]) =>
    '<div class="pred-league-group">' +
      '<div style="font-size:0.7rem;font-weight:800;color:var(--text-secondary);letter-spacing:1.5px;text-transform:uppercase;padding:12px 0 6px;border-bottom:1px solid rgba(255,255,255,0.06);margin-bottom:8px">' + league + '</div>' +
      items.map(p => {
        const canEdit = p.status === 'pending';
        const mid = p.matchId || '';
        return '<div class="pred-item ' + p.status + '" role="listitem" style="cursor:pointer" onclick="openRealMatchDetail(\'' + mid + '\')">' +
          '<div class="pred-item-header">' +
            '<span class="pred-item-league">' + p.league + '</span>' +
            '<div style="display:flex;align-items:center;gap:8px">' +
              (canEdit ? '<button onclick="event.stopPropagation();openRealMatchDetail(\'' + mid + '\')" style="font-size:0.65rem;font-weight:700;padding:2px 8px;border-radius:100px;background:rgba(60,184,46,0.1);border:1px solid rgba(60,184,46,0.3);color:var(--green);cursor:pointer">Edit</button>' : '') +
              '<span class="pred-item-status-badge status-' + p.status + '">' + (p.status === 'correct' ? '&#10003; Correct' : p.status === 'wrong' ? '&#10007; Wrong' : '&#9203; Upcoming') + '</span>' +
            '</div>' +
          '</div>' +
          '<div class="pred-item-match">' + p.match + '</div>' +
          '<div class="pred-item-picks">' + p.picks.map(pick => '<span class="pred-pick-tag">' + pick + '</span>').join('') + '</div>' +
          '<div class="pred-item-xp" style="color:' + (p.status === 'correct' ? 'var(--gold)' : p.status === 'wrong' ? 'var(--text-muted)' : 'var(--text-secondary)') + '">' + p.xp + '</div>' +
        '</div>';
      }).join('') +
    '</div>'
  ).join('');
}

// ─── LEADERBOARD PAGE ────────────────────────────────────────────
async function initLeaderboard() {
  try {
    const data = await fetch('/api/leaderboard').then(r => r.ok ? r.json() : []);
    renderLeaderboardTable(data);
    // Update podium
    const podium = [data[0], data[1], data[2]].filter(Boolean);
    podium.forEach((u, i) => {
      const el = document.getElementById('podium-' + (i+1));
      if (el) {
        const nameEl = el.querySelector('.podium-name');
        const xpEl = el.querySelector('.podium-xp');
        const imgEl = el.querySelector('img');
        if (nameEl) nameEl.textContent = u.name;
        if (xpEl) xpEl.textContent = (u.xp||0).toLocaleString() + ' XP';
        if (imgEl) imgEl.src = 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + encodeURIComponent(u.name);
      }
    });
  } catch(e) {}
}

function setLBScope(scope) {
  state.lbScope = scope;
  document.querySelectorAll('.lb-tab').forEach(t => t.classList.remove('active'));
  const activeTab = document.getElementById('lb-' + scope);
  if (activeTab) activeTab.classList.add('active');

  const table = document.getElementById('leaderboard-table');
  const myLeagues = document.getElementById('my-leagues-ranks');
  const timeTabs = document.querySelector('.lb-time-tabs');

  if (scope === 'myleagues') {
    if (table) table.style.display = 'none';
    if (myLeagues) myLeagues.style.display = 'block';
    if (timeTabs) timeTabs.style.display = 'none';
    // Hide podium too
    const podium = document.querySelector('.podium-section');
    if (podium) podium.style.display = 'none';
    const yrb = document.querySelector('.your-rank-banner');
    if (yrb) yrb.style.display = 'none';
    loadMyLeagueRanks();
    return;
  }

  // Reset for other tabs
  if (table) table.style.display = '';
  if (myLeagues) myLeagues.style.display = 'none';
  if (timeTabs) timeTabs.style.display = '';
  const podium = document.querySelector('.podium-section');
  if (podium) podium.style.display = '';
  const yrb = document.querySelector('.your-rank-banner');
  if (yrb) yrb.style.display = '';

  initLeaderboard();
}

async function loadMyLeagueRanks() {
  const listEl = document.getElementById('my-leagues-ranks-list');
  const miniListEl = document.getElementById('my-minileagues-ranks-list');
  if (!listEl) return;

  try {
    // Fetch user's registered tournaments
    const [regRes, mlRes] = await Promise.all([
      fetch('/api/leaderboard?myLeagues=true').then(r => r.ok ? r.json() : []),
      fetch('/api/leaderboard?miniLeagues=true').then(r => r.ok ? r.json() : []),
    ]);

    if (!regRes || regRes.length === 0) {
      listEl.innerHTML = '<div style="text-align:center;color:var(--text-muted);padding:32px">You have not joined any leagues or cups yet. Go to Discover to join!</div>';
    } else {
      listEl.innerHTML = regRes.map(item =>
        '<div style="display:flex;align-items:center;gap:14px;padding:12px;background:rgba(255,255,255,0.03);border-radius:12px;margin-bottom:8px;border:1px solid rgba(255,255,255,0.05)">' +
          '<div style="font-size:1.4rem">' + (item.type === 'Cup' ? '🏆' : '⚽') + '</div>' +
          '<div style="flex:1">' +
            '<div style="font-weight:700;color:#fff;font-size:0.88rem">' + item.name + '</div>' +
            '<div style="font-size:0.7rem;color:rgba(255,255,255,0.4)">' + item.type + '</div>' +
          '</div>' +
          '<div style="text-align:right">' +
            '<div style="font-weight:800;font-size:1.1rem;color:' + (item.rank <= 3 ? 'var(--gold)' : '#fff') + '">#' + item.rank + '</div>' +
            '<div style="font-size:0.7rem;color:rgba(255,255,255,0.4)">' + item.xp.toLocaleString() + ' XP</div>' +
          '</div>' +
        '</div>'
      ).join('');
    }

    if (!mlRes || mlRes.length === 0) {
      if (miniListEl) miniListEl.innerHTML = '<div style="text-align:center;color:var(--text-muted);padding:24px">No mini leagues joined yet</div>';
    } else {
      if (miniListEl) miniListEl.innerHTML = mlRes.map(item =>
        '<div style="display:flex;align-items:center;gap:14px;padding:12px;background:rgba(255,255,255,0.03);border-radius:12px;margin-bottom:8px;border:1px solid rgba(255,255,255,0.05)">' +
          '<div style="font-size:1.4rem">👥</div>' +
          '<div style="flex:1">' +
            '<div style="font-weight:700;color:#fff;font-size:0.88rem">' + item.name + '</div>' +
            '<div style="font-size:0.7rem;color:rgba(255,255,255,0.4)">Code: ' + item.code + ' · ' + item.members + ' members</div>' +
          '</div>' +
          '<div style="text-align:right">' +
            '<div style="font-weight:800;font-size:1.1rem;color:' + (item.rank <= 3 ? 'var(--gold)' : '#fff') + '">#' + item.rank + '</div>' +
            '<div style="font-size:0.7rem;color:rgba(255,255,255,0.4)">' + item.xp.toLocaleString() + ' XP</div>' +
          '</div>' +
        '</div>'
      ).join('');
    }
  } catch(e) {
    listEl.innerHTML = '<div style="text-align:center;color:var(--text-muted);padding:32px">Could not load league ranks</div>';
  }
}

function setTimePeriod(period) {
  state.lbPeriod = period;
  document.querySelectorAll('.time-tab').forEach(t => t.classList.remove('active'));
  event.target.classList.add('active');
}

function renderLeaderboardTable(entries) {
  const container = document.getElementById('leaderboard-table');
  if (!container) return;

  container.innerHTML = entries.slice(3).map((u, i) => {
    const displayRank = i + 4;
    return `
      <div class="mini-lb-row ${u.isMe ? 'you-row' : ''}" role="row">
        <div class="lb-rank" style="color: var(--text-muted)">#${displayRank}</div>
        <div class="lb-avatar">
          <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=${u.seed}" alt="${u.name}" width="36" height="36">
          <div class="level-badge-sm ${u.level}">${u.level[0].toUpperCase()}</div>
        </div>
        <div class="lb-info">
          <div class="lb-name">
            <span class="lb-name-flag">${u.flag}</span>
            ${u.name}
            ${u.isMe ? '<span class="level-badge ' + u.level + '">YOU</span>' : ''}
          </div>
          <div class="lb-sub">${u.acc} accuracy</div>
        </div>
        <div class="lb-right">
          <div class="lb-xp">${u.xp} XP</div>
          <div class="lb-acc" style="font-size:0.7rem; color:var(--text-muted)">${u.level}</div>
        </div>
      </div>
    `;
  }).join('');
}

// ─── MINI LEAGUES PAGE ───────────────────────────────────────────
async function initMiniLeagues() {
  const container = document.getElementById('my-leagues-grid');
  if (!container) return;
  container.innerHTML = '<div style="text-align:center;color:var(--text-muted);padding:32px;">Loading leagues...</div>';
  try {
    const data = await fetch('/api/tournaments').then(r => r.ok ? r.json() : []);
    if (!data.length) {
      container.innerHTML = '<div style="text-align:center;color:var(--text-muted);padding:48px;font-size:0.9rem;">No mini leagues yet. Create one or join with an invite code below!</div>';
      return;
    }
    container.innerHTML = data.map(ml => `
    <div class="league-tile" role="button" tabindex="0">
      <div class="league-tile-header">
        <div class="league-tile-badge" style="background:var(--bg-card3)">${ml.type==='Cup'?'🏆':'⚽'}</div>
        <div class="league-tile-info">
          <div class="league-tile-name">${ml.name}</div>
          <div class="league-tile-meta">${ml.type} · ${ml._count?.registrations||0} members</div>
        </div>
      </div>
      <div class="league-tile-body">
        <div class="league-rank-row">
          <span class="league-rank-label">Status</span>
          <span class="league-rank-value" style="color:${ml.userRegistered?'var(--green)':'rgba(255,255,255,0.4)'}">${ml.userRegistered?'✓ Joined':'Not joined'}</span>
        </div>
        <div class="league-members-row">
          <span class="member-count-more">${ml._count?.registrations||0} members${ml.inviteCode?' · Code: <code style="font-size:0.65rem;color:var(--green)">'+ml.inviteCode+'</code>':''}</span>
        </div>
      </div>
    </div>
  `).join('');
  } catch(e) {
    container.innerHTML = '<div style="text-align:center;color:var(--text-muted);padding:32px;">Could not load leagues</div>';
  }
}

function openLeaguePage(id) {
  // Future: navigate to individual league page
  showNotification(`Opening ${DATA.miniLeagues.find(ml => ml.id === id)?.name}...`, 'info');
}

function createLeague() {
  const name = document.getElementById('league-name-input').value.trim();
  if (!name) {
    document.getElementById('league-name-input').style.borderColor = 'var(--red)';
    return;
  }
  const code = 'KO-' + name.replace(/\s/g, '').toUpperCase().slice(0, 6) + '-' + Math.floor(1000 + Math.random() * 9000);
  closeCreateLeague();
  showNotification(`League created! Invite code: ${code}`, 'success');
}

function joinLeague() {
  const code = document.getElementById('join-code-input').value.trim();
  if (!code) return;
  showNotification(`Joining league with code ${code}...`, 'info');
  document.getElementById('join-code-input').value = '';
}

// ─── PROFILE PAGE ────────────────────────────────────────────────
async function initProfile() {
  try {
    const session = await fetch('/api/auth/session').then(r => r.ok ? r.json() : null);
    if (session?.user) {
      const u = session.user;
      const nameEl = document.getElementById('profile-name');
      const xpEl = document.getElementById('profile-xp');
      const emailEl = document.getElementById('profile-email');
      if (nameEl) nameEl.textContent = u.name;
      if (emailEl) emailEl.textContent = u.email;
      if (xpEl) xpEl.textContent = (u.xp||0).toLocaleString() + ' XP';
      const imgEl = document.querySelector('.profile-avatar img');
      if (imgEl) imgEl.src = u.image || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + encodeURIComponent(u.name);
    }
  } catch(e) {}
  renderTrophies();
  renderLeagueAccuracy();
}

function renderTrophies() {
  const container = document.getElementById('trophies-grid');
  if (!container) return;
  container.innerHTML = DATA.trophies.map(t =>
    '<div class="trophy-item ' + (t.unlocked ? '' : 'locked') + '" title="' + t.desc + '">' +
      '<div class="trophy-icon">' + t.icon + '</div>' +
      '<div class="trophy-name">' + t.name + '</div>' +
      '<div class="trophy-desc">' + t.desc + '</div>' +
      (t.unlocked ? '<button onclick="shareTrophy(this)" data-name="' + t.name.replace(/"/g,"&quot;") + '" data-icon="' + t.icon + '" style="margin-top:8px;font-size:0.65rem;font-weight:700;padding:4px 10px;border-radius:100px;background:rgba(29,161,242,0.12);border:1px solid rgba(29,161,242,0.3);color:#1DA1F2;cursor:pointer">Share</button>' : '') +
    '</div>'
  ).join('');
}

function renderLeagueAccuracy() {
  const container = document.getElementById('league-accuracy-list');
  if (!container) return;
  container.innerHTML = DATA.leagueAccuracy.map(la => `
    <div class="acc-row">
      <div class="acc-league-name">${la.name}</div>
      <div class="acc-bar-wrap">
        <div class="acc-bar">
          <div class="acc-bar-fill" style="width:${la.pct}%"></div>
        </div>
      </div>
      <div class="acc-pct">${la.pct}%</div>
    </div>
  `).join('');
}

function useBoost(type) {
  const names = { 'double-xp': 'Double XP', 'scoreline-shield': 'Scoreline Shield', 'wildcard': 'Wildcard' };
  showNotification(`${names[type]} boost activated! It will apply to your next prediction.`, 'success');
}

// ─── MATCH DETAIL MODAL ──────────────────────────────────────────
function openMatchDetail(matchId) {
  const match = DATA.matchDetail[matchId];
  if (!match) return;

  document.getElementById('modal-league-tag').textContent = match.league;
  document.getElementById('modal-home-name').textContent = match.homeName;
  document.getElementById('modal-away-name').textContent = match.awayName;
  document.getElementById('modal-score').textContent = match.score;
  document.getElementById('modal-status').textContent = match.status;
  document.getElementById('modal-venue').textContent = match.venue;

  // Update SVG badges
  document.getElementById('modal-home-svg').innerHTML = `
    <circle cx="30" cy="30" r="28" fill="${match.homeColor}"/>
    <text x="30" y="37" text-anchor="middle" fill="white" font-size="14" font-weight="bold" font-family="sans-serif">${match.homeAbbr}</text>
  `;
  document.getElementById('modal-away-svg').innerHTML = `
    <circle cx="30" cy="30" r="28" fill="${match.awayColor}"/>
    <text x="30" y="37" text-anchor="middle" fill="white" font-size="14" font-weight="bold" font-family="sans-serif">${match.awayAbbr}</text>
  `;

  if (match.isLive) {
    document.getElementById('modal-status').style.color = 'var(--red)';
    document.getElementById('live-pulse-section').classList.remove('hidden');
    document.getElementById('prediction-form').classList.add('hidden');
    // Update momentum
    document.querySelector('.mm-home').style.width = match.homeGP + '%';
    document.querySelector('.mm-away').style.width = match.awayGP + '%';
    document.querySelector('.home-pct').textContent = match.homeGP + '%';
    document.querySelector('.draw-pct').textContent = match.drawGP + '%';
    document.querySelector('.away-pct').textContent = match.awayGP + '%';
  } else {
    document.getElementById('modal-status').style.color = 'var(--text-secondary)';
    document.getElementById('live-pulse-section').classList.add('hidden');
    document.getElementById('prediction-form').classList.remove('hidden');
  }

  if (window.animateModalEnter) {
    window.animateModalEnter(
      document.getElementById('match-modal-overlay'),
      document.getElementById('match-modal')
    );
  } else {
    document.getElementById('match-modal-overlay').classList.remove('hidden');
  }
  document.body.style.overflow = 'hidden';
}

function closeMatchModal() {
  document.getElementById('match-modal-overlay').classList.add('hidden');
  document.body.style.overflow = '';
}

// ─── PREDICTION FORM ─────────────────────────────────────────────
function selectResult(choice, btn) {
  state.selectedResult = choice;
  document.querySelectorAll('.result-btn').forEach(b => b.classList.remove('selected-result'));
  btn.classList.add('selected-result');
}

function updateConfidence(val) {
  const mult = (val / 100).toFixed(1);
  document.getElementById('conf-value').textContent = `${val}% (×${mult})`;
}

function updateScoreline() {
  // Visual feedback
}

function toggleBTTS(choice, btn) {
  state.bttsChoice = choice;
  btn.closest('.toggle-group').querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active-toggle'));
  btn.classList.add('active-toggle');
}

function toggleGoals(choice, btn) {
  state.goalsChoice = choice;
  btn.closest('.toggle-group').querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active-toggle'));
  btn.classList.add('active-toggle');
}


// ─── REAL MATCH DETAIL ───────────────────────────────────────────
// ─── helpers ─────────────────────────────────────────────────────
function _mkAbbr(t) { return t.split(' ').map(w => w[0]).join('').slice(0, 3).toUpperCase(); }

function _applyMatchData(m) {
  const isLive      = m.status === 'LIVE';
  const isCompleted = m.status === 'COMPLETED';
  const scoreEl     = document.getElementById('modal-score');
  const statusEl    = document.getElementById('modal-status');
  const venueEl     = document.getElementById('modal-venue');
  const leagueEl    = document.getElementById('modal-league-tag');
  const homeNameEl  = document.getElementById('modal-home-name');
  const awayNameEl  = document.getElementById('modal-away-name');
  const homeSvgEl   = document.getElementById('modal-home-svg');
  const awaySvgEl   = document.getElementById('modal-away-svg');
  const liveSection = document.getElementById('live-pulse-section');
  const predForm    = document.getElementById('prediction-form');

  if (scoreEl)    scoreEl.textContent  = (isLive || isCompleted) ? (m.homeScore + '\u2013' + m.awayScore) : 'vs';
  if (leagueEl)   leagueEl.textContent = m.league || m.tournament?.name || 'Match';
  if (homeNameEl) homeNameEl.textContent = m.homeTeam;
  if (awayNameEl) awayNameEl.textContent = m.awayTeam;
  if (venueEl)    venueEl.textContent    = m.league || m.tournament?.name || '';

  if (statusEl) {
    if (isLive) {
      const min = m.minute ? m.minute + "'" : '';
      statusEl.textContent = '\uD83D\uDD34 LIVE ' + min;
      statusEl.style.color = 'var(--red)';
    } else if (isCompleted) {
      statusEl.textContent = 'Full Time';
      statusEl.style.color = 'var(--text-secondary)';
    } else {
      statusEl.textContent = new Date(m.matchDate).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
      statusEl.style.color = 'var(--text-secondary)';
    }
  }

  const homeColor = '#1a3a5c', awayColor = '#3a1a2a';
  if (homeSvgEl) homeSvgEl.innerHTML = m.homeLogo
    ? '<image href="' + m.homeLogo + '" x="2" y="2" width="56" height="56" clip-path="circle(28px at 30px 30px)"/>'
    : '<circle cx="30" cy="30" r="28" fill="' + homeColor + '"/><text x="30" y="37" text-anchor="middle" fill="white" font-size="12" font-weight="bold" font-family="sans-serif">' + _mkAbbr(m.homeTeam) + '</text>';
  if (awaySvgEl) awaySvgEl.innerHTML = m.awayLogo
    ? '<image href="' + m.awayLogo + '" x="2" y="2" width="56" height="56" clip-path="circle(28px at 30px 30px)"/>'
    : '<circle cx="30" cy="30" r="28" fill="' + awayColor + '"/><text x="30" y="37" text-anchor="middle" fill="white" font-size="12" font-weight="bold" font-family="sans-serif">' + _mkAbbr(m.awayTeam) + '</text>';

  if (isLive) {
    if (liveSection) liveSection.classList.remove('hidden');
    if (predForm)    predForm.classList.add('hidden');
  } else if (isCompleted) {
    if (liveSection) liveSection.classList.add('hidden');
    if (predForm)    predForm.classList.add('hidden');
  } else {
    if (liveSection) liveSection.classList.add('hidden');
    if (predForm)    predForm.classList.remove('hidden');
    if (m.userPrediction) {
      const hs = document.getElementById('score-home-input');
      const as = document.getElementById('score-away-input');
      if (hs) hs.value = m.userPrediction?.homeScore ?? '';
      if (as) as.value = m.userPrediction?.awayScore ?? '';
      
      // Auto-select result button
      const pHome = m.userPrediction?.homeScore ?? 0;
      const pAway = m.userPrediction?.awayScore ?? 0;
      if (pHome > pAway) selectResult('home', document.getElementById('rb-home'));
      else if (pHome < pAway) selectResult('away', document.getElementById('rb-away'));
      else selectResult('draw', document.getElementById('rb-draw'));

      const scorerInput = document.getElementById('scorer-select');
      if (scorerInput) scorerInput.value = m.userPrediction?.firstGoalScorer ?? '';
    } else {
      // Clear previous inputs
      const hs = document.getElementById('score-home-input');
      const as = document.getElementById('score-away-input');
      const scorerInput = document.getElementById('scorer-select');
      if (hs) hs.value = '';
      if (as) as.value = '';
      if (scorerInput) scorerInput.value = '';
      document.querySelectorAll('.result-btn').forEach(b => b.classList.remove('selected-result'));
      state.selectedResult = null;
    }
  }
}

async function _fetchAndApplyLive(matchId) {
  try {
    const live = await fetch('/api/matches/live?id=' + matchId).then(r => r.ok ? r.json() : null);
    if (!live) return;
    _applyMatchData(live);
    if (live.status === 'COMPLETED') {
      if (state._liveScoreInterval) {
        clearInterval(state._liveScoreInterval);
        state._liveScoreInterval = null;
      }
      renderFixturesList();
    }
  } catch(e) { /* silent — stale data shows until next poll */ }
}

async function openRealMatchDetail(matchId) {
  if (state._liveScoreInterval) {
    clearInterval(state._liveScoreInterval);
    state._liveScoreInterval = null;
  }
  state._currentMatchId = matchId;
  try {
    const matches = await fetch('/api/matches').then(r => r.ok ? r.json() : []);
    const m = matches.find(x => x.id === matchId);
    if (!m) { showNotification('Match not found', 'error'); return; }
    _applyMatchData(m);

    if (window.animateModalEnter) {
      window.animateModalEnter(document.getElementById('match-modal-overlay'), document.getElementById('match-modal'));
    } else {
      document.getElementById('match-modal-overlay').classList.remove('hidden');
    }
    document.body.style.overflow = 'hidden';

    if (m.status === 'LIVE') {
      // Immediate live fetch then poll every 10s
      _fetchAndApplyLive(matchId);
      state._liveScoreInterval = setInterval(() => {
        if (document.getElementById('match-modal-overlay').classList.contains('hidden')) {
          clearInterval(state._liveScoreInterval);
          state._liveScoreInterval = null;
          return;
        }
        _fetchAndApplyLive(matchId);
      }, 10000);
    }
  } catch(e) {
    showNotification('Could not load match details', 'error');
  }
}

async function submitPrediction() {
  const homeScoreInput = document.getElementById('score-home-input').value;
  const awayScoreInput = document.getElementById('score-away-input').value;

  if (homeScoreInput === '' || awayScoreInput === '') {
    showNotification('Please enter an exact scoreline prediction!', 'warning');
    return;
  }

  const confidence = parseInt(document.getElementById('confidence-slider').value) || 50;
  const homeScore  = parseInt(homeScoreInput);
  const awayScore  = parseInt(awayScoreInput);
  const scorer     = document.getElementById('scorer-select').value;

  // Use the real match ID stored on the current fixture if available
  const matchId = state._currentMatchId || null;

  if (matchId) {
    const btn = document.querySelector('.submit-prediction-btn');
    if (btn) { btn.disabled = true; btn.textContent = 'Saving…'; }

    const { success, message } = await Backend.submitPrediction(matchId, {
      homeScore,
      awayScore,
      firstGoalScorer: scorer || null,
      confidence,
      isDouble: false,
    });

    if (btn) { btn.disabled = false; btn.textContent = 'Lock In Predictions'; }

    if (success) {
      closeMatchModal();
      const xp = Math.round(30 * (confidence / 100)) + (scorer ? 15 : 0);
      setTimeout(() => showCelebration(xp), 300);
    } else {
      showNotification(message || 'Failed to save prediction', 'error');
    }
  } else {
    // No real match ID yet (mock fixture) — still show celebration
    closeMatchModal();
    const xpEarned = Math.round(100 * (confidence / 100));
    setTimeout(() => showCelebration(xpEarned), 300);
  }
}

// ─── DAILY BONUS ─────────────────────────────────────────────────
function openDailyBonus() {
  state.spinDone = false;
  if (window.animateModalEnter) {
    window.animateModalEnter(
      document.getElementById('bonus-modal-overlay'),
      document.querySelector('.bonus-modal')
    );
  } else {
    document.getElementById('bonus-modal-overlay').classList.remove('hidden');
  }
  document.getElementById('spin-result').classList.add('hidden');
  document.getElementById('spin-btn').disabled = false;
  document.getElementById('spin-btn').textContent = 'SPIN!';
  document.body.style.overflow = 'hidden';
  drawWheel(0);
}

function closeDailyBonus() {
  document.getElementById('daily-bonus-banner').style.display = 'none';
}

function closeBonusModal() {
  document.getElementById('bonus-modal-overlay').classList.add('hidden');
  document.body.style.overflow = '';
}

function drawWheel(angle) {
  const canvas = document.getElementById('spin-wheel');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const prizes = DATA.spinPrizes;
  const arc = (2 * Math.PI) / prizes.length;
  const r = 130;
  const cx = 140; const cy = 140;

  ctx.clearRect(0, 0, 280, 280);

  prizes.forEach((prize, i) => {
    const start = angle + i * arc - Math.PI / 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, start, start + arc);
    ctx.closePath();
    ctx.fillStyle = prize.color;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(start + arc / 2);
    ctx.textAlign = 'right';
    ctx.font = 'bold 12px "Nunito", sans-serif';
    ctx.fillStyle = prize.textColor;
    ctx.fillText(prize.label, r - 8, 5);
    ctx.restore();
  });

  // Center circle
  ctx.beginPath();
  ctx.arc(cx, cy, 24, 0, 2 * Math.PI);
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();
  ctx.strokeStyle = 'rgba(8, 189, 189, 0.8)';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = '#29bf12';
  ctx.font = 'bold 18px "Russo One"';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('⚽', cx, cy);
}

function spinWheel() {
  if (state.spinDone) return;
  state.spinDone = true;

  const btn = document.getElementById('spin-btn');
  btn.disabled = true;
  btn.textContent = 'Spinning...';

  const prizes = DATA.spinPrizes;
  const winIndex = Math.floor(Math.random() * prizes.length);
  const arc = (2 * Math.PI) / prizes.length;
  const fullRotations = 5 + Math.floor(Math.random() * 3);
  const targetAngle = fullRotations * 2 * Math.PI + (prizes.length - winIndex) * arc;

  let currentAngle = 0;
  const duration = 4000;
  const start = performance.now();

  function easeOut(t) {
    return 1 - Math.pow(1 - t, 4);
  }

  function animate(now) {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    currentAngle = easeOut(progress) * targetAngle;
    drawWheel(currentAngle);
    if (progress < 1) {
      requestAnimationFrame(animate);
    } else {
      // Show result
      const prize = prizes[winIndex];
      document.getElementById('spin-result').classList.remove('hidden');
      document.getElementById('spin-result-text').textContent = `You won ${prize.label}!`;
      document.getElementById('xp-counter').textContent = prize.label.includes('XP') ? prize.label : prize.label + ' unlocked!';
      document.getElementById('xp-counter').style.color = prize.textColor;
      btn.textContent = 'Tomorrow!';
      floatXP(prize.label, document.getElementById('bonus-modal-overlay'));
    }
  }

  requestAnimationFrame(animate);
}

// ─── MINI LEAGUES MODALS ─────────────────────────────────────────
function openCreateLeague() {
  if (window.animateModalEnter) {
    window.animateModalEnter(
      document.getElementById('create-league-modal'),
      document.querySelector('.create-league-sheet')
    );
  } else {
    document.getElementById('create-league-modal').classList.remove('hidden');
  }
  document.body.style.overflow = 'hidden';
}

function closeCreateLeague() {
  document.getElementById('create-league-modal').classList.add('hidden');
  document.body.style.overflow = '';
}

// ─── CHAT ────────────────────────────────────────────────────────
function sendChatMsg() {
  const input = document.getElementById('chat-input');
  const text = input.value.trim();
  if (!text) return;

  const feed = document.getElementById('live-chat-feed');
  const msg = document.createElement('div');
  msg.className = 'chat-msg you-msg';
  msg.innerHTML = `<span class="chat-user">🇪🇬 You</span><span class="chat-text">${escapeHtml(text)}</span>`;
  feed.appendChild(msg);
  feed.scrollTop = feed.scrollHeight;
  input.value = '';
}

// ─── CELEBRATION ─────────────────────────────────────────────────
function showCelebration(xp) {
  const overlay = document.getElementById('celebration-overlay');
  const badge = document.getElementById('xp-earned-badge');
  const confettiContainer = document.getElementById('confetti-container');

  badge.textContent = `+${xp.toLocaleString()} XP`;
  overlay.classList.remove('hidden');

  // Confetti
  confettiContainer.innerHTML = '';
  const colors = ['#29BF12', '#ABFF4F', '#08BDBD', '#F21B3F', '#FF9914'];
  for (let i = 0; i < 30; i++) {
    const piece = document.createElement('div');
    piece.className = 'confetti-piece';
    piece.style.cssText = `
      background: ${colors[Math.floor(Math.random() * colors.length)]};
      left: ${Math.random() * 100}%;
      top: ${Math.random() * 60}%;
      animation-delay: ${Math.random() * 0.5}s;
      animation-duration: ${1 + Math.random()}s;
      width: ${6 + Math.random() * 8}px;
      height: ${6 + Math.random() * 8}px;
      border-radius: ${Math.random() > 0.5 ? '50%' : '2px'};
    `;
    confettiContainer.appendChild(piece);
  }

  // Update total XP
  state.totalXP += xp;

  // Auto close
  setTimeout(() => {
    overlay.classList.add('hidden');
  }, 3500);
}

// ─── FLOATING XP NOTIFICATION ────────────────────────────────────
function floatXP(text, parentEl) {
  const el = document.createElement('div');
  el.className = 'xp-float';
  el.textContent = text.includes('XP') ? `+${text}` : text;
  el.style.cssText = `top: 50%; left: 50%; transform: translate(-50%, -50%);`;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2000);
}

// ─── NOTIFICATIONS ───────────────────────────────────────────────
function showNotification(msg, type = 'info') {
  const notif = document.createElement('div');
  const colors = {
    success: { bg: '#FFFFFF', border: 'rgba(41, 191, 18, 0.4)',  text: '#29BF12' },
    warning: { bg: '#FFFFFF', border: 'rgba(255,153,20,0.4)',    text: '#FF9914' },
    error:   { bg: '#FFFFFF', border: 'rgba(242, 27, 63, 0.4)',  text: '#F21B3F' },
    info:    { bg: '#FFFFFF', border: 'rgba(8, 189, 189, 0.4)',  text: '#08BDBD' },
  };
  const c = colors[type] || colors.info;

  notif.style.cssText = `
    position: fixed;
    top: 80px;
    right: 24px;
    background: ${c.bg};
    border: 2px solid ${c.border};
    color: ${c.text};
    padding: 13px 20px;
    border-radius: 16px;
    font-size: 0.88rem;
    font-weight: 700;
    z-index: 9999;
    max-width: 320px;
    animation: slideInRight 0.3s ease;
    box-shadow: 0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06);
  `;
  notif.textContent = msg;
  document.body.appendChild(notif);
  setTimeout(() => {
    notif.style.opacity = '0';
    notif.style.transition = 'opacity 0.3s';
    setTimeout(() => notif.remove(), 350);
  }, 3500);
}

// ─── HELPERS ─────────────────────────────────────────────────────
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function escapeStr(str) {
  return str.replace(/'/g, "\\'").replace(/"/g, '\\"');
}

// ─── KEYBOARD SHORTCUTS ──────────────────────────────────────────
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    closeMatchModal();
    closeBonusModal();
    closeCreateLeague();
    document.getElementById('celebration-overlay').classList.add('hidden');
  }
});

// ─── CHAT: ENTER KEY ────────────────────────────────────────────
document.getElementById('chat-input')?.addEventListener('keydown', e => {
  if (e.key === 'Enter') sendChatMsg();
});

// ─── CLOSE SIDEBAR ON OUTSIDE CLICK ─────────────────────────────
document.addEventListener('click', e => {
  const sidebar = document.getElementById('sidebar');
  const menuBtn = document.getElementById('mobile-menu-btn');
  if (window.innerWidth <= 768 &&
      sidebar.classList.contains('mobile-open') &&
      !sidebar.contains(e.target) &&
      e.target !== menuBtn &&
      !menuBtn.contains(e.target)) {
    sidebar.classList.remove('mobile-open');
  }
});

// ─── SCORE OPTION STYLING ────────────────────────────────────────
document.querySelectorAll('.score-option input[type=radio]').forEach(radio => {
  radio.addEventListener('change', function () {
    document.querySelectorAll('.score-option').forEach(opt => opt.classList.remove('active-option'));
    this.closest('.score-option').classList.add('active-option');
  });
});

// ─── SIMULATE LIVE UPDATES ───────────────────────────────────────
let liveUpdateTimer = null;
function startLiveSimulation() {
  liveUpdateTimer = setInterval(() => {
    const mm = document.querySelector('.mm-home');
    if (mm) {
      const current = parseFloat(mm.style.width) || 42;
      const delta = (Math.random() - 0.5) * 3;
      const next = Math.min(Math.max(current + delta, 20), 70);
      mm.style.width = next + '%';
      const homeEl = document.querySelector('.home-pct');
      if (homeEl) homeEl.textContent = Math.round(next) + '%';
    }
  }, 3000);
}


function shareTrophy(el) {
  const trophyName = el.getAttribute ? el.getAttribute('data-name') : el;
  const trophyIcon = el.getAttribute ? el.getAttribute('data-icon') : arguments[1];
  const text = encodeURIComponent('I just unlocked the "' + trophyName + '" trophy on Matchkoo! ' + trophyIcon + ' Come join me and predict football matches for XP prizes!');
  const url = encodeURIComponent('https://kickoff-taupe.vercel.app');
  const twitterUrl = 'https://twitter.com/intent/tweet?text=' + text + '&url=' + url;
  const whatsappUrl = 'https://wa.me/?text=' + text + '%20' + url;
  const share = document.createElement('div');
  share.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:9999;background:#0F1520;border:1px solid rgba(255,255,255,0.1);border-radius:20px;padding:28px 32px;text-align:center;min-width:280px;box-shadow:0 32px 80px rgba(0,0,0,0.5)';
  share.innerHTML = '<div style="font-size:2.5rem;margin-bottom:8px">' + trophyIcon + '</div>' +
    '<div style="font-weight:800;color:#fff;margin-bottom:4px">' + trophyName + '</div>' +
    '<div style="color:rgba(255,255,255,0.4);font-size:0.8rem;margin-bottom:20px">Share your achievement!</div>' +
    '<div style="display:flex;gap:10px;justify-content:center">' +
      '<a href="' + twitterUrl + '" target="_blank" style="flex:1;padding:10px;background:#1DA1F2;color:#fff;border-radius:12px;text-decoration:none;font-weight:700;font-size:0.85rem">𝕏 Twitter</a>' +
      '<a href="' + whatsappUrl + '" target="_blank" style="flex:1;padding:10px;background:#25D366;color:#fff;border-radius:12px;text-decoration:none;font-weight:700;font-size:0.85rem">WhatsApp</a>' +
    '</div>' +
    '<button onclick="this.parentElement.remove()" style="margin-top:14px;width:100%;padding:8px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);color:rgba(255,255,255,0.4);border-radius:12px;cursor:pointer">Cancel</button>';
  document.body.appendChild(share);
}
// ─── INIT ────────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  navigate('home');
  drawWheel(0);
  startLiveSimulation();

  // XP bar animation on profile load
  setTimeout(() => {
    const xpFill = document.querySelector('.xp-fill');
    if (xpFill) {
      xpFill.style.width = '0%';
      setTimeout(() => { xpFill.style.width = '62.25%'; }, 100);
    }
  }, 500);


});


// ─── CLUBS VOTING PAGE ──────────────────────────────────────────
const CLUBS_DB = {
  'Premier League': { country: 'England', continent: 'europe', clubs: ['Arsenal','Chelsea','Liverpool','Manchester City','Manchester United','Tottenham','Newcastle','Aston Villa','West Ham','Brighton'] },
  'La Liga': { country: 'Spain', continent: 'europe', clubs: ['Real Madrid','Barcelona','Atletico Madrid','Sevilla','Real Sociedad','Villarreal','Athletic Bilbao','Valencia','Betis','Celta Vigo'] },
  'Serie A': { country: 'Italy', continent: 'europe', clubs: ['AC Milan','Inter Milan','Juventus','Napoli','Roma','Lazio','Atalanta','Fiorentina','Torino','Udinese'] },
  'Bundesliga': { country: 'Germany', continent: 'europe', clubs: ['Bayern Munich','Borussia Dortmund','RB Leipzig','Bayer Leverkusen','Eintracht Frankfurt','Union Berlin','Freiburg','Wolfsburg','Mainz','Cologne'] },
  'Ligue 1': { country: 'France', continent: 'europe', clubs: ['PSG','Marseille','Lyon','Monaco','Lille','Nice','Lens','Rennes','Strasbourg','Nantes'] },
  'Egyptian Premier League': { country: 'Egypt', continent: 'africa', clubs: ['Al Ahly','Zamalek','Pyramids','Ismaily','El Geish','ENPPI','Ceramica','Smouha','Ittihad Alexandria','Farco'] },
};

let votedTodayMap = {}; // clubName -> true

async function initVote() {
  // Load today's votes
  try {
    const res = await fetch('/api/clubs/vote');
    if (res.ok) {
      const data = await res.json();
      votedTodayMap = {};
      (data.votedToday || []).forEach(v => { votedTodayMap[v.clubName] = true; });
    }
  } catch(e) {}
  
  renderVoteLeagues();
  loadClubLeaderboard('alltime');
}

function renderVoteLeagues() {
  const container = document.getElementById('vote-leagues-container');
  if (!container) return;
  container.innerHTML = Object.entries(CLUBS_DB).map(([league, data]) =>
    '<div style="margin-bottom:24px">' +
      '<div style="font-size:0.75rem;font-weight:800;color:var(--text-secondary);letter-spacing:1.5px;text-transform:uppercase;padding:0 0 10px;border-bottom:1px solid rgba(255,255,255,0.06);margin-bottom:12px">' + league + ' · ' + data.country + '</div>' +
      '<div style="display:flex;flex-wrap:wrap;gap:8px">' +
        data.clubs.map(club => {
          const voted = votedTodayMap[club];
          return '<button onclick="castVote(this)" data-club="' + club.replace(/"/g,'&quot;') + '" data-country="' + data.country.replace(/"/g,'&quot;') + '" data-continent="' + data.continent + '"' +
            ' style="padding:8px 14px;border-radius:100px;font-size:0.78rem;font-weight:700;cursor:pointer;transition:all 0.2s;' +
            (voted ? 'background:rgba(60,184,46,0.15);border:1px solid rgba(60,184,46,0.4);color:var(--green)' : 'background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);color:rgba(255,255,255,0.7)') + '">' +
            (voted ? '&#10003; ' : '') + club + (voted ? '' : ' +50 XP') +
          '</button>';
        }).join('') +
      '</div>' +
    '</div>'
  ).join('');
}

async function castVote(el) {
  const clubName = el.getAttribute ? el.getAttribute('data-club') : el;
  const country = el.getAttribute ? el.getAttribute('data-country') : arguments[1];
  const continent = el.getAttribute ? el.getAttribute('data-continent') : (arguments[2] || 'world');
  try {
    const res = await fetch('/api/clubs/vote', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ clubName, country, continent }),
    });
    const data = await res.json();
    if (res.ok) {
      votedTodayMap[clubName] = true;
      showNotification('+50 XP! Voted for ' + clubName, 'success');
      renderVoteLeagues();
      loadClubLeaderboard(state.voteLeaderboardPeriod || 'alltime');
    } else {
      showNotification(data.error || 'Vote failed', 'warning');
    }
  } catch(e) {
    showNotification('Network error', 'error');
  }
}

async function loadClubLeaderboard(period) {
  state.voteLeaderboardPeriod = period;
  document.querySelectorAll('.vote-period-tab').forEach(t => t.classList.remove('active'));
  const activeTab = document.getElementById('vote-tab-' + period);
  if (activeTab) activeTab.classList.add('active');

  try {
    const res = await fetch('/api/clubs/leaderboard?period=' + period);
    const data = res.ok ? await res.json() : [];
    renderClubLeaderboard(data);
  } catch(e) {
    renderClubLeaderboard([]);
  }
}

function renderClubLeaderboard(data) {
  const container = document.getElementById('club-leaderboard-list');
  if (!container) return;
  if (!data || data.length === 0) {
    container.innerHTML = '<div style="text-align:center;color:var(--text-muted);padding:32px;">No votes yet. Be the first!</div>';
    return;
  }
  container.innerHTML = data.slice(0, 20).map((club, i) =>
    '<div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.05)">' +
      '<div style="font-weight:800;color:' + (i===0?'#ffd700':i===1?'#c0c0c0':i===2?'#cd7f32':'rgba(255,255,255,0.4)') + ';min-width:28px;text-align:center">' + (i===0?'🥇':i===1?'🥈':i===2?'🥉':'#'+(i+1)) + '</div>' +
      '<div style="flex:1">' +
        '<div style="font-weight:700;color:#fff;font-size:0.9rem">' + club.clubName + '</div>' +
        '<div style="font-size:0.7rem;color:rgba(255,255,255,0.4)">' + club.country + ' · ' + club.continent + '</div>' +
      '</div>' +
      '<div style="font-weight:800;color:var(--green);font-size:0.85rem">' + club.votes.toLocaleString() + ' votes</div>' +
    '</div>'
  ).join('');
}

// ─── AUTH MODAL ──────────────────────────────────────────────────
function openAuthModal() {
  if (window.animateModalEnter) {
    window.animateModalEnter(
      document.getElementById('auth-modal-overlay'),
      document.querySelector('.auth-modal-sheet')
    );
  } else {
    document.getElementById('auth-modal-overlay').classList.remove('hidden');
  }
  document.body.style.overflow = 'hidden';
}

function closeAuthModal() {
  document.getElementById('auth-modal-overlay').classList.add('hidden');
  document.body.style.overflow = '';
}

function continueWithGoogle() {
  showNotification('Connecting to Google...', 'info');
  Backend.loginWithGoogle().then(res => {
    closeAuthModal();
    if (res.user.role === 'admin') {
      showNotification('Successfully logged in! Admin access granted.', 'success');
    } else {
      showNotification('Successfully logged in!', 'success');
    }
    // Update profile UI if needed here
    const authBtn = document.querySelector('.auth-trigger-btn span');
    if (authBtn) authBtn.textContent = 'Account: ' + res.user.name;
  });
}

// ─── LANGUAGE & RTL SWITCHING ────────────────────────────────────
const translations = { ar: {}, de: {}, es: {}, fr: {}, en: {} }; // legacy compat

function changeLanguage(lang) {
  // Sync both dropdowns
  const d = document.getElementById('lang-select-desktop');
  const m = document.getElementById('lang-select-mobile');
  if (d) d.value = lang;
  if (m) m.value = lang;

  // Delegate to full i18n system (i18n.js)
  if (typeof applyTranslations === 'function') {
    applyTranslations(lang);
  }
}
