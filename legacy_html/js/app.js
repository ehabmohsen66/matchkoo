/* ═══════════════════════════════════════════════════════════════
   KICKOFF — MAIN APPLICATION LOGIC
═══════════════════════════════════════════════════════════════ */

'use strict';

// ─── STATE ──────────────────────────────────────────────────────
const state = {
  currentPage: 'home',
  currentContinent: 'europe',
  currentLeague: null,
  predFilter: 'pending',
  lbScope: 'global',
  lbPeriod: 'week',
  spinDone: false,
  selectedResult: null,
  bttsChoice: 'yes',
  goalsChoice: 'over',
  totalXP: 12450,
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
  renderFixturesList();
  renderMiniLeaderboard();
}

function renderFixturesList() {
  const container = document.getElementById('fixtures-list');
  if (!container) return;

  container.innerHTML = DATA.todayFixtures.map(f => `
    <div class="fixture-row" onclick="openMatchDetail('upcoming1')" role="button" tabindex="0">
      <div class="fixture-league-badge" aria-hidden="true">${f.leagueFlag}</div>
      <div class="fixture-teams">
        <div class="fixture-league-name">${f.league}</div>
        <div class="fixture-team-names">${f.home} vs ${f.away}</div>
      </div>
      <div class="fixture-time">${f.time}</div>
      <div class="fixture-pred-indicator ${f.predicted ? 'has-pred' : ''}" title="${f.predicted ? 'Predicted' : 'No prediction yet'}"></div>
    </div>
  `).join('');
}

function renderMiniLeaderboard() {
  const container = document.getElementById('mini-leaderboard');
  if (!container) return;

  // Try to fetch real leaderboard data first
  fetch('/api/leaderboard')
    .then(r => r.ok ? r.json() : null)
    .then(data => {
      if (!data || !data.length) {
        renderMiniLeaderboardStatic(container);
        return;
      }
      const top5 = data.slice(0, 5);
      container.innerHTML = top5.map((u, idx) => {
        const rank = idx + 1;
        const rankIcon = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '#' + rank;
        const avatarContent = u.image
          ? `<img src="${u.image}" alt="${u.name}" width="36" height="36" style="border-radius:50%;object-fit:cover;">`
          : `<div style="width:36px;height:36px;border-radius:50%;background:rgba(60,184,46,0.2);display:flex;align-items:center;justify-content:center;font-weight:700;color:#6FE840;">${(u.name||'?')[0]}</div>`;
        return `
          <div class="mini-lb-row ${u.isMe ? 'you-row' : ''}" role="row"
               onclick="goToProfile('${u.userId}')"
               style="cursor:pointer;transition:background 0.15s;"
               onmouseenter="this.style.background='rgba(60,184,46,0.06)'"
               onmouseleave="this.style.background=''">
            <div class="lb-rank">${rankIcon}</div>
            <div class="lb-avatar">${avatarContent}</div>
            <div class="lb-info">
              <div class="lb-name">
                ${u.name || 'Unknown'}
                ${u.isMe ? '<span class="level-badge gold">YOU</span>' : ''}
              </div>
              <div class="lb-sub">${u.xp.toLocaleString()} XP</div>
            </div>
            <div class="lb-right">
              <div class="lb-xp">${u.xp.toLocaleString()} XP</div>
            </div>
          </div>
        `;
      }).join('');
    })
    .catch(() => renderMiniLeaderboardStatic(container));
}

function renderMiniLeaderboardStatic(container) {
  container.innerHTML = DATA.friendsLeaderboard.map(u => {
    const rankClass = u.rank === 1 ? 'gold-rank' : u.rank === 2 ? 'silver-rank' : u.rank === 3 ? 'bronze-rank' : u.isYou ? 'you-rank' : '';
    return `
      <div class="mini-lb-row ${u.isYou ? 'you-row' : ''}" role="row" style="cursor:pointer;transition:background 0.15s;" onclick="goToProfile('${u.seed}')" onmouseenter="this.style.background='rgba(60,184,46,0.06)'" onmouseleave="this.style.background=''">
        <div class="lb-rank ${rankClass}">${u.rank === 1 ? '🥇' : u.rank === 2 ? '🥈' : u.rank === 3 ? '🥉' : '#'+u.rank}</div>
        <div class="lb-avatar">
          <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=${u.seed}" alt="${u.name}" width="36" height="36">
          <div class="level-badge-sm ${u.level}">${u.level[0].toUpperCase()}</div>
        </div>
        <div class="lb-info">
          <div class="lb-name">
            <span class="lb-name-flag">${u.flag}</span>
            ${u.isYou ? '<strong>' + u.name + '</strong>' : u.name}
            ${u.isYou ? '<span class="level-badge ' + u.level + '">YOU</span>' : ''}
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

function renderLeagues(continentId) {
  const data = DATA.continents[continentId];
  if (!data) return;

  document.getElementById('leagues-title').textContent = `${data.label} Leagues`;
  const grid = document.getElementById('leagues-grid');
  grid.innerHTML = data.leagues.map(l => `
    <div class="league-card" onclick="openLeagueFixtures('${l.id}', '${escapeStr(l.name)}')" role="button" tabindex="0">
      <div class="league-card-icon">${l.emoji}</div>
      <div class="league-card-info">
        <div class="league-card-name">${l.country} ${l.name}</div>
        <div class="league-card-meta">${l.matches} matches</div>
      </div>
    </div>
  `).join('');
}

function openLeagueFixtures(leagueId, leagueName) {
  state.currentLeague = leagueId;
  document.getElementById('leagues-section').classList.add('hidden');
  document.getElementById('league-fixtures-section').classList.remove('hidden');
  document.getElementById('league-fixtures-title').textContent = `${leagueName} Fixtures`;

  // Generate some fixtures for this league
  const fixtures = generateFixturesForLeague(leagueName);
  const container = document.getElementById('fixtures-full-list');
  container.innerHTML = fixtures.map(f => `
    <div class="fixture-row" onclick="openMatchDetail('upcoming1')" role="button" tabindex="0">
      <div class="fixture-league-badge">${f.flag}</div>
      <div class="fixture-teams">
        <div class="fixture-league-name">${leagueName}</div>
        <div class="fixture-team-names">${f.home} vs ${f.away}</div>
      </div>
      <div class="fixture-time">${f.time}</div>
      <div class="fixture-pred-indicator ${f.predicted ? 'has-pred' : ''}"></div>
    </div>
  `).join('');
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

function renderPredictions(filter) {
  const container = document.getElementById('predictions-list');
  if (!container) return;

  let preds = DATA.predictions;
  if (filter !== 'all') {
    preds = preds.filter(p => p.status === filter);
  }

  if (preds.length === 0) {
    container.innerHTML = `<div style="text-align:center; color:var(--text-muted); padding:48px; font-size:0.9rem;">No ${filter} predictions</div>`;
    return;
  }

  container.innerHTML = preds.map(p => `
    <div class="pred-item ${p.status}" role="listitem">
      <div class="pred-item-header">
        <span class="pred-item-league">${p.league}</span>
        <span class="pred-item-status-badge status-${p.status}">
          ${p.status === 'correct' ? '✓ Correct' : p.status === 'wrong' ? '✗ Wrong' : '⏳ Pending'}
        </span>
      </div>
      <div class="pred-item-match">${p.match}</div>
      <div class="pred-item-picks">
        ${p.picks.map(pick => `<span class="pred-pick-tag ${p.status === 'correct' && pick.includes('✓') ? 'correct-tag' : ''}">${pick}</span>`).join('')}
      </div>
      <div class="pred-item-xp" style="color:${p.status === 'correct' ? 'var(--gold)' : p.status === 'wrong' ? 'var(--text-muted)' : 'var(--text-secondary)'}">
        ${p.xp}
      </div>
    </div>
  `).join('');
}

// ─── LEADERBOARD PAGE ────────────────────────────────────────────
function initLeaderboard() {
  const container = document.getElementById('leaderboard-table');
  if (container) container.innerHTML = '<div style="text-align:center;padding:40px;color:rgba(255,255,255,0.3);font-size:0.85rem;">Loading rankings…</div>';

  fetch('/api/leaderboard')
    .then(r => r.ok ? r.json() : null)
    .then(data => {
      if (!data || !data.length) {
        renderLeaderboardTableStatic(DATA.leaderboard);
        return;
      }
      renderLeaderboardTableReal(data);
    })
    .catch(() => renderLeaderboardTableStatic(DATA.leaderboard));
}

function setLBScope(scope) {
  state.lbScope = scope;
  document.querySelectorAll('.lb-tab').forEach(t => t.classList.remove('active'));
  document.getElementById(`lb-${scope}`).classList.add('active');
  initLeaderboard();
}

function setTimePeriod(period) {
  state.lbPeriod = period;
  document.querySelectorAll('.time-tab').forEach(t => t.classList.remove('active'));
  event.target.classList.add('active');
  initLeaderboard();
}

// ── Real data renderer (with clickable rows) ──────────────────────
function renderLeaderboardTableReal(entries) {
  const container = document.getElementById('leaderboard-table');
  if (!container) return;

  // Top 3 podium update with real data
  const top3 = entries.slice(0, 3);
  top3.forEach((u, i) => {
    const ranks = ['rank1', 'rank2', 'rank3'];
    // Correct podium order: 2nd, 1st, 3rd
    const podiumOrder = [1, 0, 2]; // index in top3 for each podium slot
    const card = document.querySelectorAll('.podium-card')[i];
    if (!card) return;
    const nameEl = card.querySelector('.podium-name');
    const xpEl   = card.querySelector('.podium-xp');
    const imgEl  = card.querySelector('.podium-avatar img');
    const user   = entries[podiumOrder[i]];
    if (!user) return;
    if (nameEl) nameEl.textContent = user.name || 'Unknown';
    if (xpEl)   xpEl.textContent  = (user.xp || 0).toLocaleString() + ' XP';
    if (imgEl && user.image) { imgEl.src = user.image; imgEl.alt = user.name; }
    // Make podium card clickable
    card.style.cursor = 'pointer';
    card.onclick = () => goToProfile(user.userId);
  });

  // Rows 4+
  container.innerHTML = entries.slice(3).map((u, i) => {
    const displayRank = i + 4;
    const avatarContent = u.image
      ? `<img src="${u.image}" alt="${u.name}" width="36" height="36" style="border-radius:50%;object-fit:cover;">`
      : `<div style="width:36px;height:36px;border-radius:50%;background:rgba(60,184,46,0.2);display:flex;align-items:center;justify-content:center;font-weight:700;color:#6FE840;font-size:0.85rem;">${(u.name||'?')[0]}</div>`;
    return `
      <div class="mini-lb-row ${u.isMe ? 'you-row' : ''}" role="row"
           onclick="goToProfile('${u.userId}')"
           style="cursor:pointer;transition:background 0.15s;"
           onmouseenter="this.style.background='rgba(60,184,46,0.06)'"
           onmouseleave="this.style.background=''">
        <div class="lb-rank" style="color: var(--text-muted)">#${displayRank}</div>
        <div class="lb-avatar">${avatarContent}</div>
        <div class="lb-info">
          <div class="lb-name">
            ${u.name || 'Unknown'}
            ${u.isMe ? '<span class="level-badge gold">YOU</span>' : ''}
          </div>
          <div class="lb-sub">${(u.xp || 0).toLocaleString()} XP · ${u.accuracy || 0}% acc</div>
        </div>
        <div class="lb-right">
          <div class="lb-xp">${(u.xp || 0).toLocaleString()} XP</div>
        </div>
      </div>
    `;
  }).join('');
}

// ── Static fallback renderer ──────────────────────────────────────
function renderLeaderboardTableStatic(entries) {
  const container = document.getElementById('leaderboard-table');
  if (!container) return;

  container.innerHTML = entries.slice(3).map((u, i) => {
    const displayRank = i + 4;
    return `
      <div class="mini-lb-row ${u.isYou ? 'you-row' : ''}" role="row" style="cursor:pointer;transition:background 0.15s;" onclick="goToProfile('${u.seed}')" onmouseenter="this.style.background='rgba(60,184,46,0.06)'" onmouseleave="this.style.background=''">
        <div class="lb-rank" style="color: var(--text-muted)">#${displayRank}</div>
        <div class="lb-avatar">
          <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=${u.seed}" alt="${u.name}" width="36" height="36">
          <div class="level-badge-sm ${u.level}">${u.level[0].toUpperCase()}</div>
        </div>
        <div class="lb-info">
          <div class="lb-name">
            <span class="lb-name-flag">${u.flag}</span>
            ${u.name}
            ${u.isYou ? '<span class="level-badge ' + u.level + '">YOU</span>' : ''}
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
function initMiniLeagues() {
  const container = document.getElementById('my-leagues-grid');
  if (!container) return;

  container.innerHTML = DATA.miniLeagues.map(ml => `
    <div class="league-tile" onclick="openLeaguePage('${ml.id}')" role="button" tabindex="0">
      <div class="league-tile-header">
        <div class="league-tile-badge" style="background: var(--bg-card3)">${ml.badge}</div>
        <div class="league-tile-info">
          <div class="league-tile-name">${ml.name}</div>
          <div class="league-tile-meta">${ml.competitions.join(' · ')}</div>
        </div>
      </div>
      <div class="league-tile-body">
        <div class="league-rank-row">
          <span class="league-rank-label">Your Rank</span>
          <span class="league-rank-value">#${ml.myRank} / ${ml.members}</span>
        </div>
        <div class="league-members-row">
          <div class="member-avatar-stack">
            ${ml.memberSeeds.slice(0, 4).map(s => `<img src="https://api.dicebear.com/7.x/avataaars/svg?seed=${s}" alt="member" width="24" height="24">`).join('')}
          </div>
          <span class="member-count-more">${ml.members} members · Code: <code style="font-size:0.65rem;color:var(--green)">${ml.inviteCode}</code></span>
        </div>
      </div>
    </div>
  `).join('');
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
function initProfile() {
  renderTrophies();
  renderLeagueAccuracy();
}

function renderTrophies() {
  const container = document.getElementById('trophies-grid');
  if (!container) return;
  container.innerHTML = DATA.trophies.map(t => `
    <div class="trophy-item ${t.unlocked ? '' : 'locked'}" title="${t.desc}">
      <div class="trophy-icon">${t.icon}</div>
      <div class="trophy-name">${t.name}</div>
      <div class="trophy-desc">${t.desc}</div>
    </div>
  `).join('');
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

function submitPrediction() {
  if (!state.selectedResult) {
    showNotification('Please pick a match result first!', 'warning');
    return;
  }

  const confidence = document.getElementById('confidence-slider').value;
  const homeScore = document.getElementById('score-home-input').value;
  const awayScore = document.getElementById('score-away-input').value;
  const scorer = document.getElementById('scorer-select').value;

  let xpEarned = Math.round(100 * (confidence / 100));
  if (homeScore !== '' && awayScore !== '') xpEarned += 500;
  if (scorer) xpEarned += 300;
  xpEarned += 75 + 75; // BTTS + goals

  closeMatchModal();
  setTimeout(() => showCelebration(xpEarned), 300);
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

// Navigate to a user's public profile page
function goToProfile(userId) {
  if (!userId) return;
  window.location.href = '/profile/' + userId;
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

  // Simulate new notification after a few seconds
  setTimeout(() => {
    showNotification('🔴 Arsenal just scored! Check Live Pulse.', 'info');
  }, 5000);

  setTimeout(() => {
    showNotification('🏆 You moved up 3 places in "Office FC"!', 'success');
  }, 9000);
});

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
const translations = {
  ar: { 'Home': 'الرئيسية', 'Discover': 'اكتشف', 'Predictions': 'توقعاتي', 'Leaderboard': 'المتصدرين', 'Mini Leagues': 'دورياتي', 'Profile': 'حسابي' },
  de: { 'Home': 'Startseite', 'Discover': 'Entdecken', 'Predictions': 'Tipps', 'Leaderboard': 'Bestenliste', 'Mini Leagues': 'Mini-Ligen', 'Profile': 'Profil' },
  es: { 'Home': 'Inicio', 'Discover': 'Descubrir', 'Predictions': 'Predicciones', 'Leaderboard': 'Clasificación', 'Mini Leagues': 'Mini Ligas', 'Profile': 'Perfil' },
  fr: { 'Home': 'Accueil', 'Discover': 'Découvrir', 'Predictions': 'Prédictions', 'Leaderboard': 'Classement', 'Mini Leagues': 'Mini Ligues', 'Profile': 'Profil' },
  en: { 'Home': 'Home', 'Discover': 'Discover', 'Predictions': 'Predictions', 'Leaderboard': 'Leaderboard', 'Mini Leagues': 'Mini Leagues', 'Profile': 'Profile' }
};

function changeLanguage(lang) {
  // Sync both dropdowns
  document.getElementById('lang-select-desktop').value = lang;
  document.getElementById('lang-select-mobile').value = lang;

  // RTL handling
  if (lang === 'ar') {
    document.documentElement.setAttribute('dir', 'rtl');
    document.body.style.fontFamily = "'Chakra Petch', sans-serif"; // Would use an Arabic font here
  } else {
    document.documentElement.setAttribute('dir', 'ltr');
  }

  // Basic Translation of Sidebar
  const dict = translations[lang] || translations.en;
  
  if(document.getElementById('nav-home')) document.getElementById('nav-home').querySelector('span').textContent = dict['Home'];
  if(document.getElementById('nav-discover')) document.getElementById('nav-discover').querySelector('span').textContent = dict['Discover'];
  if(document.getElementById('nav-predictions')) document.getElementById('nav-predictions').querySelector('span').textContent = dict['Predictions'];
  if(document.getElementById('nav-leaderboard')) document.getElementById('nav-leaderboard').querySelector('span').textContent = dict['Leaderboard'];
  if(document.getElementById('nav-minileague')) document.getElementById('nav-minileague').querySelector('span').textContent = dict['Mini Leagues'];
  if(document.getElementById('nav-profile')) document.getElementById('nav-profile').querySelector('span').textContent = dict['Profile'];
  
  showNotification(`Language changed to ${lang.toUpperCase()}`, 'success');
}
