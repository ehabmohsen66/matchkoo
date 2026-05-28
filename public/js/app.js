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
  fixtureLeagueFilter: 'all',  // active league pill on home upcoming fixtures
  lbScope: 'global',
  lbPeriod: 'week',
  spinDone: false,
  selectedResult: null,
  bttsChoice: 'yes',
  goalsChoice: 'over',
  totalXP: 0,
  _livePoller: null,        // setInterval ID for live score polling
};

// ─── LANGUAGE-AWARE URL HELPERS ──────────────────────────────────
const SUPPORTED_LANGS = ['en', 'ar', 'de', 'es', 'fr'];

function _detectLangFromPath(path) {
  const parts = path.split('/').filter(Boolean); // ['ar','app','leagues']
  if (parts.length > 0 && SUPPORTED_LANGS.includes(parts[0])) {
    return parts[0];
  }
  return 'en';
}

function _detectPageFromPath(path) {
  const parts = path.split('/').filter(Boolean);
  // e.g. ['ar','app','leagues','premier-league'] or ['app','leagues']
  const appIdx = parts.indexOf('app');
  if (appIdx !== -1 && parts.length > appIdx + 1) {
    return parts[appIdx + 1]; // the segment after /app/
  }
  return 'home';
}

/** Returns the league/continent slug from a path like /app/leagues/premier-league */
function _detectLeagueSlugFromPath(path) {
  const parts = path.split('/').filter(Boolean);
  const appIdx = parts.indexOf('app');
  if (appIdx !== -1 && parts[appIdx + 1] === 'leagues' && parts.length > appIdx + 2) {
    return parts[appIdx + 2]; // e.g. 'premier-league' or 'europe'
  }
  return null;
}

function _buildUrl(lang, page) {
  const base = lang === 'en' ? '/app' : '/' + lang + '/app';
  return page === 'home' ? base : base + '/' + page;
}

// ─── NAVIGATION ──────────────────────────────────────────────────
function navigate(page, skipHistory = false) {
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
  if (page === 'live') initLivePage();
  if (page === 'leagues') initLeaguesPage();
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

  // Update History API with language-prefixed URL
  if (!skipHistory) {
    const lang = window._currentLang || 'en';
    const newUrl = _buildUrl(lang, page);
    window.history.pushState({ page, lang }, '', newUrl);
  }
}

window.addEventListener('popstate', (e) => {
  const pg = e.state?.page || _detectPageFromPath(window.location.pathname);
  const lg = e.state?.lang || _detectLangFromPath(window.location.pathname);
  if (lg !== window._currentLang) {
    if (typeof applyTranslations === 'function') applyTranslations(lg);
  }
  navigate(pg, true);

  // Restore league/continent state from URL
  if (pg === 'leagues') {
    const slug = e.state?.leagueSlug || _detectLeagueSlugFromPath(window.location.pathname);
    const continentId = e.state?.continentId;
    if (e.state?.leagueId && e.state?.leagueName) {
      // Restore specific league fixture view
      setTimeout(() => openLeagueFixtures(e.state.leagueId, e.state.leagueName, true), 50);
    } else if (continentId) {
      setTimeout(() => selectContinent(continentId, true), 50);
    } else if (slug) {
      setTimeout(() => _restoreLeagueFromSlug(slug), 50);
    }
  }
});

function toggleMobileSidebar() {
  document.getElementById('sidebar').classList.toggle('mobile-open');
}

// ─── HOME PAGE ───────────────────────────────────────────────────
function initHome() {
  renderLiveMatches();
  renderFixturesList();
  renderMiniLeaderboard();
  loadHomeWidgets();
  initChallenges();
  _checkDailySpinStatus();
  _startLiveScorePolling(); // auto-refresh live scores
  initLiveTicker();         // live events ticker strip
}

// ─── LIVE EVENTS TICKER ──────────────────────────────────────────
let _tickerInterval = null;

async function initLiveTicker() {
  await _refreshTicker();
  // Refresh every 90 seconds
  if (_tickerInterval) clearInterval(_tickerInterval);
  _tickerInterval = setInterval(_refreshTicker, 90000);
}

async function _refreshTicker() {
  const track    = document.getElementById('ticker-track');
  const viewport = document.getElementById('ticker-viewport');
  if (!track) return;

  try {
    const res  = await fetch('/api/live-events');
    if (!res.ok) throw new Error('Failed');
    const data = await res.json();
    const events = data.events || [];

    if (events.length === 0) {
      // ── No live matches → show football news headlines ──────────
      if (viewport) viewport.style.display = 'flex';
      await _showNewsTicker(track);
      return;
    }

    // ── Live events found — show goals/cards ticker ──────────────
    if (viewport) viewport.style.display = 'flex';

    // Get user's preferred leagues for filtering
    const userLeagues = (window.Backend && Backend.preferredLeagues) || [];

    let filtered = events;
    if (userLeagues.length > 0) {
      const userLower = userLeagues.map(l => l.toLowerCase());
      const byLeague = events.filter(evt => {
        const t = (evt.tournament || '').toLowerCase();
        return userLower.some(ul => t.includes(ul) || ul.includes(t));
      });
      if (byLeague.length > 0) filtered = byLeague;
    }

    // Build ticker items
    const items = filtered.map(evt => {
      const isGoal = evt.type === 'Goal';
      const icon   = isGoal ? '⚽' : '🟥';
      const extra  = evt.detail === 'Penalty' ? ' <span style="font-size:0.7rem;opacity:0.6">(P)</span>'
                   : evt.detail === 'Own Goal' ? ' <span style="font-size:0.7rem;opacity:0.6">(OG)</span>'
                   : '';
      const player = evt.playerName || evt.teamName || '';
      const score  = evt.homeTeam + ' <span class="ticker-score">' + evt.score + '</span> ' + evt.awayTeam;
      return `<span class="ticker-item">${icon} <strong>${player}</strong>${extra} <span style="opacity:0.45">${evt.time}'</span> · ${score} <span class="ticker-sep">|</span></span>`;
    }).join('');

    // Duplicate for seamless loop
    track.innerHTML = items + items;
    const duration = Math.max(18, Math.min(60, filtered.length * 5));
    track.style.animationDuration = duration + 's';

  } catch {
    // Silent fail — try to show news instead
    if (track.querySelector('.ticker-placeholder') || track.querySelector('.ticker-no-live')) {
      await _showNewsTicker(track);
    }
  }
}

// News keyword map per league (matches against headline text)
const _NEWS_KEYWORDS = {
  'english premier league': ['premier league','arsenal','chelsea','liverpool','manchester city','manchester united','tottenham','spurs','newcastle','aston villa','west ham','brighton','everton','brentford','fulham','wolves','nottingham','leicester','ipswich','bournemouth','crystal palace','southampton'],
  'la liga': ['la liga','real madrid','barcelona','atletico','atletico madrid','sevilla','valencia','villarreal','real sociedad','athletic bilbao','real betis','osasuna','getafe','girona'],
  'uefa champions league': ['champions league','ucl','europa league','europa conference','uefa'],
  'egyptian premier league': ['egyptian','al ahly','zamalek','pyramids','al masry','ismaily','egypt football','caf'],
  'fifa world cup': ['world cup','fifa','international','nations league'],
};

let _newsCache = null; // { items, cachedAt }
const _NEWS_TTL = 30 * 60 * 1000; // 30 min

async function _showNewsTicker(track) {
  try {
    // Use memory cache to avoid re-fetching on every 90s tick
    if (!_newsCache || Date.now() - _newsCache.cachedAt > _NEWS_TTL) {
      const res = await fetch('/api/football-news');
      if (!res.ok) throw new Error('No news');
      const data = await res.json();
      _newsCache = { items: data.news || [], cachedAt: Date.now() };
    }

    let news = _newsCache.items;
    if (!news.length) {
      track.innerHTML = '<span class="ticker-no-live">📰 Football news unavailable right now</span>';
      return;
    }

    // Filter by user's preferred leagues if they have any
    const userLeagues = (window.Backend && Backend.preferredLeagues) || [];
    if (userLeagues.length > 0) {
      const keywords = userLeagues.flatMap(league => {
        const key = league.toLowerCase();
        for (const [k, kws] of Object.entries(_NEWS_KEYWORDS)) {
          if (k.includes(key) || key.includes(k)) return kws;
        }
        return [key];
      });
      const filtered = news.filter(n =>
        keywords.some(kw => n.title.toLowerCase().includes(kw))
      );
      if (filtered.length >= 3) news = filtered;
    }

    // Build ticker items
    const items = news.map(n => {
      const age = n.ageLabel ? `<span style="opacity:0.45;font-size:0.75rem"> · ${n.ageLabel}</span>` : '';
      const src = `<span style="color:var(--cyan);font-size:0.75rem;opacity:0.7"> ${n.source}</span>`;
      return `<span class="ticker-item">📰 <span style="color:var(--text-primary)">${n.title}</span>${src}${age} <span class="ticker-sep">|</span></span>`;
    }).join('');

    // Duplicate for seamless loop
    track.innerHTML = items + items;
    // Slower scroll for reading news (longer items)
    const duration = Math.max(40, news.length * 6);
    track.style.animationDuration = duration + 's';
  } catch {
    track.innerHTML = '<span class="ticker-no-live">📰 No news right now — check back soon</span>';
  }
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

  // Vote Your Club home widget
  await _renderHomeVoteWidget();
}

async function _renderHomeVoteWidget() {
  const clubEl = document.getElementById('home-top-clubs');
  if (!clubEl) return;
  try {
    // Fetch leaderboard + vote state in parallel, and ensure logos are loaded
    const [lbClubs, voteState] = await Promise.all([
      fetch('/api/clubs/leaderboard?period=weekly').then(r => r.ok ? r.json() : []),
      fetch('/api/clubs/vote-state').then(r => r.ok ? r.json() : {}).catch(() => {}),
      ensureClubLogosLoaded()
    ]);

    const voted = voteState?.votedClub || '';
    const topClubs = lbClubs.slice(0, 10);

    if (!topClubs.length) {
      clubEl.innerHTML = '<div style="text-align:center;color:var(--text-muted);font-size:0.85rem;padding:20px">No votes this week yet — be the first! <button onclick="navigate(\'vote\')" style="background:none;border:none;color:var(--green);cursor:pointer;font-weight:700;font-family:inherit">Vote Now →</button></div>';
      return;
    }

    const colours = ['#e63946','#457b9d','#2a9d8f','#e9c46a','#f4a261','#6a0572','#1982c4','#8ac926','#ff595e','#c77dff'];

    clubEl.innerHTML = topClubs.map((c, i) => {
      const isVoted = voted && voted === c.clubName;
      const isBlocked = voted && !isVoted;
      const initials = (c.clubName || 'CL').split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase();
      const badgeBg = colours[(c.clubName||'').charCodeAt(0) % colours.length];
      const logoUrl = (typeof clubLogosMap !== 'undefined' && clubLogosMap[c.clubName]) || '';
      const rankIcon = i===0?'🥇':i===1?'🥈':i===2?'🥉':'';

      const logoHtml = logoUrl
        ? `<img src="${logoUrl}" alt="${c.clubName}" width="48" height="48" style="border-radius:50%;object-fit:contain;" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'" /><span style="display:none;width:48px;height:48px;border-radius:50%;background:${badgeBg};align-items:center;justify-content:center;font-size:16px;font-weight:900;color:#fff;flex-shrink:0">${initials}</span>`
        : `<span style="width:48px;height:48px;border-radius:50%;background:${badgeBg};display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:900;color:#fff;flex-shrink:0">${initials}</span>`;

      let cardBorder, cardBg, btnStyle, btnLabel;
      if (isVoted) {
        cardBorder = 'rgba(60,184,46,0.4)'; cardBg = 'rgba(60,184,46,0.07)';
        btnStyle = 'background:rgba(60,184,46,0.15);border:1.5px solid rgba(60,184,46,0.5);color:var(--green);cursor:default;';
        btnLabel = '✓ Voted';
      } else if (isBlocked) {
        cardBorder = 'rgba(255,255,255,0.06)'; cardBg = 'rgba(255,255,255,0.02)';
        btnStyle = 'background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);color:rgba(255,255,255,0.25);cursor:not-allowed;opacity:0.5;';
        btnLabel = 'Voted';
      } else {
        cardBorder = 'rgba(255,255,255,0.08)'; cardBg = 'rgba(255,255,255,0.03)';
        btnStyle = 'background:rgba(255,153,20,0.12);border:1.5px solid rgba(255,153,20,0.35);color:#FF9914;cursor:pointer;';
        btnLabel = '❤️ Vote +50 XP';
      }

      const clickAttr = (!isVoted && !isBlocked)
        ? `onclick="_homeVote(this)" data-club="${c.clubName.replace(/"/g,'&quot;')}" data-country="" data-continent="" data-league=""`
        : '';

      return `<div style="flex-shrink:0;width:130px;background:${cardBg};border:1px solid ${cardBorder};border-radius:16px;padding:16px 10px 12px;display:flex;flex-direction:column;align-items:center;gap:8px;transition:transform 0.15s;" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform=''">
        <div style="position:relative;">
          <div style="width:48px;height:48px;display:flex;align-items:center;justify-content:center;">${logoHtml}</div>
          ${rankIcon ? `<div style="position:absolute;top:-6px;right:-10px;font-size:0.85rem">${rankIcon}</div>` : ''}
          ${isVoted ? '<div style="position:absolute;bottom:-2px;right:-2px;width:16px;height:16px;background:#29bf12;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:9px;color:#fff;border:2px solid var(--bg-card)">✓</div>' : ''}
        </div>
        <div style="font-size:0.75rem;font-weight:800;color:#fff;text-align:center;line-height:1.2;word-break:break-word;">${c.clubName}</div>
        <div style="font-size:0.68rem;color:var(--text-muted);font-weight:600;">${c.votes} vote${c.votes !== 1 ? 's' : ''}</div>
        <button ${clickAttr} style="width:100%;padding:6px 4px;border-radius:100px;font-size:0.65rem;font-weight:800;letter-spacing:0.3px;font-family:inherit;transition:all 0.2s;${btnStyle}">${btnLabel}</button>
      </div>`;
    }).join('');

  } catch(e) { if (clubEl) clubEl.innerHTML = ''; }
}

async function _homeVote(el) {
  if (!el) return;
  const club = el.dataset.club;
  const country = el.dataset.country || '';
  const continent = el.dataset.continent || '';
  const league = el.dataset.league || '';
  if (!club) return;
  // Build a fake button element compatible with castVote()
  const fakeEl = { dataset: { club, country, continent, league } };
  await castVote(fakeEl);
  // Re-render the home widget to reflect voted state
  await _renderHomeVoteWidget();
}

// ── Weekly Challenges (real backend) ─────────────────────────────
async function initChallenges() {
  try {
    const res = await fetch('/api/challenges');
    if (!res.ok) return;
    const data = await res.json();

    // Update reset timer
    const timerEl = document.querySelector('.challenge-timer');
    if (timerEl && data.resetIn) timerEl.textContent = 'Resets in ' + data.resetIn;

    // Update each challenge card
    const cards = document.querySelectorAll('.challenge-card');
    data.challenges.forEach(c => {
      cards.forEach(card => {
        const nameEl = card.querySelector('.challenge-name');
        if (!nameEl || nameEl.textContent.trim() !== c.name) return;

        // Progress bar fill
        const pct = Math.min(100, Math.round((c.progress / c.goal) * 100));
        const fillEl = card.querySelector('.progress-fill');
        if (fillEl) fillEl.style.width = pct + '%';

        // Progress text (the <span> inside .challenge-progress)
        const progSpan = card.querySelector('.challenge-progress > span');
        if (progSpan) progSpan.textContent = c.progress + '/' + c.goal;

        // Completed state — green card glow
        if (c.completed) {
          card.style.border = '1px solid rgba(60,184,46,0.5)';
          card.style.background = 'rgba(60,184,46,0.07)';
          const rewardEl = card.querySelector('.challenge-reward');
          if (rewardEl) rewardEl.textContent = '\u2713 Done';
        }

        // Just completed this load \u2014 toast with XP!
        if (c.justCompleted) {
          showNotification('\uD83C\uDF89 ' + c.name + ' complete! +' + c.xp + ' XP', 'success');
        }
      });
    });
  } catch(e) {}
}


async function renderLiveMatches() {
  const container = document.getElementById('live-now-cards');
  if (!container) return;
  
  try {
    const matches = await fetch('/api/matches').then(r => r.ok ? r.json() : []);
    
    // Exact names of the active leagues
    const ACTIVE_LEAGUES = ['premier league', 'la liga', 'uefa champions league', 'egyptian premier league', 'fifa world cup'];
    
    const liveMatches = matches.filter(m => {
      const tName = _normaliseTournamentName(m.tournament?.name);
      return ACTIVE_LEAGUE_NAMES.includes(tName) && m.status === 'LIVE';
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

let _livePageMatches = null; // cache so filter doesn't re-fetch

function setLiveLeagueFilter(league) {
  state.liveLeagueFilter = league;
  // Update active pill state
  document.querySelectorAll('#live-league-filters .fix-pill').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.league === league);
  });
  _renderLivePageMatches();
}

async function initLivePage() {
  state.liveLeagueFilter = state.liveLeagueFilter || 'all';
  // Reset pill to All on fresh navigate
  document.querySelectorAll('#live-league-filters .fix-pill').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.league === state.liveLeagueFilter);
  });

  _livePageMatches = null; // force fresh fetch
  await _renderLivePageMatches();
}

async function _renderLivePageMatches() {
  const container = document.getElementById('all-live-container');
  if (!container) return;

  try {
    if (!_livePageMatches) {
      container.innerHTML = '<div style="color:var(--text-muted);font-size:0.85rem;text-align:center;">Loading live matches...</div>';
      const matches = await fetch('/api/matches').then(r => r.ok ? r.json() : []);
      _livePageMatches = matches.filter(m => {
        const tName = _normaliseTournamentName(m.tournament?.name);
        return ACTIVE_LEAGUE_NAMES.includes(tName) && m.status === 'LIVE';
      });
    }

    const activeLeague = state.liveLeagueFilter || 'all';
    let filtered = _livePageMatches;

    if (activeLeague !== 'all') {
      filtered = filtered.filter(m => {
        const tName = _normaliseTournamentName(m.tournament?.name);
        if (activeLeague === 'english premier league') return tName === 'english premier league' || tName === 'premier league';
        if (activeLeague === 'uefa champions league')  return tName === 'uefa champions league'  || tName === 'champions league';
        return tName === activeLeague;
      });
    }

    if (!filtered.length) {
      const label = activeLeague === 'all' ? 'any league' : activeLeague.replace(/\b\w/g, c => c.toUpperCase());
      container.innerHTML = '<div style="color:var(--text-muted);font-size:0.85rem;text-align:center;padding:32px;">No live matches for ' + label + ' right now.</div>';
      return;
    }

    // Group by league
    const grouped = {};
    filtered.forEach(m => {
      const baseName = (m.tournament?.name || 'Match').replace(/\s+\d{4}(\s+\[\d+\])?$/, '').replace(/\s+\[\d+\]$/, '');
      if (!grouped[baseName]) grouped[baseName] = [];
      grouped[baseName].push(m);
    });

    let html = '';
    for (const [leagueName, items] of Object.entries(grouped)) {
      html += '<div class="fixture-day-header" style="margin-top:8px;">' + leagueName + '</div>';
      items.forEach(m => {
        const matchId = m.id;
        const min = m.minute ? m.minute + "'" : 'LIVE';
        const scoreStr = (m.homeScore??0) + ' \u2013 ' + (m.awayScore??0);
        const hLogo = m.homeLogo ? '<img src="'+m.homeLogo+'" width="36" height="36" style="border-radius:50%;flex-shrink:0;border:1.5px solid rgba(255,255,255,0.1)">' : '<div style="width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,0.06);flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;color:rgba(255,255,255,0.4)">'+m.homeTeam.substring(0,3).toUpperCase()+'</div>';
        const aLogo = m.awayLogo ? '<img src="'+m.awayLogo+'" width="36" height="36" style="border-radius:50%;flex-shrink:0;border:1.5px solid rgba(255,255,255,0.1)">' : '<div style="width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,0.06);flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;color:rgba(255,255,255,0.4)">'+m.awayTeam.substring(0,3).toUpperCase()+'</div>';
        html +=
          '<div class="fixture-row" data-match-id="' + matchId + '" onclick="openRealMatchDetail(\'' + matchId + '\')" role="button" tabindex="0">' +
            '<div style="display:flex;align-items:center;gap:4px;flex-shrink:0;margin-right:10px">' + hLogo + aLogo + '</div>' +
            '<div class="fixture-teams" style="display:flex;align-items:center;gap:10px;flex:1;min-width:0">' +
              '<div style="min-width:0">' +
                '<div class="fixture-league-name" style="color:var(--red)">' + min + '</div>' +
                '<div class="fixture-team-names">' + m.homeTeam + ' vs ' + m.awayTeam + '</div>' +
              '</div>' +
            '</div>' +
            '<div style="display:flex;align-items:center;gap:8px;margin-left:auto">' +
              '<div style="font-family:\'Russo One\',sans-serif;color:var(--text-primary);font-size:1.1rem;letter-spacing:1px;min-width:52px;text-align:right">' + scoreStr + '</div>' +
            '</div>' +
          '</div>';
      });
    }

    container.innerHTML = html;
  } catch(e) {
    container.innerHTML = '<div style="color:var(--text-muted);font-size:0.85rem;text-align:center;">Failed to load live matches.</div>';
  }
}

async function renderFixturesList() {
  const container = document.getElementById('fixtures-list');
  if (!container) return;
  container.innerHTML = '<div style="text-align:center;color:var(--text-muted);padding:32px;">Loading fixtures...</div>';
  try {
    const matches = await fetch('/api/matches').then(r => r.ok ? r.json() : []);
    const now   = new Date();
    const today = new Date(now); today.setHours(0,0,0,0);
    const cutoff = new Date(today); cutoff.setDate(today.getDate() + 7);
    const activeLeague = state.fixtureLeagueFilter || 'all';

    let upcoming = matches.filter(m => {
      const d = new Date(m.matchDate);
      const tName = _normaliseTournamentName(m.tournament?.name);
      const isActive = ACTIVE_LEAGUE_NAMES.includes(tName);
      return isActive && d >= today && d < cutoff && m.status !== 'COMPLETED';
    });

    if (activeLeague !== 'all') {
      upcoming = upcoming.filter(m => {
        const tName = _normaliseTournamentName(m.tournament?.name);
        if (activeLeague === 'english premier league') return tName === 'english premier league' || tName === 'premier league';
        if (activeLeague === 'fifa world cup')          return tName === 'fifa world cup' || tName === 'world cup';
        if (activeLeague === 'uefa champions league')   return tName === 'uefa champions league' || tName === 'champions league';
        return tName === activeLeague;
      });
    }

    if (!upcoming.length) {
      const label = activeLeague === 'all' ? 'your leagues' : activeLeague.replace(/\b\w/g, c => c.toUpperCase());
      container.innerHTML = '<div style="text-align:center;color:var(--text-muted);padding:32px;font-size:0.88rem;">No upcoming fixtures for ' + label + '. Check back soon.</div>';
      return;
    }

    upcoming.sort((a, b) => {
      if (a.status === 'LIVE' && b.status !== 'LIVE') return -1;
      if (b.status === 'LIVE' && a.status !== 'LIVE') return 1;
      return new Date(a.matchDate) - new Date(b.matchDate);
    });

    const DAY_NAMES = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    const VISIBLE_PER_DAY = 3;

    // ── Group matches by day ───────────────────────────────────────────
    const groups = {};
    const groupOrder = [];
    upcoming.forEach(m => {
      const t = new Date(m.matchDate);
      const mDay = new Date(t); mDay.setHours(0,0,0,0);
      const diffDays = Math.round((mDay - today) / 86400000);
      const dayLabel = diffDays === 0 ? 'Today' : diffDays === 1 ? 'Tomorrow' : DAY_NAMES[t.getDay()];
      if (!groups[dayLabel]) { groups[dayLabel] = []; groupOrder.push(dayLabel); }
      groups[dayLabel].push(m);
    });

    // ── Render each day group ──────────────────────────────────────────
    const parts = [];
    groupOrder.forEach(dayLabel => {
      const dayMatches = groups[dayLabel];
      parts.push('<div class="fixture-day-header">' + dayLabel + '</div>');

      dayMatches.forEach((m, idx) => {
        const matchId  = m.id;
        const t        = new Date(m.matchDate);
        const dateStr  = t.toLocaleDateString('en-GB', {day:'2-digit', month:'2-digit', year:'numeric'});
        const timeStr  = dateStr + ' ' + t.toLocaleTimeString('en-GB', {hour:'2-digit', minute:'2-digit'});
        const hasPred  = !!m.userPrediction;
        const baseName = (m.tournament?.name || 'Match').replace(/\s+\d{4}(\s+\[\d+\])?$/, '').replace(/\s+\[\d+\]$/, '');
        const liveScore = m.status === 'LIVE' ? ((m.homeScore??0) + '\u2013' + (m.awayScore??0)) : '';
        const hidden    = idx >= VISIBLE_PER_DAY;

        const hLogo = m.homeLogo
          ? '<img src="' + m.homeLogo + '" width="36" height="36" style="border-radius:50%;flex-shrink:0;border:1.5px solid rgba(255,255,255,0.1)">'
          : '<div style="width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,0.06);flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;color:rgba(255,255,255,0.4)">' + m.homeTeam.substring(0,3).toUpperCase() + '</div>';
        const aLogo = m.awayLogo
          ? '<img src="' + m.awayLogo + '" width="36" height="36" style="border-radius:50%;flex-shrink:0;border:1.5px solid rgba(255,255,255,0.1)">'
          : '<div style="width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,0.06);flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;color:rgba(255,255,255,0.4)">' + m.awayTeam.substring(0,3).toUpperCase() + '</div>';
        parts.push(
          '<div class="fixture-row' + (hidden ? ' fx-hidden' : '') + '" ' +
            'data-match-id="' + matchId + '" ' +
            'data-day="' + dayLabel.replace(/"/g,'') + '" ' +
            (hidden ? 'style="display:none" ' : '') +
            'onclick="openRealMatchDetail(\'' + matchId + '\')" role="button" tabindex="0">' +
            '<div style="display:flex;align-items:center;gap:4px;flex-shrink:0;margin-right:10px">' + hLogo + aLogo + '</div>' +
            '<div class="fixture-teams" style="display:flex;align-items:center;gap:10px;flex:1;min-width:0">' +
              '<div style="min-width:0">' +
                '<div class="fixture-league-name">' + baseName + '</div>' +
                '<div class="fixture-team-names">' + m.homeTeam + ' vs ' + m.awayTeam + '</div>' +
              '</div>' +
            '</div>' +
            '<div style="display:flex;align-items:center;gap:8px;margin-left:16px">' +
              (hasPred ? '<span style="color:var(--green);font-size:1.1rem;font-weight:900" title="Predicted">&#10003;</span>' : '') +
              (m.status === 'LIVE' ? '<span class="live-badge" style="color:#f21b3f;font-size:0.65rem;font-weight:800;padding:2px 7px;border-radius:100px;background:rgba(242,27,63,0.15);border:1px solid rgba(242,27,63,0.3)">LIVE ' + liveScore + '</span>' : '') +
              '<div class="fixture-time live-score-val" style="min-width:110px;text-align:right">' + (m.status === 'LIVE' ? '' : timeStr) + '</div>' +
            '</div>' +
          '</div>'
        );
      });

      // "Show more" button if day has more than VISIBLE_PER_DAY matches
      const extra = dayMatches.length - VISIBLE_PER_DAY;
      if (extra > 0) {
        parts.push(
          '<button class="fx-show-more" ' +
            'data-day="' + dayLabel.replace(/"/g,'') + '" ' +
            'onclick="showMoreFixtures(this)" ' +
            'style="width:100%;margin:6px 0 12px;padding:9px 14px;background:rgba(255,255,255,0.04);' +
                   'border:1px dashed rgba(255,255,255,0.12);border-radius:10px;color:rgba(255,255,255,0.45);' +
                   'font-size:0.8rem;font-weight:700;cursor:pointer;font-family:inherit;transition:all 0.2s;letter-spacing:0.02em;" ' +
            'onmouseover="this.style.background=\'rgba(111,232,64,0.08)\';this.style.color=\'#6FE840\';this.style.borderColor=\'rgba(111,232,64,0.25)\'" ' +
            'onmouseout="this.style.background=\'rgba(255,255,255,0.04)\';this.style.color=\'rgba(255,255,255,0.45)\';this.style.borderColor=\'rgba(255,255,255,0.12)\'">' +
            '+ Show ' + extra + ' more match' + (extra !== 1 ? 'es' : '') +
          '</button>'
        );
      }
    });

    container.innerHTML = parts.join('');
  } catch(e) {
    container.innerHTML = '<div style="text-align:center;color:var(--text-muted);padding:32px;">Could not load fixtures</div>';
  }
}

// Reveals hidden fixture rows for a given day group
function showMoreFixtures(btn) {
  const day = btn.getAttribute('data-day');
  const container = btn.closest('#fixtures-list') || document;
  container.querySelectorAll('.fixture-row.fx-hidden[data-day="' + day + '"]').forEach(el => {
    el.style.display = '';
    el.classList.remove('fx-hidden');
  });
  btn.remove();
}

function setFixtureLeagueFilter(league) {
  state.fixtureLeagueFilter = league;
  document.querySelectorAll('#fixtures-league-filters .fix-pill').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.league === league);
  });
  renderFixturesList();
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

// ─── LIVE SCORE POLLING ──────────────────────────────────────────
// Polls every 60s when any match is LIVE. Updates scores in-place without
// re-rendering the full list. Auto-stops when no live matches remain.
function _startLiveScorePolling() {
  if (state._livePoller) { clearInterval(state._livePoller); state._livePoller = null; }

  state._livePoller = setInterval(async () => {
    try {
      const matches = await fetch('/api/matches').then(r => r.ok ? r.json() : []);
      const hasLive = matches.some(m => m.status === 'LIVE');

      // Update each fixture row currently in the DOM
      matches.forEach(m => {
        const row = document.querySelector('[data-match-id="' + m.id + '"]');
        if (!row) return;
        const scoreEl = row.querySelector('.live-score-val');
        const badgeEl = row.querySelector('.live-badge');
        if (!scoreEl) return;

        if (m.status === 'LIVE') {
          scoreEl.textContent = (m.homeScore ?? 0) + '\u2013' + (m.awayScore ?? 0);
          scoreEl.style.color = '#f21b3f';
          if (badgeEl) badgeEl.style.display = 'inline';
        } else if (m.status === 'COMPLETED') {
          scoreEl.textContent = (m.homeScore ?? 0) + '\u2013' + (m.awayScore ?? 0);
          scoreEl.style.color = 'rgba(255,255,255,0.4)';
          if (badgeEl) badgeEl.style.display = 'none';
        }
      });

      // Also refresh the open match modal if it shows a live game
      const openId = state._openModalMatchId;
      if (openId) {
        const liveM = matches.find(m => m.id === openId && m.status === 'LIVE');
        if (liveM) {
          const modalScore = document.getElementById('modal-score-display');
          if (modalScore) modalScore.textContent = (liveM.homeScore ?? 0) + ' \u2013 ' + (liveM.awayScore ?? 0);
        }
      }

      // Stop polling when no live matches to save network requests
      if (!hasLive) { clearInterval(state._livePoller); state._livePoller = null; }
    } catch (_) { /* silent — never break UX */ }
  }, 60000); // poll every 60 seconds
}

async function renderMiniLeaderboard() {
  const container = document.getElementById('mini-leaderboard') || document.getElementById('home-top-predictors');
  if (!container) return;
  // Already handled by loadHomeWidgets — just delegate to avoid duplication
  try {
    const lb = await fetch('/api/leaderboard').then(r => r.ok ? r.json() : []);
    if (!lb.length) {
      container.innerHTML = '<div style="text-align:center;color:var(--text-muted);padding:20px;font-size:0.85rem">No predictors yet. Be the first!</div>';
      return;
    }
    container.innerHTML = lb.slice(0, 5).map((u, i) => {
      const rankIcon = i===0?'🥇':i===1?'🥈':i===2?'🥉':'#'+(i+1);
      const avatar = u.image || ('https://api.dicebear.com/7.x/avataaars/svg?seed=' + encodeURIComponent(u.name || 'user'));
      return '<div style="display:flex;align-items:center;gap:12px;padding:10px 14px;background:' + (u.isMe?'rgba(60,184,46,0.08)':'rgba(255,255,255,0.03)') + ';border-radius:12px;border:1px solid ' + (u.isMe?'rgba(60,184,46,0.2)':'rgba(255,255,255,0.05)') + '">' +
        '<div style="font-weight:800;min-width:28px;color:' + (i===0?'#ffd700':i===1?'#c0c0c0':i===2?'#cd7f32':'rgba(255,255,255,0.4)') + ';text-align:center">' + rankIcon + '</div>' +
        '<img src="' + avatar + '" width="32" height="32" style="border-radius:50%;border:2px solid rgba(255,255,255,0.1)">' +
        '<div style="flex:1"><div style="font-weight:700;color:#fff;font-size:0.85rem">' + (u.name||'Player') + (u.isMe?' <span style="font-size:0.65rem;color:var(--green)">YOU</span>':'') + '</div></div>' +
        '<div style="font-weight:800;color:var(--green);font-size:0.82rem">' + (u.xp||0).toLocaleString() + ' XP</div>' +
      '</div>';
    }).join('');
  } catch(e) { if (container) container.innerHTML = ''; }
}

// ─── DISCOVER PAGE ───────────────────────────────────────────────
function initLeaguesPage() {
  renderLeagues(state.currentContinent);
}

function selectContinent(id, skipHistory = false) {
  state.currentContinent = id;
  document.querySelectorAll('.continent-card').forEach(c => c.classList.remove('active-continent'));
  const el = document.getElementById(`cont-${id}`);
  if (el) el.classList.add('active-continent');

  // Hide league fixtures if open
  document.getElementById('league-fixtures-section').classList.add('hidden');
  document.getElementById('leagues-section').classList.remove('hidden');

  // Push continent URL: /app/leagues/europe
  if (!skipHistory) {
    const lang = window._currentLang || 'en';
    const base = lang === 'en' ? '/app' : '/' + lang + '/app';
    window.history.pushState({ page: 'leagues', continentId: id, lang }, '', base + '/leagues/' + id);
  }

  renderLeagues(id);
}

// Active league names — ONLY the 5 agreed leagues.
// These MUST match the CANONICAL_NAMES in sync-fixtures/route.ts after normalisation.
const ACTIVE_LEAGUE_NAMES = [
  'english premier league',
  'premier league',          // legacy fallback
  'egyptian premier league',
  'la liga',
  'uefa champions league',
  'champions league',        // legacy fallback
  'fifa world cup',
  'world cup',               // legacy fallback
];

/** Normalise a tournament name from the DB for whitelist matching.
 *  Strips " 2024 [233]", " 2025", " [39]" etc. from the end. */
function _normaliseTournamentName(raw) {
  return (raw || '')
    .toLowerCase()
    .replace(/\s+\d{4}(\s+\[\d+\])?$/, '')  // strip " 2025 [39]" or " 2025"
    .replace(/\s+\[\d+\]$/, '')              // strip any remaining " [39]"
    .trim();
}

function _isLeagueActive(l) {
  if (l.comingSoon === true) return false;
  // Real DB tournaments injected by backend_api: check name against exact whitelist
  if (l._realId || (l.id && l.id.length > 10 && !/^(epl|liga|ucl|egy|wc|caf|mls|bun|ser|l1)/.test(l.id))) {
    const cleanName = _normaliseTournamentName(l.name);
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

    const iconHtml = l.logo
      ? "<img src=\"" + l.logo + "\" alt=\"" + safeName + "\" style=\"width:100%;height:100%;object-fit:contain;\">"
      : l.emoji;

    if (!isActive) {
      // ── Coming Soon card — disabled, no click ─────────────────────
      return "<div class=\"league-card\" style=\"cursor:not-allowed;opacity:0.45;position:relative;user-select:none;\">" +
        "<div class=\"league-card-icon\" style=\"filter:grayscale(0.6)\">" + iconHtml + "</div>" +
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

    // ── Determine follow state ─────────────────────────────────────
    // Canonical name = the l.name as returned by backend after normalisation
    // e.g. "English Premier League", "La Liga"
    const canonicalName = l.canonicalName || l.name; // backend_api sets canonicalName on injected leagues
    const isFollowed = Backend.preferredLeagues.some(p =>
      p.toLowerCase() === canonicalName.toLowerCase() ||
      canonicalName.toLowerCase().includes(p.toLowerCase())
    );

    const followBtn =
      "<button " +
      "  id=\"follow-btn-" + safeId + "\" " +
      "  onclick=\"event.stopPropagation();toggleFollow('" + safeId + "','" + safeName + "','" + canonicalName.replace(/'/g,"\\'") + "')\" " +
      "  style=\"" +
        "flex-shrink:0;margin-left:auto;padding:4px 12px;border-radius:100px;" +
        "border:1px solid " + (isFollowed ? "rgba(111,232,64,0.5)" : "rgba(111,232,64,0.4)") + ";" +
        "background:" + (isFollowed ? "rgba(111,232,64,0.15)" : "rgba(111,232,64,0.1)") + ";" +
        "color:" + (isFollowed ? "#6FE840" : "#6FE840") + ";" + +
        "font-size:0.65rem;font-weight:800;cursor:pointer;font-family:inherit;" +
        "letter-spacing:0.5px;text-transform:uppercase;transition:all 0.2s;white-space:nowrap;" +
      "\">" +
      (isFollowed ? "✓ Joined" : "+ Join") +
      "</button>";

    // ── Active card ────────────────────────────────────────────────
    return "<div class=\"league-card\" onclick=\"openLeagueFixtures('" + safeId + "','" + safeName + "')\" style=\"cursor:pointer\">" +
      "<div class=\"league-card-icon\">" + iconHtml + "</div>" +
      "<div class=\"league-card-info\">" +
        "<div class=\"league-card-name\">" + l.country + " " + l.name + "</div>" +
        "<div class=\"league-card-meta\">" + l.matches + " matches" +
          (isInviteOnly ? " &nbsp;<span style=\"font-size:0.6rem;font-weight:800;padding:2px 6px;border-radius:100px;background:rgba(255,153,20,0.15);color:#ff9914\">🔒 Invite Only</span>" : "") +
          (l.prizes ? " &nbsp;<span style=\"font-size:0.6rem;font-weight:800;padding:2px 6px;border-radius:100px;background:rgba(255,153,20,0.08);color:rgba(255,153,20,0.8)\">🏆 Prizes</span>" : "") +
        "</div>" +
      "</div>" +
      followBtn +
    "</div>";
  }).join("");
}

// ── Join / Leave a league from the Discover page ─────────────────────────
async function toggleFollow(leagueId, leagueName, canonicalName) {
  const btn = document.getElementById('follow-btn-' + leagueId);
  if (!btn) return;

  const currentlyFollowed = btn.textContent.trim().startsWith('✓');
  const action = currentlyFollowed ? 'unfollow' : 'follow';

  // Optimistic UI: disable + show spinner
  btn.disabled = true;
  btn.textContent = '…';

  const ok = await Backend.toggleLeagueFollow(canonicalName, action);

  if (ok) {
    const nowFollowed = action === 'follow';
    btn.textContent = nowFollowed ? '✓ Joined' : '+ Join';
    // Joined → green; Left → subtle grey
    btn.style.border   = '1px solid ' + (nowFollowed ? 'rgba(111,232,64,0.5)' : 'rgba(255,255,255,0.12)');
    btn.style.background = nowFollowed ? 'rgba(111,232,64,0.12)' : 'rgba(255,255,255,0.04)';
    btn.style.color    = nowFollowed ? '#6FE840' : 'rgba(255,255,255,0.55)';

    // Toast feedback
    const toast = document.createElement('div');
    toast.textContent = nowFollowed
      ? '✓ ' + leagueName + ' added to Today\'s Fixtures'
      : leagueName + ' removed from Today\'s Fixtures';
    Object.assign(toast.style, {
      position: 'fixed', bottom: '28px', left: '50%', transform: 'translateX(-50%)',
      background: nowFollowed ? 'rgba(60,184,46,0.92)' : 'rgba(80,80,80,0.92)',
      color: '#fff', padding: '10px 22px', borderRadius: '100px', fontSize: '0.85rem',
      fontWeight: '700', zIndex: '9999', pointerEvents: 'none', fontFamily: 'inherit',
      boxShadow: '0 4px 24px rgba(0,0,0,0.4)', transition: 'opacity 0.4s',
    });
    document.body.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 400); }, 2200);
  } else {
    // Revert on failure
    btn.textContent = currentlyFollowed ? '✓ Joined' : '+ Join';
  }

  btn.disabled = false;
}

function openLeagueFixtures(leagueId, leagueName, skipHistory = false) {
  state.currentLeague = leagueId;
  document.getElementById('leagues-section').classList.add('hidden');
  document.getElementById('league-fixtures-section').classList.remove('hidden');

  // Push unique URL: /app/leagues/{league-slug}
  if (!skipHistory) {
    const slug = leagueName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const lang = window._currentLang || 'en';
    const base = lang === 'en' ? '/app' : '/' + lang + '/app';
    window.history.pushState(
      { page: 'leagues', leagueId, leagueName, leagueSlug: slug, continentId: state.currentContinent, lang },
      '',
      base + '/leagues/' + slug
    );
  }
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
  // Static mock leagues use short ids like 'epl', 'wc2026', etc.
  const looksLikeRealId = leagueId && leagueId.length > 10;

  if (looksLikeRealId) {
    // Fetch both matches and tournament info (for prizes)
    Promise.all([
      fetch('/api/matches?tournamentId=' + encodeURIComponent(leagueId)).then(r => r.ok ? r.json() : []),
      fetch('/api/tournaments').then(r => r.ok ? r.json() : []),
    ]).then(([matches, tournaments]) => {
      // Show prizes if admin configured them
      const t = tournaments.find(t => t.id === leagueId);
      if (prizesSection) {
        if (t?.prizes) {
          prizesSection.style.display = 'block';
          const prizesContent = document.getElementById('league-prizes-content');
          if (prizesContent) prizesContent.textContent = t.prizes;
        } else {
          prizesSection.style.display = 'none';
        }
      }
      if (matches && matches.length > 0) {
        _renderRealFixtures(container, matches, leagueName);
      } else {
        _renderNoFixtures(container, leagueName);
      }
    }).catch(() => _renderNoFixtures(container, leagueName));
  } else {
    // Static/short ID — resolve to real tournament CUID by name matching
    fetch('/api/tournaments').then(r => r.ok ? r.json() : []).then(tournaments => {
      const cleanTarget = leagueName.toLowerCase()
        .replace(/\s+\d{4}(\s+\[\d+\])?$/, '')
        .replace(/\s+\[\d+\]$/, '').trim();

      const matched = tournaments.find(t => {
        const cleanT = (t.name || '').toLowerCase()
          .replace(/\s+\d{4}(\s+\[\d+\])?$/, '')
          .replace(/\s+\[\d+\]$/, '').trim();
        return cleanT === cleanTarget;
      });

      if (matched) {
        // Found the real tournament — fetch its matches
        return fetch('/api/matches?tournamentId=' + encodeURIComponent(matched.id))
          .then(r => r.ok ? r.json() : [])
          .then(matches => {
            if (matches && matches.length > 0) {
              _renderRealFixtures(container, matches, leagueName);
            } else {
              _renderNoFixtures(container, leagueName);
            }
          });
      } else {
        _renderNoFixtures(container, leagueName);
      }
    }).catch(() => _renderNoFixtures(container, leagueName));
  }
}

function _renderNoFixtures(container, leagueName) {
  const name = leagueName || 'this league';
  container.innerHTML =
    '<div style="text-align:center;padding:48px 24px;">' +
      '<div style="font-size:2.5rem;margin-bottom:16px">🏟️</div>' +
      '<div style="font-weight:800;color:#fff;font-size:1.1rem;margin-bottom:8px">No Upcoming Fixtures</div>' +
      '<div style="color:var(--text-muted);font-size:0.85rem;line-height:1.6">No ' + name + ' matches are scheduled yet.<br>Check back soon — fixtures update daily.</div>' +
    '</div>';
}

/** Render real DB-backed fixtures, sorted by upcoming first then date, grouped by round */
function _renderRealFixtures(container, matches, leagueName) {
  // Cache every match so openRealMatchDetail can find it without re-fetching
  if (!state._matchCache) state._matchCache = {};
  matches.forEach(m => { state._matchCache[m.id] = m; });

  // Sort: UPCOMING/LIVE first (by date asc), then COMPLETED (by date desc)
  const sorted = [...matches].sort((a, b) => {
    const aLive = a.status === 'UPCOMING' || a.status === 'LIVE';
    const bLive = b.status === 'UPCOMING' || b.status === 'LIVE';
    if (aLive && !bLive) return -1;
    if (!aLive && bLive) return 1;
    return new Date(a.matchDate) - new Date(b.matchDate);
  });

  // Group by round
  const rounds = {};
  sorted.forEach(m => {
    const r = m.round || 'Fixtures';
    if (!rounds[r]) rounds[r] = [];
    rounds[r].push(m);
  });

  container.innerHTML = Object.entries(rounds).map(([round, roundMatches]) =>
    '<div style="margin-bottom:20px">' +
      '<div style="font-size:0.7rem;font-weight:800;color:var(--text-secondary);letter-spacing:1.5px;text-transform:uppercase;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.06);margin-bottom:8px">' + round + '</div>' +
      roundMatches.map(m => {
        const t = new Date(m.matchDate);
        const timeStr = t.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }) + ' · ' + t.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
        const hasPred = !!m.userPrediction;
        const isCompleted = m.status === 'COMPLETED';
        const isLive = m.status === 'LIVE';
        const scoreOrTime = isCompleted
          ? (m.homeScore + '\u2013' + m.awayScore)
          : isLive ? '\uD83D\uDD34 LIVE' : t.toLocaleDateString('en-GB', {day:'2-digit', month:'2-digit', year:'numeric'}) + ' ' + t.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
        const cleanLeagueName = (leagueName || '').replace(/\s*\[\d+\]$/, '');
        const hLogo = m.homeLogo
          ? '<img src="' + m.homeLogo + '" width="36" height="36" style="border-radius:50%;flex-shrink:0;border:1.5px solid rgba(255,255,255,0.1)">'
          : '<div style="width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,0.06);flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;color:rgba(255,255,255,0.4)">' + m.homeTeam.substring(0,3).toUpperCase() + '</div>';
        const aLogo = m.awayLogo
          ? '<img src="' + m.awayLogo + '" width="36" height="36" style="border-radius:50%;flex-shrink:0;border:1.5px solid rgba(255,255,255,0.1)">'
          : '<div style="width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,0.06);flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;color:rgba(255,255,255,0.4)">' + m.awayTeam.substring(0,3).toUpperCase() + '</div>';
        return '<div class="fixture-row" onclick="openRealMatchDetail(\'' + m.id + '\')" role="button" tabindex="0">' +
          '<div style="display:flex;align-items:center;gap:4px;flex-shrink:0;margin-right:10px">' + hLogo + aLogo + '</div>' +
          '<div class="fixture-teams" style="display:flex;align-items:center;gap:10px;flex:1;min-width:0">' +
            '<div style="min-width:0">' +
              '<div class="fixture-league-name">' + cleanLeagueName + '</div>' +
              '<div class="fixture-team-names">' + m.homeTeam + ' vs ' + m.awayTeam + '</div>' +
            '</div>' +
          '</div>' +
          '<div style="display:flex;align-items:center;gap:8px;margin-left:16px">' +
            (hasPred ? '<span title="You predicted this" style="color:var(--green);font-size:1rem">\u2713</span>' : '') +
            '<div class="fixture-time" style="min-width:110px;text-align:right;color:' + (isLive ? 'var(--red)' : isCompleted ? 'rgba(255,255,255,0.4)' : 'var(--text-secondary)') + '">' + scoreOrTime + '</div>' +
          '</div>' +
        '</div>';
      }).join('') +
    '</div>'
  ).join('');
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
  renderPredictions('upcoming');
  // Load real stats and populate insight cards
  fetch('/api/predictions/stats').then(r => r.ok ? r.json() : null).then(s => {
    if (!s) return;
    const accEl    = document.getElementById('psp-accuracy');
    const corrEl   = document.getElementById('psp-correct');
    const wrongEl  = document.getElementById('psp-wrong');
    const totalEl  = document.getElementById('psp-total');
    const ringFill = document.getElementById('psp-ring-fill');

    const accuracy = parseFloat(s.accuracy) || 0;
    const correct  = s.correct  || 0;
    const wrong    = s.wrong    || 0;  // use server-calculated wrong (based on completed)
    const total    = s.total    || 0;  // total = completed picks (consistent denominator)

    if (accEl)   accEl.textContent   = accuracy + '%';
    if (corrEl)  corrEl.textContent  = correct.toLocaleString();
    if (wrongEl) wrongEl.textContent = wrong.toLocaleString();
    if (totalEl) totalEl.textContent = total.toLocaleString();

    // Update filter tabs with counts
    const upcomingCount = s.allPredictions - total;
    const tabUpcoming = document.getElementById('tab-upcoming');
    const tabCorrect = document.getElementById('tab-correct');
    const tabWrong = document.getElementById('tab-wrong');
    const tabAll = document.getElementById('tab-all');
    
    if (tabUpcoming) tabUpcoming.textContent = 'Upcoming' + (upcomingCount > 0 ? ' (' + upcomingCount + ')' : '');
    if (tabCorrect) tabCorrect.textContent = 'Correct' + (correct > 0 ? ' (' + correct + ')' : '');
    if (tabWrong) tabWrong.textContent = 'Wrong' + (wrong > 0 ? ' (' + wrong + ')' : '');
    if (tabAll) tabAll.textContent = 'All Time' + (s.allPredictions > 0 ? ' (' + s.allPredictions + ')' : '');

    // Animate accuracy ring (stroke-dasharray = "percent, 100")
    if (ringFill) {
      setTimeout(() => {
        ringFill.style.transition = 'stroke-dasharray 1s cubic-bezier(0.4, 0, 0.2, 1)';
        ringFill.setAttribute('stroke-dasharray', accuracy + ', 100');
      }, 300);
    }
  }).catch(() => {});
}

function filterPreds(filter) {
  state.predFilter = filter;
  document.querySelectorAll('#pred-filter-tabs .filter-tab').forEach(t => {
    if (t.getAttribute('onclick') && t.getAttribute('onclick').includes(`'${filter}'`)) {
      t.classList.add('active');
    } else {
      t.classList.remove('active');
    }
  });
  renderPredictions(filter);
}

let currentRawPreds = [];

async function renderPredictions(filter) {
  const container = document.getElementById('predictions-list');
  if (!container) return;
  container.innerHTML = '<div style="text-align:center;color:var(--text-muted);padding:32px;">Loading...</div>';
  try {
    const apiFilter = filter === 'upcoming' ? 'upcoming' : 'completed';
    const raw = await fetch('/api/predictions?filter=' + apiFilter).then(r => r.ok ? r.json() : []);
    currentRawPreds = raw.map(p => {
      // Use real DB status if available, fall back to match status
      let status = p.status || 'pending';
      if (!p.status) {
        if (p.match?.status === 'UPCOMING' || p.match?.status === 'LIVE') status = 'pending';
        else if (p.match?.status === 'COMPLETED') status = p.xpEarned > 0 ? 'correct' : 'wrong';
      }

      // Build picks display
      const picks = [p.homeScore + '–' + p.awayScore];
      if (p.firstGoalScorer) picks.push('⚽ First: ' + p.firstGoalScorer);
      if (p.isDouble) picks.push('🃏 Double');
      if (p.confidence && p.confidence !== 50) picks.push('Conf: ' + p.confidence + '%');

      // XP display
      let xpDisplay = 'Pending';
      if (p.match?.status === 'COMPLETED') {
        xpDisplay = p.xpEarned > 0 ? '+' + p.xpEarned.toLocaleString() + ' XP' : p.xpEarned < 0 ? p.xpEarned.toLocaleString() + ' XP' : '0 XP';
      }

      // Show actual result if completed
      let resultLine = '';
      if (p.match?.status === 'COMPLETED' && p.match.homeScore != null) {
        resultLine = 'Result: ' + p.match.homeScore + '–' + p.match.awayScore;
      }

      return {
        matchId: p.matchId,
        league: p.match?.tournament?.name?.replace(/\s+\d{4}(\s+\[\d+\])?$/, '').replace(/\s+\[\d+\]$/, '') || 'Match',
        match: p.match?.homeTeam + ' vs ' + p.match?.awayTeam,
        homeTeam: p.match?.homeTeam,
        awayTeam: p.match?.awayTeam,
        homeLogo: p.match?.homeLogo || '',
        awayLogo: p.match?.awayLogo || '',
        date: p.match?.matchDate ? new Date(p.match.matchDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '',
        status,
        picks,
        xpDisplay,
        resultLine,
        // Raw fields for breakdown panel
        _raw: p,
      };
    });
  } catch(e) {}
  
  const select = document.getElementById('pred-league-filter');
  if (select) select.value = 'ALL';
  applyLocalPredFilter(filter);
}

/** Generate a beautiful, rich XP breakdown HTML for a completed prediction in a pop-up modal */
function _getScoringBreakdownHtml(pred) {
  const p = pred._raw;
  if (!p || !p.match || p.match.homeScore == null) return '';

  const hs = p.match.homeScore, as = p.match.awayScore;
  const correctResult =
    (p.homeScore > p.awayScore && hs > as) ||
    (p.homeScore < p.awayScore && hs < as) ||
    (p.homeScore === p.awayScore && hs === as);
  const exactScore   = p.homeScore === hs && p.awayScore === as;
  const actualBtts   = hs > 0 && as > 0;
  const correctBtts  = p.btts !== null && p.btts !== undefined && p.btts === actualBtts;
  const actualTotal  = hs + as;
  const actualBucket = actualTotal >= 5 ? 5 : actualTotal;
  const predBucket   = (p.totalGoals ?? -1) >= 5 ? 5 : (p.totalGoals ?? -1);
  const correctTotalGoals = p.totalGoals !== null && p.totalGoals !== undefined && predBucket === actualBucket;
  const correctFGS   = !!(p.firstGoalScorer && p.match.firstGoalScorer &&
    p.firstGoalScorer.trim().toLowerCase() === p.match.firstGoalScorer.trim().toLowerCase());

  const conf = p.confidence || 50;
  const multiplier = 1 + ((conf - 50) / 50);

  let baseXp = 0;
  if (correctResult) baseXp += 50;
  if (exactScore)    baseXp += 150;
  if (p.firstGoalScorer) baseXp += correctFGS ? 100 : 0;
  let xp = Math.round(baseXp * multiplier);
  if (!correctResult) xp -= Math.round(50  * (conf / 100));
  if (p.firstGoalScorer && !correctFGS) xp -= Math.round(100 * (conf / 100));
  const bttsBonus  = correctBtts ? 75 : 0;
  const tgBonus    = correctTotalGoals ? 75 : 0;
  xp += bttsBonus + tgBonus;
  const beforeDouble = xp;
  if (p.isDouble && xp > 0) xp *= 2;
  const storedXp = p.xpEarned ?? null;
  const displayXp = xp;

  const tick  = s => `<span style="color:#4ade80;font-weight:800">${s}</span>`;
  const cross = s => `<span style="color:#f87171;font-weight:800">${s}</span>`;
  const rowStyle = 'display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.05);font-size:0.85rem;';
  const labelStyle = 'color:rgba(255,255,255,0.55);font-weight:600;';

  const totalGoalLabel = p.totalGoals === null || p.totalGoals === undefined ? '—'
    : (p.totalGoals >= 5 ? '5+' : String(p.totalGoals));
  const actualTotalLabel = actualTotal >= 5 ? '5+' : String(actualTotal);
  const bttsLabel = p.btts === null || p.btts === undefined ? '—' : (p.btts ? 'Yes' : 'No');
  const fgsLabel  = p.firstGoalScorer || '—';
  const actualFgsLabel = p.match.firstGoalScorer || '—';

  return `
    <div style="text-align:center;margin-bottom:20px;">
      <div style="font-size:1.25rem;font-weight:900;color:#fff;margin-bottom:16px;">📊 How the score of this match has calculated</div>
      <div style="font-size:1.05rem;font-weight:800;color:rgba(255,255,255,0.9);margin-bottom:4px;display:flex;justify-content:center;align-items:center;gap:10px;">
        ${p.match.homeLogo ? '<img src="'+p.match.homeLogo+'" style="width:24px;height:24px;object-fit:contain">' : ''}
        <span>${p.match.homeTeam} vs ${p.match.awayTeam}</span>
        ${p.match.awayLogo ? '<img src="'+p.match.awayLogo+'" style="width:24px;height:24px;object-fit:contain">' : ''}
      </div>
      <div style="font-size:0.75rem;color:rgba(255,255,255,0.4);margin-top:2px;text-transform:uppercase;letter-spacing:1px;">${pred.league} • ${pred.date}</div>
      
      <div style="display:inline-flex;align-items:center;gap:12px;margin-top:12px;padding:6px 16px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08);border-radius:100px;">
        <span style="font-size:0.78rem;font-weight:700;color:rgba(255,255,255,0.55);">Match Result</span>
        <span style="font-size:0.95rem;font-weight:900;color:var(--cyan);letter-spacing:1px;">${hs} – ${as}</span>
      </div>
    </div>

    <!-- Prediction Breakdown -->
    <div style="background:rgba(0,0,0,0.25);border:1px solid rgba(255,255,255,0.06);border-radius:14px;padding:16px;margin-bottom:20px;">
      <div style="font-size:0.7rem;font-weight:800;color:rgba(255,255,255,0.3);letter-spacing:1.5px;text-transform:uppercase;margin-bottom:12px;">Prediction Breakdown</div>
      
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px 8px;font-size:0.82rem;">
        <div style="color:rgba(255,255,255,0.3);font-weight:700;font-size:0.72rem;text-transform:uppercase;">What</div>
        <div style="color:rgba(255,255,255,0.3);font-weight:700;font-size:0.72rem;text-transform:uppercase;">Your Pick</div>
        <div style="color:rgba(255,255,255,0.3);font-weight:700;font-size:0.72rem;text-transform:uppercase;">Actual</div>

        <div style="${labelStyle}">Scoreline</div>
        <div style="color:#fff;font-weight:700;">${p.homeScore}–${p.awayScore}</div>
        <div>${correctResult ? tick(hs+'–'+as) : cross(hs+'–'+as)}</div>

        ${p.btts !== null && p.btts !== undefined ? `
        <div style="${labelStyle}">BTTS</div>
        <div style="color:#fff;font-weight:700;">${bttsLabel}</div>
        <div>${correctBtts ? tick(actualBtts?'Yes':'No') : cross(actualBtts?'Yes':'No')}</div>
        ` : ''}

        ${p.totalGoals !== null && p.totalGoals !== undefined ? `
        <div style="${labelStyle}">Total Goals</div>
        <div style="color:#fff;font-weight:700;">${totalGoalLabel}</div>
        <div>${correctTotalGoals ? tick(actualTotalLabel) : cross(actualTotalLabel)}</div>
        ` : ''}

        ${p.firstGoalScorer ? `
        <div style="${labelStyle}">1st Scorer</div>
        <div style="color:#fff;font-weight:700;font-size:0.78rem;max-width:110px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${fgsLabel}">${fgsLabel}</div>
        <div style="font-size:0.78rem;max-width:110px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${actualFgsLabel}">${correctFGS ? tick(actualFgsLabel) : cross(actualFgsLabel)}</div>
        ` : ''}
      </div>
    </div>

    <!-- XP Calculation Details -->
    <div style="background:rgba(0,0,0,0.25);border:1px solid rgba(255,255,255,0.06);border-radius:14px;padding:16px;">
      <div style="font-size:0.7rem;font-weight:800;color:rgba(255,255,255,0.3);letter-spacing:1.5px;text-transform:uppercase;margin-bottom:10px;">XP Calculation</div>

      ${correctResult 
        ? `<div style="${rowStyle}"><span style="${labelStyle}">✅ Correct outcome</span>${tick('+50 XP')}</div>` 
        : `<div style="${rowStyle}"><span style="${labelStyle}">❌ Wrong outcome (penalty)</span>${cross('−'+Math.round(50*(conf/100))+' XP')}</div>`
      }
      ${exactScore ? `<div style="${rowStyle}"><span style="${labelStyle}">🎯 Exact scoreline bonus</span>${tick('+150 XP')}</div>` : ''}
      
      ${p.firstGoalScorer 
        ? (correctFGS  
          ? `<div style="${rowStyle}"><span style="${labelStyle}">⚽ First goalscorer bonus</span>${tick('+100 XP')}</div>` 
          : `<div style="${rowStyle}"><span style="${labelStyle}">⚽ Wrong goalscorer (penalty)</span>${cross('−'+Math.round(100*(conf/100))+' XP')}</div>`)
        : ''
      }
      ${p.btts !== null && p.btts !== undefined 
        ? (bttsBonus > 0  
          ? `<div style="${rowStyle}"><span style="${labelStyle}">🔵 Both teams scored bonus</span>${tick('+75 XP')}</div>` 
          : `<div style="${rowStyle}"><span style="${labelStyle}">🔵 BTTS wrong</span><span style="color:rgba(255,255,255,0.3)">0 XP</span></div>`)
        : ''
      }
      ${p.totalGoals !== null && p.totalGoals !== undefined 
        ? (tgBonus > 0  
          ? `<div style="${rowStyle}"><span style="${labelStyle}">🎱 Total goals correct bonus</span>${tick('+75 XP')}</div>` 
          : `<div style="${rowStyle}"><span style="${labelStyle}">🎱 Total goals wrong</span><span style="color:rgba(255,255,255,0.3)">0 XP</span></div>`)
        : ''
      }
      
      <div style="${rowStyle}"><span style="${labelStyle}">Confidence multiplier (${conf}%)</span><span style="color:var(--cyan);font-weight:700;">×${multiplier.toFixed(1)}</span></div>
      ${p.isDouble && beforeDouble > 0 ? `<div style="${rowStyle}"><span style="${labelStyle}">🃏 Double Joker active</span><span style="color:var(--gold);font-weight:800;">×2</span></div>` : ''}

      <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 0 0;margin-top:8px;border-top:1px solid rgba(255,255,255,0.12);">
        <span style="font-size:0.9rem;font-weight:800;color:#fff;">Net Score (current rules)</span>
        <span style="font-size:1.15rem;font-weight:900;color:${displayXp >= 0 ? '#4ade80' : '#f87171'}">${displayXp >= 0 ? '+' : ''}${displayXp} XP</span>
      </div>
      
      ${storedXp !== null && storedXp !== displayXp ? `
      <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0 0;font-size:0.75rem;border-top:1px dashed rgba(255,255,255,0.08);margin-top:6px;">
        <span style="color:rgba(255,180,0,0.75);">⚠️ Account Credited</span>
        <span style="color:rgba(255,180,0,0.9);font-weight:800;">${storedXp >= 0 ? '+' : ''}${storedXp} XP (old rules)</span>
      </div>` : ''}
    </div>
  `;
}

function openScoringBreakdownModal(matchId) {
  const pred = currentRawPreds.find(p => p.matchId === matchId);
  if (!pred) return;

  const overlay = document.getElementById('scoring-breakdown-modal');
  const body = document.getElementById('scoring-breakdown-body');
  if (!overlay || !body) return;

  body.innerHTML = _getScoringBreakdownHtml(pred);

  if (window.animateModalEnter) {
    window.animateModalEnter(overlay, overlay.querySelector('.modal-sheet'));
  }
  overlay.classList.remove('hidden');
}

function closeScoringBreakdownModal() {
  const overlay = document.getElementById('scoring-breakdown-modal');
  if (overlay) {
    overlay.classList.add('hidden');
  }
}

function applyLocalPredFilter(statusFilterOverride) {
  const container = document.getElementById('predictions-list');
  if (!container) return;

  const statusFilter = statusFilterOverride || state.predFilter || 'upcoming';
  let preds = currentRawPreds || [];

  if (statusFilter === 'correct')  preds = preds.filter(p => p.status === 'correct');
  else if (statusFilter === 'wrong')    preds = preds.filter(p => p.status === 'wrong');
  else if (statusFilter === 'upcoming') preds = preds.filter(p => p.status === 'pending');

  const select = document.getElementById('pred-league-filter');
  if (select) {
     const currentVal = select.value;
     const uniqueLeagues = [...new Set(preds.map(p => p.league))].filter(Boolean).sort();
     let opts = '<option value="ALL">' + (typeof t === 'function' ? t('All Leagues & Cups', window._currentLang || 'en') : 'All Leagues & Cups') + '</option>';
     uniqueLeagues.forEach(l => {
       const lTranslated = typeof t === 'function' ? t(l, window._currentLang || 'en') : l;
       opts += '<option value="' + l.replace(/"/g,'&quot;') + '">' + lTranslated + '</option>';
     });
     select.innerHTML = opts;
     if (uniqueLeagues.includes(currentVal)) {
        select.value = currentVal;
     } else {
        select.value = 'ALL';
     }
     
     if (select.value !== 'ALL') {
       preds = preds.filter(p => p.league === select.value);
     }
  }

  if (preds.length === 0) {
    container.innerHTML = '<div style="text-align:center;color:var(--text-muted);padding:48px;font-size:0.9rem;">No ' + statusFilter + ' predictions yet</div>';
    if (typeof translateDOM === 'function') translateDOM(window._currentLang);
    return;
  }

  // Group by league/cup
  const groups = {};
  preds.forEach(p => {
    const key = p.league || 'Other';
    if (!groups[key]) groups[key] = [];
    groups[key].push(p);
  });

  container.innerHTML = Object.entries(groups).map(([league, items]) => {
    const lTranslated = typeof t === 'function' ? t(league, window._currentLang || 'en') : league;
    return '<div class="pred-league-group">' +
      '<div style="font-size:0.7rem;font-weight:800;color:var(--text-secondary);letter-spacing:1.5px;text-transform:uppercase;padding:12px 0 6px;border-bottom:1px solid rgba(255,255,255,0.06);margin-bottom:8px">' + lTranslated + '</div>' +
      items.map(p => {
        const canEdit = p.status === 'pending';
        const mid = p.matchId || '';
        const statusIcon = p.status === 'correct' ? '✅' : p.status === 'wrong' ? '❌' : '⏳';
        const statusLabel = p.status === 'correct' ? 'Correct' : p.status === 'wrong' ? 'Wrong' : 'Upcoming';
        const xpColor = p.status === 'correct' ? '#ffd700' : p.status === 'wrong' ? 'rgba(255,255,255,0.3)' : 'var(--text-secondary)';
        
        const isCompleted = p.status === 'correct' || p.status === 'wrong';
        const clickHandler = isCompleted 
          ? `onclick="openScoringBreakdownModal('${mid}')"` 
          : `onclick="openRealMatchDetail('${mid}')"`;

        return '<div class="pred-item ' + p.status + '" role="listitem" ' + clickHandler + ' style="cursor:pointer">' +
          '<div class="pred-item-header">' +
            '<span class="pred-item-league">' + (p.date || '') + '</span>' +
            '<div style="display:flex;align-items:center;gap:8px">' +
              (canEdit ? '<button onclick="event.stopPropagation();openRealMatchDetail(\'' + mid + '\')" style="font-size:0.65rem;font-weight:700;padding:2px 8px;border-radius:100px;background:rgba(60,184,46,0.1);border:1px solid rgba(60,184,46,0.3);color:var(--green);cursor:pointer">Edit</button>' : '') +
              '<span class="pred-item-status-badge status-' + p.status + '">' + statusIcon + ' ' + statusLabel + '</span>' +
            '</div>' +
          '</div>' +
          '<div class="pred-item-match" style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">' +
            (p.homeLogo ? '<img src="' + p.homeLogo + '" style="width:20px;height:20px;object-fit:contain">' : '') +
            '<span>' + p.homeTeam + ' vs ' + p.awayTeam + '</span>' +
            (p.awayLogo ? '<img src="' + p.awayLogo + '" style="width:20px;height:20px;object-fit:contain">' : '') +
          '</div>' +
          (p.resultLine ? '<div style="font-size:0.72rem;color:rgba(255,255,255,0.4);margin-bottom:4px">' + p.resultLine + '</div>' : '') +
          '<div class="pred-item-picks">' + p.picks.map(pick => '<span class="pred-pick-tag">' + pick + '</span>').join('') + '</div>' +
          '<div style="display:flex;align-items:center;justify-content:space-between;margin-top:8px;">' +
            '<div class="pred-item-xp" style="font-weight:800;color:' + xpColor + '">' + p.xpDisplay + '</div>' +
            (isCompleted ? '<button onclick="event.stopPropagation();openScoringBreakdownModal(\'' + mid + '\')" style="font-size:0.72rem;font-weight:700;padding:5px 12px;border-radius:100px;background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.15);color:rgba(255,255,255,0.7);cursor:pointer;display:flex;align-items:center;gap:5px;">📊 Points Breakdown</button>' : '') +
          '</div>' +
        '</div>';
      }).join('') +
    '</div>';
  }).join('');

  if (typeof translateDOM === 'function') translateDOM(window._currentLang);
}

// ─── LEADERBOARD PAGE ────────────────────────────────────────────
async function initLeaderboard(period) {
  const url = period && period !== 'alltime' ? '/api/leaderboard?period=' + period : '/api/leaderboard';
  try {
    const data = await fetch(url).then(r => r.ok ? r.json() : []);
    renderLeaderboardTable(data);

    // ── Update Podium (ranks 1/2/3) ──
    // HTML order: rank2 / rank1 / rank3
    const podiumOrder = [data[1], data[0], data[2]]; // 2nd | 1st | 3rd
    const podiumCards = document.querySelectorAll('.podium-card');
    podiumCards.forEach((card, i) => {
      const u = podiumOrder[i];
      if (!u) return;
      const nameEl = card.querySelector('.podium-name');
      const xpEl   = card.querySelector('.podium-xp');
      const imgEl  = card.querySelector('img');
      const rnkEl  = card.querySelector('.rank-num');
      const rank   = i === 0 ? 2 : i === 1 ? 1 : 3;
      if (nameEl) nameEl.textContent = u.name || 'Player';
      if (xpEl)   xpEl.textContent   = (u.xp || 0).toLocaleString() + ' XP';
      if (imgEl)  imgEl.src = u.image || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + encodeURIComponent(u.name || 'user');
      if (rnkEl)  rnkEl.textContent  = '#' + rank;
    });

    // ── Update Your Rank Banner ──
    const me = data.find(u => u.isMe);
    if (me) {
      const yrb = document.querySelector('.your-rank-banner');
      if (yrb) {
        const rankEl = yrb.querySelector('.yrb-rank');
        const nameEl = yrb.querySelector('.yrb-name');
        const xpEl   = yrb.querySelector('.yrb-xp');
        const imgEl  = yrb.querySelector('img');
        if (rankEl) rankEl.textContent = '#' + me.rank;
        if (nameEl) nameEl.textContent = (me.name || 'You') + ' (You)';
        if (xpEl)   xpEl.textContent   = (me.xp || 0).toLocaleString() + ' XP';
        if (imgEl)  imgEl.src = me.image || 'https://api.dicebear.com/7.x/avataaars/svg?seed=me';
        if (yrb) yrb.style.display = '';
      }
    } else {
      // User has no predictions yet — hide the banner
      const yrb = document.querySelector('.your-rank-banner');
      if (yrb) yrb.style.display = 'none';
    }
  } catch(e) { console.error('Leaderboard error', e); }
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
    const tournamentsRes = await fetch('/api/tournaments').then(r => r.ok ? r.json() : []);

    // ── Official league rankings (prediction-based, no registration needed) ──
    const officialTournaments = tournamentsRes.filter(t => t.registrationMode !== 'INVITE_ONLY');

    if (!officialTournaments.length) {
      listEl.innerHTML = '<div style="text-align:center;color:var(--text-muted);padding:32px">No active leagues yet.</div>';
    } else {
      listEl.innerHTML = '<div style="text-align:center;color:var(--text-muted);padding:16px;font-size:0.8rem;">Loading rankings...</div>';

      // Fetch leaderboard for each official tournament in parallel
      const rankResults = await Promise.all(
        officialTournaments.map(t =>
          fetch('/api/leaderboard?tournamentId=' + t.id)
            .then(r => r.ok ? r.json() : [])
            .then(rows => ({ tournament: t, rows }))
        )
      );

      // Find my entry in each
      const myEntries = rankResults
        .map(({ tournament: t, rows }) => {
          const me = rows.find(r => r.isMe);
          if (!me) return null;
          const comp = _compFromTournament(t);
          return { t, me, comp, total: rows.length };
        })
        .filter(Boolean);

      if (!myEntries.length) {
        listEl.innerHTML = '<div style="text-align:center;color:var(--text-muted);padding:32px;font-size:0.85rem;">Make predictions on league matches to appear here!</div>';
      } else {
        listEl.innerHTML = myEntries.map(({ t, me, comp, total }) => {
          const logoHtml = comp
            ? `<img src="${comp.logo}" width="30" height="30" style="object-fit:contain;">`
            : `<span style="font-size:1.3rem">⚽</span>`;
          const name = (t.name || '').replace(/\s+\d{4}(\s+\[\d+\])?$/, '').replace(/\s+\[\d+\]$/, '').trim();
          const rankColor = me.rank === 1 ? '#ffd700' : me.rank === 2 ? '#c0c0c0' : me.rank === 3 ? '#cd7f32' : '#fff';
          return '<div style="display:flex;align-items:center;gap:14px;padding:12px;background:rgba(255,255,255,0.03);border-radius:12px;margin-bottom:8px;border:1px solid rgba(255,255,255,0.05)">' +
            '<div style="width:34px;height:34px;display:flex;align-items:center;justify-content:center">' + logoHtml + '</div>' +
            '<div style="flex:1">' +
              '<div style="font-weight:700;color:#fff;font-size:0.88rem">' + name + '</div>' +
              '<div style="font-size:0.7rem;color:rgba(255,255,255,0.4)">' + me.xp.toLocaleString() + ' XP · out of ' + total + ' predictors</div>' +
            '</div>' +
            '<div style="text-align:right">' +
              '<div style="font-weight:800;font-size:1.1rem;color:' + rankColor + '">#' + me.rank + '</div>' +
              '<div style="font-size:0.65rem;color:rgba(255,255,255,0.3)">' + Math.round((me.accuracy || 0)) + '% acc</div>' +
            '</div>' +
          '</div>';
        }).join('');
      }
    }

    // ── My Mini Leagues — INVITE_ONLY tournaments the user has joined ──
    const myMiniLeagues = tournamentsRes.filter(t => t.registrationMode === 'INVITE_ONLY' && t.userRegistered === true);

    if (!myMiniLeagues.length) {
      if (miniListEl) miniListEl.innerHTML = '<div style="text-align:center;color:var(--text-muted);padding:24px">No mini leagues joined yet</div>';
    } else {
      if (miniListEl) miniListEl.innerHTML = myMiniLeagues.map(t => {
        const comp = COMP_META[t.competition] || COMP_META['premier_league'];
        const logoHtml = `<img src="${comp.logo}" width="30" height="30" style="object-fit:contain;">`;
        return '<div style="display:flex;align-items:center;gap:14px;padding:12px;background:rgba(255,255,255,0.03);border-radius:12px;margin-bottom:8px;border:1px solid rgba(255,255,255,0.05);cursor:pointer" onclick="navigate(\'minileague\')">' +
          '<div style="width:34px;height:34px;display:flex;align-items:center;justify-content:center">' + logoHtml + '</div>' +
          '<div style="flex:1">' +
            '<div style="font-weight:700;color:#fff;font-size:0.88rem">' + t.name + '</div>' +
            '<div style="font-size:0.7rem;color:rgba(255,255,255,0.4)">' + comp.label + ' · ' + (t._count?.registrations || 0) + ' members</div>' +
          '</div>' +
          '<div style="color:rgba(255,255,255,0.3);font-size:0.75rem">View →</div>' +
        '</div>';
      }).join('');
    }
  } catch(e) {
    if (listEl) listEl.innerHTML = '<div style="text-align:center;color:var(--text-muted);padding:32px">Could not load league ranks</div>';
  }
}

function setTimePeriod(period) {
  state.lbPeriod = period;
  document.querySelectorAll('.time-tab').forEach(t => {
    if (t.getAttribute('onclick') && t.getAttribute('onclick').includes(`'${period}'`)) {
      t.classList.add('active');
    } else {
      t.classList.remove('active');
    }
  });
  // Re-fetch leaderboard with the selected period
  initLeaderboard(period);
}

function _xpToLevel(xp) {
  if (xp >= 50000) return { label: 'Legend', cls: 'legend', badge: 'L' };
  if (xp >= 20000) return { label: 'Platinum', cls: 'platinum', badge: 'P' };
  if (xp >= 10000) return { label: 'Gold', cls: 'gold', badge: 'G' };
  if (xp >= 4000)  return { label: 'Silver', cls: 'silver', badge: 'S' };
  return { label: 'Bronze', cls: 'bronze', badge: 'B' };
}

function renderLeaderboardTable(entries) {
  const container = document.getElementById('leaderboard-table');
  if (!container) return;

  if (!entries || entries.length === 0) {
    container.innerHTML = '<div style="text-align:center;color:var(--text-muted);padding:48px;font-size:0.9rem">No predictions yet — be the first to score XP!</div>';
    return;
  }

  // Rows from rank 4 onwards (1-3 shown in podium)
  const rows = entries.slice(3);
  if (rows.length === 0) {
    container.innerHTML = '<div style="text-align:center;color:var(--text-muted);padding:32px;font-size:0.85rem">Only 3 players so far — all shown in the podium above!</div>';
    return;
  }

  container.innerHTML = rows.map((u) => {
    const lvl    = _xpToLevel(u.xp || 0);
    const avatar = u.image || ('https://api.dicebear.com/7.x/avataaars/svg?seed=' + encodeURIComponent(u.name || 'user'));
    const streak = u.streak || 0;
    const acc    = u.accuracy != null ? u.accuracy + '%' : '';
    return `
      <div class="mini-lb-row ${u.isMe ? 'you-row' : ''}" role="row">
        <div class="lb-rank" style="color:var(--text-muted);font-weight:800">#${u.rank}</div>
        <div class="lb-avatar">
          <img src="${avatar}" alt="${u.name || 'Player'}" width="36" height="36" style="border-radius:50%">
          <div class="level-badge-sm ${lvl.cls}">${lvl.badge}</div>
        </div>
        <div class="lb-info">
          <div class="lb-name">
            ${u.name || 'Player'}
            ${u.isMe ? '<span class="level-badge ' + lvl.cls + '">YOU</span>' : ''}
            ${streak >= 3 ? '<span style="font-size:0.7rem;margin-left:4px" title="' + streak + ' streak">🔥' + streak + '</span>' : ''}
          </div>
          <div class="lb-sub" style="font-size:0.7rem;color:var(--text-muted)">${lvl.label}${acc ? ' · ' + acc + ' accuracy' : ''}</div>
        </div>
        <div class="lb-right">
          <div class="lb-xp" style="font-weight:800;color:var(--green)">${(u.xp||0).toLocaleString()} XP</div>
        </div>
      </div>
    `;
  }).join('');
}

// ─── MINI LEAGUES PAGE ───────────────────────────────────────────
async function initMiniLeagues() {
  const container = document.getElementById('my-leagues-grid');
  if (!container) return;
  // Reset to list view when re-initialising
  const detailPanel = document.getElementById('mini-league-detail-panel');
  const listView = document.getElementById('mini-league-list-view');
  if (detailPanel) detailPanel.classList.add('hidden');
  if (listView) listView.classList.remove('hidden');

  container.innerHTML = '<div style="text-align:center;color:var(--text-muted);padding:32px;">Loading leagues...</div>';
  try {
    const data = await fetch('/api/tournaments').then(r => r.ok ? r.json() : []);

    // Only show INVITE_ONLY mini leagues the user has actually joined
    const myLeagues = data.filter(t => t.registrationMode === 'INVITE_ONLY' && t.userRegistered === true);

    if (!myLeagues.length) {
      container.innerHTML = '<div style="text-align:center;color:var(--text-muted);padding:48px;font-size:0.9rem;">You haven\'t joined any mini leagues yet.<br><span style="font-size:0.8rem;margin-top:4px;display:block;">Create one or join with an invite code below!</span></div>';
      return;
    }
    container.innerHTML = myLeagues.map(ml => {
      const comp = COMP_META[ml.competition] || COMP_META['premier_league'];
      return `
      <div class="league-tile" role="button" tabindex="0" onclick="openMiniLeagueDetail('${ml.id}')" style="cursor:pointer;">
        <div class="league-tile-header">
          <div class="league-tile-badge" style="background:rgba(0,0,0,0.3);width:44px;height:44px;display:flex;align-items:center;justify-content:center;border-radius:12px;flex-shrink:0;">${_compBadge(comp, 32)}</div>
          <div class="league-tile-info">
            <div class="league-tile-name">${ml.name}</div>
            <div class="league-tile-meta">${comp.label} · ${ml._count?.registrations||0} member${(ml._count?.registrations||0)===1?'':'s'}</div>
          </div>
        </div>
        <div class="league-tile-body">
          <div class="league-rank-row">
            <span class="league-rank-label">Invite Code</span>
            <code style="font-size:0.75rem;color:var(--cyan);font-weight:700">${ml.inviteCode || '—'}</code>
          </div>
          <div class="league-rank-row" style="margin-top:6px;">
            <span class="league-rank-label" style="color:rgba(255,255,255,0.3);font-size:0.7rem;">Tap to view ranking & fixtures →</span>
          </div>
        </div>
      </div>`;
    }).join('');
  } catch(e) {
    container.innerHTML = '<div style="text-align:center;color:var(--text-muted);padding:32px;">Could not load leagues</div>';
  }
}

// Competition metadata
const COMP_META = {
  premier_league:          { label: 'Premier League',   logo: 'https://media.api-sports.io/football/leagues/39.png',  color: '#3d195b', accent: '#00ff85' },
  la_liga:                 { label: 'La Liga',           logo: 'https://media.api-sports.io/football/leagues/140.png', color: '#ee8707', accent: '#fff' },
  champions_league:        { label: 'Champions League', logo: 'https://media.api-sports.io/football/leagues/2.png',   color: '#001489', accent: '#f0c040' },
  egyptian_premier_league: { label: 'Egyptian Premier', logo: 'https://media.api-sports.io/football/leagues/233.png', color: '#c8102e', accent: '#fff' },
  world_cup:               { label: 'World Cup',        logo: 'https://media.api-sports.io/football/leagues/1.png',   color: '#006233', accent: '#ffd700' },
};

// Returns an <img> badge for a competition
function _compBadge(comp, size = 32) {
  return `<img src="${comp.logo}" width="${size}" height="${size}" style="object-fit:contain;filter:drop-shadow(0 0 4px rgba(0,0,0,0.4))">`;
}

// Derive COMP_META key from a tournament name (works for DB names like "La Liga 2025 [140]")
function _compKeyFromName(name) {
  const n = (name || '').toLowerCase()
    .replace(/\s+\d{4}(\s+\[\d+\])?$/, '')
    .replace(/\s+\[\d+\]$/, '')
    .trim();
  if (n.includes('egyptian')) return 'egyptian_premier_league';
  if (n.includes('world cup') || n.includes('fifa world cup')) return 'world_cup';
  if (n.includes('champions')) return 'champions_league';
  if (n.includes('la liga')) return 'la_liga';
  if (n.includes('premier league')) return 'premier_league';
  return null;
}

// Get comp meta from tournament object — tries competition field first, falls back to name
function _compFromTournament(t) {
  if (t?.competition && t.competition !== 'premier_league') {
    return COMP_META[t.competition] || null;
  }
  const keyFromName = _compKeyFromName(t?.name);
  return keyFromName ? (COMP_META[keyFromName] || null) : null;
}

function openLeaguePage(id) {
  openMiniLeagueDetail(id);
}

async function openMiniLeagueDetail(leagueId) {
  // Show a full-screen panel inside page-minileague
  const panel = document.getElementById('mini-league-detail-panel');
  if (!panel) return;
  panel.innerHTML = '<div style="text-align:center;color:var(--text-muted);padding:48px;">Loading...</div>';
  panel.classList.remove('hidden');
  document.getElementById('mini-league-list-view').classList.add('hidden');

  try {
    const data = await fetch('/api/mini-leagues/' + leagueId).then(r => r.ok ? r.json() : null);
    if (!data) { panel.innerHTML = '<div style="color:var(--red);padding:32px;">Failed to load league.</div>'; return; }

    const comp = COMP_META[data.competition] || COMP_META['premier_league'];
    const DAY_NAMES = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

    // Build ranking rows
    const rankHtml = data.ranking.length ? data.ranking.map((r, i) => `
      <div style="display:flex;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid rgba(255,255,255,0.05);">
        <div style="font-weight:800;min-width:28px;color:${i===0?'#ffd700':i===1?'#c0c0c0':i===2?'#cd7f32':'rgba(255,255,255,0.4)'};text-align:center">${i===0?'🥇':i===1?'🥈':i===2?'🥉':'#'+(i+1)}</div>
        <img src="${r.image || 'https://api.dicebear.com/7.x/avataaars/svg?seed='+encodeURIComponent(r.name)}" width="34" height="34" style="border-radius:50%;border:2px solid ${r.isMe?'var(--green)':'rgba(255,255,255,0.1)'}">
        <div style="flex:1">
          <div style="font-weight:700;font-size:0.9rem;color:${r.isMe?'var(--green)':'var(--text-primary)'}">
            ${r.name}${r.isMe?' <span style="font-size:0.65rem;color:var(--green)">YOU</span>':''}
          </div>
        </div>
        <div style="font-weight:800;color:var(--cyan);font-size:0.85rem">${(r.xp||0).toLocaleString()} XP</div>
      </div>
    `).join('') : '<div style="color:var(--text-muted);text-align:center;padding:24px;font-size:0.85rem;">No predictions scored yet. Predict upcoming games!</div>';

    // Build fixture rows
    const today = new Date(); today.setHours(0,0,0,0);
    let lastLabel = '';
    const fixtureHtml = data.fixtures.length ? data.fixtures.map(m => {
      const t = new Date(m.matchDate);
      const mDay = new Date(t); mDay.setHours(0,0,0,0);
      const diffDays = Math.round((mDay - today) / 86400000);
      const dayLabel = diffDays === 0 ? 'Today' : diffDays === 1 ? 'Tomorrow' : DAY_NAMES[t.getDay()];
      const timeStr = t.toLocaleDateString('en-GB',{day:'2-digit',month:'2-digit',year:'numeric'}) + ' ' + t.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'});
      let sep = '';
      if (dayLabel !== lastLabel) { lastLabel = dayLabel; sep = `<div class="fixture-day-header">${dayLabel}</div>`; }
      const hasPred = !!m.userPrediction;
      const homeLogo = m.homeLogo ? `<img src="${m.homeLogo}" width="36" height="36" style="border-radius:50%;flex-shrink:0;border:1.5px solid rgba(255,255,255,0.1)">` : `<div style="width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,0.06);flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;color:rgba(255,255,255,0.4)">${m.homeTeam.substring(0,3).toUpperCase()}</div>`;
      const awayLogo = m.awayLogo ? `<img src="${m.awayLogo}" width="36" height="36" style="border-radius:50%;flex-shrink:0;border:1.5px solid rgba(255,255,255,0.1)">` : `<div style="width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,0.06);flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;color:rgba(255,255,255,0.4)">${m.awayTeam.substring(0,3).toUpperCase()}</div>`;
      return sep + `
        <div class="fixture-row" onclick="openRealMatchDetail('${m.id}')" role="button" tabindex="0" style="${hasPred?'border-left:3px solid var(--green);':''}">
          <div style="display:flex;align-items:center;gap:4px;flex-shrink:0;margin-right:10px">${homeLogo}${awayLogo}</div>
          <div class="fixture-teams" style="display:flex;align-items:center;gap:10px;flex:1;min-width:0">
            <div style="min-width:0">
              <div class="fixture-league-name">${hasPred?'✓ Predicted':'Predict'}</div>
              <div class="fixture-team-names">${m.homeTeam} vs ${m.awayTeam}</div>
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:8px;margin-left:16px">
            <div style="color:var(--text-muted);font-size:0.8rem;min-width:110px;text-align:right">${timeStr}</div>
          </div>
        </div>`;
    }).join('') : '<div style="color:var(--text-muted);text-align:center;padding:24px;font-size:0.85rem;">No upcoming fixtures for this competition in the next 7 days.</div>';

    panel.innerHTML = `
      <!-- Header -->
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;">
        <div style="display:flex;align-items:center;gap:14px;">
          <div style="width:52px;height:52px;border-radius:14px;background:rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;flex-shrink:0;">${_compBadge(comp, 40)}</div>
          <div>
            <div style="font-size:1.1rem;font-weight:800;color:var(--text-primary)">${data.name}</div>
            <div style="font-size:0.78rem;color:var(--text-muted)">${comp.label} · ${data.memberCount} member${data.memberCount===1?'':'s'}</div>
          </div>
        </div>
        <button onclick="closeMiniLeagueDetail()" style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-pill);padding:8px 16px;color:var(--text-primary);cursor:pointer;font-size:0.85rem;font-weight:700;">← Back</button>
      </div>

      <!-- Invite code -->
      <div style="background:rgba(8,189,189,0.08);border:1px solid rgba(8,189,189,0.2);border-radius:12px;padding:12px 16px;margin-bottom:16px;display:flex;justify-content:space-between;align-items:center;">
        <span style="font-size:0.78rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px;">Invite Code</span>
        <code style="font-size:0.9rem;font-weight:800;color:var(--cyan);cursor:pointer;" onclick="navigator.clipboard.writeText('${data.inviteCode}');showNotification('Code copied!','success')">${data.inviteCode} 📋</code>
      </div>

      <!-- Live Now strip (hidden when no live matches) -->
      ${data.liveMatches.length ? `
      <div style="margin-bottom:16px;">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
          <span class="live-dot"></span>
          <span style="font-size:0.72rem;font-weight:800;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:1.5px;">Live Now</span>
        </div>
        <div style="display:flex;gap:10px;overflow-x:auto;padding-bottom:4px;-webkit-overflow-scrolling:touch;scrollbar-width:none;">
          ${data.liveMatches.map(m => {
            const hl = m.homeLogo ? `<img src="${m.homeLogo}" width="20" height="20" style="border-radius:50%">` : '';
            const al = m.awayLogo ? `<img src="${m.awayLogo}" width="20" height="20" style="border-radius:50%">` : '';
            const min = m.minute ? m.minute + "'" : 'LIVE';
            return `<div onclick="openRealMatchDetail('${m.id}')" style="flex-shrink:0;cursor:pointer;background:rgba(255,50,50,0.1);border:1px solid rgba(255,50,50,0.3);border-radius:12px;padding:10px 14px;min-width:160px;">
              <div style="font-size:0.65rem;font-weight:800;color:var(--red);text-align:center;margin-bottom:6px;">${min}</div>
              <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
                <div style="display:flex;flex-direction:column;align-items:center;gap:4px;flex:1;">${hl}<span style="font-size:0.65rem;color:rgba(255,255,255,0.7);text-align:center;line-height:1.2;">${m.homeTeam.split(' ').slice(-1)[0]}</span></div>
                <div style="font-family:'Russo One',sans-serif;font-size:1rem;color:#fff;font-weight:900;letter-spacing:1px;">${m.homeScore??0}–${m.awayScore??0}</div>
                <div style="display:flex;flex-direction:column;align-items:center;gap:4px;flex:1;">${al}<span style="font-size:0.65rem;color:rgba(255,255,255,0.7);text-align:center;line-height:1.2;">${m.awayTeam.split(' ').slice(-1)[0]}</span></div>
              </div>
            </div>`;
          }).join('')}
        </div>
      </div>` : ''}

      <!-- Tabs -->
      <div style="display:flex;gap:0;border-bottom:1px solid rgba(255,255,255,0.08);margin-bottom:16px;">
        <button id="ml-tab-rank" onclick="switchMlTab('rank')" style="flex:1;padding:10px;background:none;border:none;border-bottom:2px solid var(--cyan);color:var(--cyan);font-weight:800;font-size:0.85rem;cursor:pointer;">🏆 Ranking</button>
        <button id="ml-tab-fix" onclick="switchMlTab('fix')" style="flex:1;padding:10px;background:none;border:none;border-bottom:2px solid transparent;color:var(--text-muted);font-weight:700;font-size:0.85rem;cursor:pointer;">📅 Fixtures</button>
      </div>

      <!-- Tab content -->
      <div id="ml-tab-content-rank">${rankHtml}</div>
      <div id="ml-tab-content-fix" class="hidden">${fixtureHtml}</div>
    `;
  } catch(e) {
    panel.innerHTML = '<div style="color:var(--red);padding:32px;">Failed to load league detail.</div>';
  }
}

function switchMlTab(tab) {
  document.getElementById('ml-tab-content-rank').classList.toggle('hidden', tab !== 'rank');
  document.getElementById('ml-tab-content-fix').classList.toggle('hidden', tab !== 'fix');
  document.getElementById('ml-tab-rank').style.borderBottomColor = tab === 'rank' ? 'var(--cyan)' : 'transparent';
  document.getElementById('ml-tab-rank').style.color = tab === 'rank' ? 'var(--cyan)' : 'rgba(255,255,255,0.4)';
  document.getElementById('ml-tab-fix').style.borderBottomColor = tab === 'fix' ? 'var(--cyan)' : 'transparent';
  document.getElementById('ml-tab-fix').style.color = tab === 'fix' ? 'var(--cyan)' : 'rgba(255,255,255,0.4)';
}

function closeMiniLeagueDetail() {
  document.getElementById('mini-league-detail-panel').classList.add('hidden');
  document.getElementById('mini-league-list-view').classList.remove('hidden');
}

async function createLeague() {
  const name = document.getElementById('league-name-input').value.trim();
  if (!name) {
    document.getElementById('league-name-input').style.borderColor = 'var(--red)';
    return;
  }
  const competition = document.querySelector('input[name="mini_league_comp"]:checked')?.value || 'premier_league';
  const scoringMode = document.querySelector('input[name="scoring"]:checked')?.value || 'global';
  const code = 'KO-' + name.replace(/\s/g,'').toUpperCase().slice(0,6) + '-' + Math.floor(1000+Math.random()*9000);
  try {
    const res = await fetch('/api/tournaments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name, game: 'Football', description: 'Mini League',
        prizePool: 'TBD', maxPlayers: 100, startDate: new Date().toISOString(),
        type: 'League', registrationMode: 'INVITE_ONLY', inviteCode: code,
        competition, scoringMode,
      }),
    });
    const data = await res.json();
    if (res.ok) {
      closeCreateLeague();
      showNotification('League created! Invite code: ' + code, 'success');
      initMiniLeagues();
    } else {
      showNotification(data.message || 'Could not create league', 'error');
    }
  } catch(e) {
    showNotification('Network error creating league', 'error');
  }
}

function joinLeague() {
  const code = document.getElementById('join-code-input').value.trim().toUpperCase();
  if (!code) { showNotification('Enter an invite code first', 'warning'); return; }

  // Find the tournament by invite code
  fetch('/api/tournaments')
    .then(r => r.ok ? r.json() : [])
    .then(tournaments => {
      const match = tournaments.find(t => (t.inviteCode || '').toUpperCase() === code);
      if (!match) {
        showNotification('Invalid invite code — no league found', 'error');
        return;
      }
      return fetch('/api/tournaments/' + match.id + '/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteCode: code }),
      }).then(r => r.json()).then(data => {
        if (data.message && data.message.toLowerCase().includes('already')) {
          showNotification('You are already in this league!', 'info');
        } else if (data.id || data.userId) {
          document.getElementById('join-code-input').value = '';
          showNotification('✅ Joined ' + match.name + '!', 'success');
          initMiniLeagues();
        } else {
          showNotification(data.message || 'Could not join league', 'error');
        }
      });
    })
    .catch(() => showNotification('Network error joining league', 'error'));
}

// ─── PROFILE PAGE ────────────────────────────────────────────────
async function initProfile() {
  try {
    const session = await fetch('/api/auth/session').then(r => r.ok ? r.json() : null);
    if (session?.user) {
      const u = session.user;
      const xp = u.xp || 0;

      // Name, email
      const nameEl = document.getElementById('profile-name');
      if (nameEl) nameEl.textContent = u.name || '—';
      const emailEl = document.getElementById('profile-email');
      if (emailEl) emailEl.textContent = u.email || '';

      // Avatar
      const avatarEl = document.getElementById('profile-avatar-img');
      if (avatarEl) avatarEl.src = u.image || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + encodeURIComponent(u.name || 'user');

      // XP display
      const xpEl = document.getElementById('profile-xp');
      if (xpEl) xpEl.textContent = xp.toLocaleString() + ' XP';

      // Level / tier
      const TIERS = [
        { name: 'Bronze',   min: 0,     max: 2999,  cls: 'bronze'   },
        { name: 'Silver',   min: 3000,  max: 9999,  cls: 'silver'   },
        { name: 'Gold',     min: 10000, max: 19999, cls: 'gold'     },
        { name: 'Platinum', min: 20000, max: 49999, cls: 'platinum' },
        { name: 'Legend',   min: 50000, max: Infinity, cls: 'legend' },
      ];
      const tier = TIERS.find(t => xp >= t.min && xp <= t.max) || TIERS[0];
      const nextTier = TIERS[TIERS.indexOf(tier) + 1];

      const badge = document.getElementById('profile-level-badge');
      if (badge) {
        badge.textContent = tier.name.toUpperCase();
        badge.className = 'level-badge-lg ' + tier.cls;
      }

      const levelLabel = document.getElementById('profile-level-label');
      if (levelLabel) {
        levelLabel.textContent = nextTier
          ? tier.name + ' → ' + nextTier.name
          : '🏆 ' + tier.name + ' (Max)';
      }

      // XP progress bar
      const xpBar = document.getElementById('xp-fill-bar');
      if (xpBar) {
        const pct = nextTier
          ? Math.min(100, ((xp - tier.min) / (nextTier.min - tier.min)) * 100).toFixed(1)
          : 100;
        setTimeout(() => { if (xpBar) xpBar.style.width = pct + '%'; }, 150);
      }

      // Sidebar bottom XP
      const sideXp = document.querySelector('.sidebar-user .user-xp');
      if (sideXp) sideXp.textContent = 'XP ' + xp.toLocaleString();

      // Fetch real global rank from leaderboard
      try {
        const lbRes = await fetch('/api/leaderboard?period=alltime&limit=5000');
        if (lbRes.ok) {
          const lbData = await lbRes.json();
          const entries = Array.isArray(lbData) ? lbData : (lbData.entries || []);
          const myEntry  = entries.find(e => e.isMe || e.userId === u.id);
          const myIdx   = myEntry ? (entries.indexOf(myEntry)) : -1;
          const globalRank = myEntry ? (myEntry.rank || myIdx + 1) : null;
          const rankEl = document.getElementById('profile-global-rank');
          if (rankEl) {
            rankEl.textContent = globalRank ? '#' + globalRank.toLocaleString() + ' Globally' : 'Unranked';
            rankEl.style.opacity = '1';
          }
        }
      } catch(e) {}

      // Invite card
      _renderInviteCard(u.id, u.name);
    }
  } catch(e) { console.error('initProfile error', e); }
  renderTrophies();
  renderLeagueAccuracy();
}

function _renderInviteCard(userId, userName) {
  // Remove existing card if any (prevents duplicates on re-nav)
  const existing = document.getElementById('invite-friends-card');
  if (existing) existing.remove();

  const refLink = `${window.location.origin}/register?ref=${userId}`;
  const shareText = encodeURIComponent(`Join me on Matchkoo — the football prediction platform! Predict scores, earn XP and compete on leaderboards. Sign up with my invite link:`);
  const waUrl = `https://wa.me/?text=${shareText}%20${encodeURIComponent(refLink)}`;
  const twUrl = `https://twitter.com/intent/tweet?text=${shareText}&url=${encodeURIComponent(refLink)}`;

  const card = document.createElement('section');
  card.id = 'invite-friends-card';
  card.className = 'content-section';
  card.innerHTML = `
      <h2 class="section-title">🎁 Invite Friends</h2>
    </div>
    <div style="background:linear-gradient(135deg,rgba(111,232,64,0.06),rgba(60,184,46,0.03));border:1px solid rgba(111,232,64,0.18);border-radius:18px;padding:22px 20px;">
      <p style="color:rgba(255,255,255,0.65);font-size:0.88rem;line-height:1.6;margin:0 0 16px;">
        Share your personal invite link. When a friend registers using your link, you both earn <strong style="color:#6FE840">+200 XP</strong> instantly.
      </p>
      <div style="display:flex;align-items:center;gap:8px;background:rgba(0,0,0,0.3);border:1px solid rgba(255,255,255,0.1);border-radius:12px;padding:10px 14px;margin-bottom:16px;">
        <span id="invite-link-text" style="flex:1;font-size:0.78rem;color:rgba(255,255,255,0.55);word-break:break-all;font-family:monospace;">${refLink}</span>
        <button onclick="_copyInviteLink('${refLink}')" id="copy-invite-btn"
          style="flex-shrink:0;padding:7px 14px;border-radius:100px;border:1px solid rgba(111,232,64,0.4);background:rgba(111,232,64,0.1);color:#6FE840;font-size:0.75rem;font-weight:700;cursor:pointer;white-space:nowrap;">
          Copy Link
        </button>
      </div>
      <div style="display:flex;gap:10px;">
        <a href="${waUrl}" target="_blank"
          style="flex:1;padding:10px;background:#25D366;color:#fff;border-radius:12px;text-decoration:none;font-weight:700;font-size:0.82rem;text-align:center;">
          📲 WhatsApp
        </a>
        <a href="${twUrl}" target="_blank"
          style="flex:1;padding:10px;background:#1DA1F2;color:#fff;border-radius:12px;text-decoration:none;font-weight:700;font-size:0.82rem;text-align:center;">
          𝕏 Twitter
        </a>
      </div>
    </div>
  `;

  // Insert after the Boost Inventory section (before Accuracy by League)
  const accSection = document.querySelector('#league-accuracy-list')?.closest('section.content-section');
  if (accSection) {
    accSection.parentNode.insertBefore(card, accSection);
  } else {
    document.getElementById('page-profile')?.appendChild(card);
  }
}

function _copyInviteLink(link) {
  navigator.clipboard.writeText(link).then(() => {
    const btn = document.getElementById('copy-invite-btn');
    if (btn) { btn.textContent = '✓ Copied!'; btn.style.color = '#fff'; btn.style.background = 'rgba(111,232,64,0.3)'; }
    setTimeout(() => { if (btn) { btn.textContent = 'Copy Link'; btn.style.color = '#6FE840'; btn.style.background = 'rgba(111,232,64,0.1)'; } }, 2000);
  }).catch(() => {
    showNotification('Copy not supported — please copy the link manually', 'warning');
  });
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
  // Initialize the risk/reward panel with current slider value
  const sliderVal = document.getElementById('confidence-slider')?.value || '70';
  updateConfidence(sliderVal);
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
  const conf = parseInt(val);
  // Multiplier label: 50%→×1.0, 75%→×1.5, 100%→×2.0
  const multiplier = 1 + (conf - 50) / 50;
  document.getElementById('conf-value').textContent = `${conf}% (×${multiplier.toFixed(1)})`;

  // Risk / Reward panel — based on correct-result base of 50 XP
  const reward  = Math.round(50 * multiplier);
  const penalty = Math.round(50 * (conf / 100));
  const rewardEl  = document.getElementById('conf-reward-text');
  const penaltyEl = document.getElementById('conf-penalty-text');
  if (rewardEl)  rewardEl.textContent  = `+${reward} XP`;
  if (penaltyEl) penaltyEl.textContent = `−${penalty} XP`;
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

function selectGoals(num, btn) {
  state.goalsChoice = num; // integer (5 means 5+)
  btn.closest('#goals-picker').querySelectorAll('.goals-btn').forEach(b => b.classList.remove('active-toggle'));
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
      const savedScorer = m.userPrediction?.firstGoalScorer ?? '';
      if (scorerInput) scorerInput.value = savedScorer;
      // Also sync the dropdown if it's already populated (re-open same match)
      const fgsDd = document.getElementById('fgs-dropdown');
      if (fgsDd && savedScorer) {
        fgsDd.value = savedScorer;
        fgsDd.style.borderColor = savedScorer ? 'rgba(41,191,18,0.5)' : 'rgba(255,255,255,0.12)';
      }

      // Restore BTTS
      const pred = m.userPrediction;
      if (pred?.btts !== null && pred?.btts !== undefined) {
        state.bttsChoice = pred.btts ? 'yes' : 'no';
        document.getElementById('btts-yes-btn')?.classList.toggle('active-toggle', pred.btts);
        document.getElementById('btts-no-btn')?.classList.toggle('active-toggle', !pred.btts);
      } else {
        state.bttsChoice = 'yes';
        document.getElementById('btts-yes-btn')?.classList.add('active-toggle');
        document.getElementById('btts-no-btn')?.classList.remove('active-toggle');
      }

      // Restore Total Goals
      if (pred?.totalGoals !== null && pred?.totalGoals !== undefined) {
        state.goalsChoice = pred.totalGoals;
        document.querySelectorAll('.goals-btn').forEach(b => {
          const v = parseInt(b.textContent);
          const match = b.textContent === '5+' ? pred.totalGoals >= 5 : v === pred.totalGoals;
          b.classList.toggle('active-toggle', match);
        });
      } else {
        state.goalsChoice = 0;
        document.querySelectorAll('.goals-btn').forEach((b, i) => b.classList.toggle('active-toggle', i === 0));
      }
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

  // ── Clear any pick/indicator from a previously-opened match ────
  const _ind = document.getElementById('fgs-pick-indicator');
  if (_ind) _ind.style.display = 'none';
  const _sc  = document.getElementById('scorer-select');
  if (_sc)  _sc.value = '';
  try {
    // Check cache first (populated by _renderRealFixtures for any league including WC)
    let m = state._matchCache?.[matchId];

    if (!m) {
      // Cache miss — fall back to general fetch (only covers preferred leagues)
      const fallback = await fetch('/api/matches').then(r => r.ok ? r.json() : []);
      m = fallback.find(x => x.id === matchId);
    }

    if (!m) { showNotification('Match not found', 'error'); return; }
    _applyMatchData(m);

    if (window.animateModalEnter) {
      window.animateModalEnter(document.getElementById('match-modal-overlay'), document.getElementById('match-modal'));
    } else {
      document.getElementById('match-modal-overlay').classList.remove('hidden');
    }
    document.body.style.overflow = 'hidden';

    // Load lineup for prediction form (upcoming + live)
    if (m.status !== 'COMPLETED') {
      _loadLineup(matchId);
    }

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
        // Also refresh lineup/events during live
        _loadLineup(matchId);
      }, 30000); // refresh lineup every 30s during live
    }
  } catch(e) {
    showNotification('Could not load match details', 'error');
  }
}

// ─── LINEUP / PLAYER PICKER ──────────────────────────────────────

async function _loadLineup(matchId) {
  // ── Reset stale state from previous match ──────────────────────
  const dropdown = document.getElementById('fgs-dropdown');
  if (dropdown) {
    dropdown.innerHTML = '<option value="">\u2014 Select a player \u2014</option>';
    dropdown.style.borderColor = 'rgba(255,255,255,0.12)';
  }
  const noMsgReset = document.getElementById('no-lineup-msg');
  if (noMsgReset) noMsgReset.style.display = 'none';

  // Show loading spinner
  const loading = document.getElementById('lineup-loading');
  const picker  = document.getElementById('player-picker');
  if (loading) loading.style.display = 'block';
  if (picker)  picker.style.display  = 'none';

  try {
    const res = await fetch('/api/lineups?matchId=' + matchId);
    if (!res.ok) throw new Error('API error');
    const { lineup, events } = await res.json();

    if (loading) loading.style.display = 'none';
    if (picker)  picker.style.display  = 'block';

    _renderPlayerPicker(lineup, events);
    if (events && events.length > 0) _renderEventsTimeline(events);
  } catch(e) {
    // Silently fall back to text input
    if (loading) loading.style.display = 'none';
    if (picker)  picker.style.display  = 'block';
    const noMsg = document.getElementById('no-lineup-msg');
    if (noMsg) noMsg.style.display = 'block';
  }
}

function _renderPlayerPicker(lineup, events) {
  const noMsg = document.getElementById('no-lineup-msg');

  if (!lineup || (!lineup.home?.startXI?.length && !lineup.away?.startXI?.length)) {
    if (noMsg) noMsg.style.display = 'block';
    return;
  }
  if (noMsg) noMsg.style.display = 'none';

  // Build set of players subbed off
  const subbedOff = new Set();
  if (events) {
    events.filter(e => e.type === 'subst').forEach(e => {
      if (e.assistName) subbedOff.add(e.assistName);
    });
  }

  const currentScorer = (document.getElementById('scorer-select')?.value || '').trim();
  const dropdown = document.getElementById('fgs-dropdown');
  if (!dropdown) return;

  // Build options helper
  const makeOptions = (players, isSub) => players.map(p => {
    const isOff = subbedOff.has(p.name);
    const label = (p.number ? '#' + p.number + ' ' : '') + p.name + (isOff ? ' (off)' : '') + (isSub ? '' : '');
    const opt = document.createElement('option');
    opt.value = p.name;
    opt.textContent = label;
    if (isOff) opt.disabled = true;
    if (p.name === currentScorer) opt.selected = true;
    return opt;
  });

  // Clear & rebuild
  dropdown.innerHTML = '';
  const blankOpt = document.createElement('option');
  blankOpt.value = '';
  blankOpt.textContent = '\u2014 Select a player \u2014';
  dropdown.appendChild(blankOpt);

  const homeTeam = lineup.home?.team || 'Home';
  const awayTeam = lineup.away?.team || 'Away';
  const homeXI   = lineup.home?.startXI   || [];
  const homeSubs = lineup.home?.substitutes || [];
  const awayXI   = lineup.away?.startXI   || [];
  const awaySubs = lineup.away?.substitutes || [];

  const addGroup = (label, players, isSub) => {
    if (!players.length) return;
    const grp = document.createElement('optgroup');
    grp.label = label;
    makeOptions(players, isSub).forEach(o => grp.appendChild(o));
    dropdown.appendChild(grp);
  };

  addGroup('\u26bd ' + homeTeam.toUpperCase() + ' \u2014 Starting XI', homeXI, false);
  addGroup('\u{1F4CB} ' + homeTeam.toUpperCase() + ' \u2014 Bench', homeSubs, true);
  addGroup('\u26bd ' + awayTeam.toUpperCase() + ' \u2014 Starting XI', awayXI, false);
  addGroup('\u{1F4CB} ' + awayTeam.toUpperCase() + ' \u2014 Bench', awaySubs, true);

  // Restore previous pick indicator if already selected
  if (currentScorer) {
    const indicator = document.getElementById('fgs-pick-indicator');
    const pickName  = document.getElementById('fgs-pick-name');
    // find the option to get the number label
    const selOpt = [...dropdown.options].find(o => o.value === currentScorer);
    if (indicator) indicator.style.display = 'flex';
    if (pickName && selOpt) pickName.textContent = selOpt.textContent.replace(' (off)', '');
  }
}

function _onFgsDropdownChange(sel) {
  const scorerInput = document.getElementById('scorer-select');
  const indicator   = document.getElementById('fgs-pick-indicator');
  const pickName    = document.getElementById('fgs-pick-name');
  if (!sel.value) {
    if (scorerInput) scorerInput.value = '';
    if (indicator)   indicator.style.display = 'none';
    return;
  }
  if (scorerInput) scorerInput.value = sel.value;
  // Show pick indicator with label from the selected option
  const selOpt = sel.options[sel.selectedIndex];
  if (indicator) indicator.style.display = 'flex';
  if (pickName && selOpt) pickName.textContent = selOpt.textContent.replace(' (off)', '');
  // Style the dropdown border green to signal selection
  sel.style.borderColor = 'rgba(41,191,18,0.5)';
}

function clearFGSPick() {
  const inp = document.getElementById('scorer-select');
  if (inp) inp.value = '';
  const dropdown = document.getElementById('fgs-dropdown');
  if (dropdown) { dropdown.value = ''; dropdown.style.borderColor = 'rgba(255,255,255,0.12)'; }
  const ind = document.getElementById('fgs-pick-indicator');
  if (ind) ind.style.display = 'none';
}

function _renderEventsTimeline(events) {
  const container = document.getElementById('match-events-timeline');
  if (!container) return;

  const goals = events.filter(e => e.type === 'Goal');
  const subs  = events.filter(e => e.type === 'subst');

  if (goals.length === 0 && subs.length === 0) {
    container.style.display = 'none';
    return;
  }

  container.style.display = 'block';
  const allEvents = [...events].sort((a, b) => (a.time || 0) - (b.time || 0));

  container.innerHTML =
    '<div style="font-size:0.68rem;font-weight:800;color:var(--text-secondary);letter-spacing:1.2px;text-transform:uppercase;margin-bottom:8px">Match Events</div>' +
    '<div class="events-timeline">' +
    allEvents.map(e => {
      const icon   = e.type === 'Goal'  ? (e.detail === 'Penalty' ? '⚽🎯' : e.detail === 'Own Goal' ? '🔴' : '⚽')
                   : e.type === 'subst' ? '🔄' : '';
      const time   = e.time + (e.extraTime ? '+' + e.extraTime : '') + "'";
      const text   = e.type === 'Goal'
        ? '<b>' + e.playerName + '</b>' + (e.assistName ? ' <span style="opacity:0.5">(assist: ' + e.assistName + ')</span>' : '') + ' – ' + e.teamName
        : e.assistName + ' → ' + e.playerName + ' <span style="opacity:0.5">(' + e.teamName + ')</span>';
      return '<div class="event-row"><span class="event-time">' + time + '</span><span class="event-icon">' + icon + '</span><span class="event-text">' + text + '</span></div>';
    }).join('') +
    '</div>';
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
      btts: state.bttsChoice === 'yes',
      totalGoals: typeof state.goalsChoice === 'number' ? state.goalsChoice : null,
    });

    if (btn) { btn.disabled = false; btn.textContent = 'Lock In Predictions'; }

    if (success) {
      closeMatchModal();
      setTimeout(() => showCelebration(1000), 300);
    } else {
      showNotification(message || 'Failed to save prediction', 'error');
    }
  } else {
    // No real match ID yet (mock fixture) — still show celebration
    closeMatchModal();
      setTimeout(() => showCelebration(1000), 300);
  }
}

// ─── DAILY BONUS ─────────────────────────────────────────────────
async function openDailyBonus() {
  // First open the modal shell
  if (window.animateModalEnter) {
    window.animateModalEnter(
      document.getElementById('bonus-modal-overlay'),
      document.querySelector('.bonus-modal')
    );
  } else {
    document.getElementById('bonus-modal-overlay').classList.remove('hidden');
  }
  document.body.style.overflow = 'hidden';
  drawWheel(0);
  document.getElementById('spin-result').classList.add('hidden');

  // Check whether the user has already spun today — always ask the server
  // so closing + reopening the modal can't bypass the gate
  const btn = document.getElementById('spin-btn');
  btn.disabled = true;
  btn.textContent = 'Checking…';

  try {
    const res = await fetch('/api/daily-spin');
    const data = res.ok ? await res.json() : {};
    if (data.spunToday) {
      state.spinDone = true;
      btn.disabled = true;
      btn.textContent = 'Come back tomorrow!';
      // Show what they already won today
      if (data.prize) {
        document.getElementById('spin-result').classList.remove('hidden');
        document.getElementById('spin-result-text').textContent = `You already won ${data.prize} today!`;
        document.getElementById('xp-counter').textContent = data.prize;
      }
    } else {
      state.spinDone = false;
      btn.disabled = false;
      btn.textContent = 'SPIN!';
    }
  } catch(e) {
    // On network error fall back to in-memory state
    if (state.spinDone) {
      btn.disabled = true;
      btn.textContent = 'Come back tomorrow!';
    } else {
      btn.disabled = false;
      btn.textContent = 'SPIN!';
    }
  }
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
  const n = prizes.length;
  const arc = (2 * Math.PI) / n;
  const r = 162;      // canvas is 324×324
  const cx = 162, cy = 162;

  ctx.clearRect(0, 0, 324, 324);

  // ── Segments ──────────────────────────────────────────────────────────
  prizes.forEach((prize, i) => {
    const start = angle + i * arc - Math.PI / 2;
    const end   = start + arc;
    const mid   = start + arc / 2;

    // Base fill
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, start, end);
    ctx.closePath();
    ctx.fillStyle = prize.color;
    ctx.fill();

    // Divider line
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, start, end);
    ctx.closePath();
    ctx.strokeStyle = 'rgba(255,255,255,0.22)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Glossy sheen (radial highlight from segment face)
    const gx = cx + Math.cos(mid) * r * 0.5;
    const gy = cy + Math.sin(mid) * r * 0.5;
    const gloss = ctx.createRadialGradient(gx, gy, 0, gx, gy, r * 0.55);
    gloss.addColorStop(0, 'rgba(255,255,255,0.22)');
    gloss.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, start, end);
    ctx.closePath();
    ctx.fillStyle = gloss;
    ctx.fill();

    // Label (rotated to point outward)
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(mid);
    ctx.textAlign = 'right';

    const labelX = r - 14;
    const parts = prize.label.split(' ');
    if (parts.length >= 2) {
      ctx.font = 'bold 12px "Russo One", sans-serif';
      ctx.fillStyle = prize.textColor || '#fff';
      ctx.fillText(parts.slice(1).join(' '), labelX, -4);
      ctx.font = '700 10px "Nunito", sans-serif';
      ctx.fillStyle = (prize.textColor || '#fff') + 'bb';
      ctx.fillText(parts[0], labelX, 8);
    } else {
      ctx.font = 'bold 12px "Russo One", sans-serif';
      ctx.fillStyle = prize.textColor || '#fff';
      ctx.fillText(prize.label, labelX, 5);
    }
    ctx.restore();
  });

  // ── Inner shadow ring ─────────────────────────────────────────────────
  const shadow = ctx.createRadialGradient(cx, cy, r - 6, cx, cy, r);
  shadow.addColorStop(0, 'rgba(0,0,0,0.5)');
  shadow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, 2 * Math.PI);
  ctx.fillStyle = shadow;
  ctx.fill();

  // ── Gold hub ──────────────────────────────────────────────────────────
  ctx.beginPath();
  ctx.arc(cx, cy, 32, 0, 2 * Math.PI);
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fill();

  const hubGrad = ctx.createRadialGradient(cx - 9, cy - 9, 2, cx, cy, 30);
  hubGrad.addColorStop(0, '#fff7a0');
  hubGrad.addColorStop(0.4, '#f0b429');
  hubGrad.addColorStop(1, '#7a4a00');
  ctx.beginPath();
  ctx.arc(cx, cy, 28, 0, 2 * Math.PI);
  ctx.fillStyle = hubGrad;
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.45)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // ── Football emoji in centre ──────────────────────────────────────────
  ctx.font = '22px serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('⚽', cx, cy + 1);
}

async function spinWheel() {
  if (state.spinDone) return;
  state.spinDone = true;

  const btn = document.getElementById('spin-btn');
  btn.disabled = true;
  btn.textContent = 'Spinning...';

  const prizes = DATA.spinPrizes;
  const n = prizes.length;
  const arc = (2 * Math.PI) / n;
  const winIndex = Math.floor(Math.random() * n);

  // Spin 6–9 full rotations then land pointer at centre of winning segment
  const fullRotations = 6 + Math.floor(Math.random() * 4);
  const targetAngle = fullRotations * 2 * Math.PI
    + (n - winIndex) * arc
    - arc / 2;

  const duration = 5000;
  const startTime = performance.now();

  // Elastic ease-out — wheel bounces slightly at the end (CodePen style)
  function easeOutElastic(t) {
    if (t <= 0 || t >= 1) return t;
    const p = 0.38;
    return Math.pow(2, -10 * t) * Math.sin((t - p / 4) * (2 * Math.PI) / p) + 1;
  }

  function animate(now) {
    const elapsed  = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    drawWheel(easeOutElastic(progress) * targetAngle);
    if (progress < 1) {
      requestAnimationFrame(animate);
    } else {
      // ── Reveal result ──────────────────────────────────────────────
      const prize = prizes[winIndex];
      const resultEl = document.getElementById('spin-result');
      resultEl.classList.remove('hidden');
      document.getElementById('spin-result-text').textContent = `🎉 You won ${prize.label}!`;
      const counter = document.getElementById('xp-counter');
      counter.textContent = prize.label.includes('XP') ? '+' + prize.label : prize.label + ' unlocked!';
      counter.style.color = prize.color;
      counter.style.textShadow = `0 0 24px ${prize.color}88`;
      btn.textContent = '🎊 Come back tomorrow!';
      floatXP(prize.label, document.getElementById('bonus-modal-overlay'));

      // Award XP in DB
      const xpMatch = prize.label.match(/(\d+)\s*XP/);
      const xpAmount = xpMatch ? parseInt(xpMatch[1]) : 0;
      fetch('/api/daily-spin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prize: prize.label, xp: xpAmount }),
      }).then(r => {
        if (r.status === 409) { btn.textContent = '🎊 Come back tomorrow!'; btn.disabled = true; return null; }
        return r.json();
      }).then(d => {
        if (d && d.xpAwarded) {
          document.querySelectorAll('.user-xp, #profile-xp').forEach(el => {
            const cur = parseInt((el.textContent || '0').replace(/\D/g, '')) || 0;
            el.textContent = (cur + d.xpAwarded).toLocaleString() + ' XP';
          });
        }
      }).catch(() => {});
    }
  }

  requestAnimationFrame(animate);
}

async function _checkDailySpinStatus() {
  try {
    const res = await fetch('/api/daily-spin');
    if (!res.ok) return;
    const data = await res.json();
    if (data.spunToday) {
      // Already spun — disable button and show message
      state.spinDone = true;
      const btn = document.getElementById('spin-btn');
      if (btn) { btn.disabled = true; btn.textContent = 'Come back tomorrow!'; }
      const bannerBtn = document.querySelector('#daily-bonus-banner button');
      if (bannerBtn) bannerBtn.textContent = '🎡 Spin Again Tomorrow';
    }
  } catch(e) {}
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
  const url = encodeURIComponent(window.location.origin);
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
// ─── LEAGUE SLUG DEEP-LINK RESTORE ───────────────────────────────
/** Resolves a URL slug (e.g. 'premier-league' or 'europe') to the
 *  correct continent tab or league fixture view. Called on popstate
 *  and initial deep-link load. */
async function _restoreLeagueFromSlug(slug) {
  // Check if it's a continent ID first
  const CONTINENT_IDS = ['europe', 'africa', 'americas', 'asia', 'oceania', 'world'];
  if (CONTINENT_IDS.includes(slug)) {
    selectContinent(slug, true);
    return;
  }
  // Otherwise try to match to a real tournament by slug
  try {
    const tournaments = await fetch('/api/tournaments').then(r => r.ok ? r.json() : []);
    // Build slug from tournament name and compare
    const matched = tournaments.find(t => {
      const tSlug = (t.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      // Also try stripping year + [id]
      const tSlugClean = (t.name || '')
        .toLowerCase()
        .replace(/\s+\d{4}(\s+\[\d+\])?$/, '')
        .replace(/\s+\[\d+\]$/, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      return tSlug === slug || tSlugClean === slug;
    });
    if (matched) {
      // Find the display name (clean version)
      const displayName = matched.name
        .replace(/\s+\d{4}(\s+\[\d+\])?$/, '')
        .replace(/\s+\[\d+\]$/, '')
        .trim();
      openLeagueFixtures(matched.id, displayName, true);
    }
  } catch(e) { /* silent */ }
}

// ─── INIT ────────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  const path = window.location.pathname;

  // Detect language from URL (e.g. /ar/app/leaderboard → 'ar')
  const lang = _detectLangFromPath(path);
  window._currentLang = lang;

  // Detect initial page
  const initialPage = _detectPageFromPath(path);

  // Sync language dropdowns
  const d = document.getElementById('lang-select-desktop');
  const m = document.getElementById('lang-select-mobile');
  if (d) d.value = lang;
  if (m) m.value = lang;

  // Apply translations immediately
  if (typeof applyTranslations === 'function') applyTranslations(lang);

  navigate(initialPage, true);
  drawWheel(0);
  startLiveSimulation();

  // Replace initial history entry so popstate works correctly
  window.history.replaceState({ page: initialPage, lang }, '', path);

  // Deep-link: if opened directly at /app/leagues/{slug}, restore that view
  if (initialPage === 'leagues') {
    const leagueSlug = _detectLeagueSlugFromPath(path);
    if (leagueSlug) {
      // Wait for backend_api to hydrate DATA first, then restore
      setTimeout(() => _restoreLeagueFromSlug(leagueSlug), 600);
    }
  }

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
// Static logo map: API-Football CDN for clubs, flagcdn.com for national teams
// These are fallbacks when a team hasn't appeared in a synced match yet.
const STATIC_LOGO_MAP = {
  // ── Premier League ──────────────────────────────────────────────
  'Arsenal':            'https://media.api-sports.io/football/teams/42.png',
  'Aston Villa':        'https://media.api-sports.io/football/teams/66.png',
  'Bournemouth':        'https://media.api-sports.io/football/teams/35.png',
  'Brentford':          'https://media.api-sports.io/football/teams/55.png',
  'Brighton':           'https://media.api-sports.io/football/teams/51.png',
  'Chelsea':            'https://media.api-sports.io/football/teams/49.png',
  'Crystal Palace':     'https://media.api-sports.io/football/teams/52.png',
  'Everton':            'https://media.api-sports.io/football/teams/45.png',
  'Fulham':             'https://media.api-sports.io/football/teams/36.png',
  'Ipswich Town':       'https://media.api-sports.io/football/teams/57.png',
  'Leicester City':     'https://media.api-sports.io/football/teams/46.png',
  'Liverpool':          'https://media.api-sports.io/football/teams/40.png',
  'Manchester City':    'https://media.api-sports.io/football/teams/50.png',
  'Manchester United':  'https://media.api-sports.io/football/teams/33.png',
  'Newcastle':          'https://media.api-sports.io/football/teams/34.png',
  'Nottingham Forest':  'https://media.api-sports.io/football/teams/65.png',
  'Southampton':        'https://media.api-sports.io/football/teams/41.png',
  'Tottenham':          'https://media.api-sports.io/football/teams/47.png',
  'West Ham':           'https://media.api-sports.io/football/teams/48.png',
  'Wolverhampton':      'https://media.api-sports.io/football/teams/39.png',
  'Leeds United':       'https://media.api-sports.io/football/teams/63.png',
  'Sunderland':         'https://media.api-sports.io/football/teams/69.png',
  'Sheffield United':   'https://media.api-sports.io/football/teams/62.png',
  'Middlesbrough':      'https://media.api-sports.io/football/teams/68.png',
  'West Brom':          'https://media.api-sports.io/football/teams/67.png',
  'Burnley':            'https://media.api-sports.io/football/teams/44.png',
  'Luton Town':         'https://media.api-sports.io/football/teams/1359.png',
  'Derby County':       'https://media.api-sports.io/football/teams/64.png',
  'Norwich City':       'https://media.api-sports.io/football/teams/71.png',
  'Watford':            'https://media.api-sports.io/football/teams/38.png',
  'Swansea City':       'https://media.api-sports.io/football/teams/72.png',
  'Stoke City':         'https://media.api-sports.io/football/teams/70.png',
  // ── La Liga ─────────────────────────────────────────────────────
  'Alaves':             'https://media.api-sports.io/football/teams/542.png',
  'Almeria':            'https://media.api-sports.io/football/teams/727.png',
  'Athletic Bilbao':    'https://media.api-sports.io/football/teams/531.png',
  'Atletico Madrid':    'https://media.api-sports.io/football/teams/530.png',
  'Barcelona':          'https://media.api-sports.io/football/teams/529.png',
  'Betis':              'https://media.api-sports.io/football/teams/543.png',
  'Celta Vigo':         'https://media.api-sports.io/football/teams/538.png',
  'Getafe':             'https://media.api-sports.io/football/teams/546.png',
  'Girona':             'https://media.api-sports.io/football/teams/547.png',
  'Granada':            'https://media.api-sports.io/football/teams/715.png',
  'Las Palmas':         'https://media.api-sports.io/football/teams/534.png',
  'Mallorca':           'https://media.api-sports.io/football/teams/798.png',
  'Osasuna':            'https://media.api-sports.io/football/teams/539.png',
  'Rayo Vallecano':     'https://media.api-sports.io/football/teams/728.png',
  'Real Madrid':        'https://media.api-sports.io/football/teams/541.png',
  'Real Sociedad':      'https://media.api-sports.io/football/teams/548.png',
  'Sevilla':            'https://media.api-sports.io/football/teams/536.png',
  'Valencia':           'https://media.api-sports.io/football/teams/532.png',
  'Valladolid':         'https://media.api-sports.io/football/teams/720.png',
  'Villarreal':         'https://media.api-sports.io/football/teams/533.png',
  'Espanyol':           'https://media.api-sports.io/football/teams/537.png',
  'Cádiz':              'https://media.api-sports.io/football/teams/724.png',
  'Leganés':            'https://media.api-sports.io/football/teams/723.png',
  'Málaga':             'https://media.api-sports.io/football/teams/725.png',
  'Levante':            'https://media.api-sports.io/football/teams/731.png',
  'Huesca':             'https://media.api-sports.io/football/teams/730.png',
  'Elche':              'https://media.api-sports.io/football/teams/769.png',
  'Deportivo La Coruña':'https://media.api-sports.io/football/teams/535.png',
  'Zaragoza':           'https://media.api-sports.io/football/teams/726.png',
  'Sporting Gijón':    'https://media.api-sports.io/football/teams/733.png',
  'Eibar':              'https://media.api-sports.io/football/teams/544.png',
  'Tenerife':           'https://media.api-sports.io/football/teams/745.png',
  // ── Serie A ─────────────────────────────────────────────────────
  'AC Milan':           'https://media.api-sports.io/football/teams/489.png',
  'Atalanta':           'https://media.api-sports.io/football/teams/499.png',
  'Bologna':            'https://media.api-sports.io/football/teams/500.png',
  'Cagliari':           'https://media.api-sports.io/football/teams/490.png',
  'Como':               'https://media.api-sports.io/football/teams/1106.png',
  'Empoli':             'https://media.api-sports.io/football/teams/511.png',
  'Fiorentina':         'https://media.api-sports.io/football/teams/502.png',
  'Genoa':              'https://media.api-sports.io/football/teams/508.png',
  'Inter Milan':        'https://media.api-sports.io/football/teams/505.png',
  'Juventus':           'https://media.api-sports.io/football/teams/496.png',
  'Lazio':              'https://media.api-sports.io/football/teams/487.png',
  'Lecce':              'https://media.api-sports.io/football/teams/867.png',
  'Monza':              'https://media.api-sports.io/football/teams/1106.png',
  'Napoli':             'https://media.api-sports.io/football/teams/492.png',
  'Parma':              'https://media.api-sports.io/football/teams/503.png',
  'Roma':               'https://media.api-sports.io/football/teams/497.png',
  'Torino':             'https://media.api-sports.io/football/teams/586.png',
  'Udinese':            'https://media.api-sports.io/football/teams/494.png',
  'Venezia':            'https://media.api-sports.io/football/teams/517.png',
  'Verona':             'https://media.api-sports.io/football/teams/504.png',
  'Sassuolo':           'https://media.api-sports.io/football/teams/498.png',
  'Sampdoria':          'https://media.api-sports.io/football/teams/491.png',
  'Spezia':             'https://media.api-sports.io/football/teams/515.png',
  'Salernitana':        'https://media.api-sports.io/football/teams/514.png',
  'Frosinone':          'https://media.api-sports.io/football/teams/512.png',
  'Cremonese':          'https://media.api-sports.io/football/teams/493.png',
  'Palermo':            'https://media.api-sports.io/football/teams/486.png',
  'Benevento':          'https://media.api-sports.io/football/teams/844.png',
  'Brescia':            'https://media.api-sports.io/football/teams/672.png',
  'Pisa':               'https://media.api-sports.io/football/teams/507.png',
  'Ascoli':             'https://media.api-sports.io/football/teams/509.png',
  'Cosenza':            'https://media.api-sports.io/football/teams/845.png',
  // ── Bundesliga ──────────────────────────────────────────────────
  'Augsburg':           'https://media.api-sports.io/football/teams/170.png',
  'Bayer Leverkusen':   'https://media.api-sports.io/football/teams/168.png',
  'Bayern Munich':      'https://media.api-sports.io/football/teams/157.png',
  'Borussia Dortmund':  'https://media.api-sports.io/football/teams/165.png',
  'Borussia Mönchengladbach': 'https://media.api-sports.io/football/teams/163.png',
  'Eintracht Frankfurt':'https://media.api-sports.io/football/teams/169.png',
  'Freiburg':           'https://media.api-sports.io/football/teams/160.png',
  'Hoffenheim':         'https://media.api-sports.io/football/teams/167.png',
  'Mainz':              'https://media.api-sports.io/football/teams/164.png',
  'RB Leipzig':         'https://media.api-sports.io/football/teams/173.png',
  'Stuttgart':          'https://media.api-sports.io/football/teams/172.png',
  'Union Berlin':       'https://media.api-sports.io/football/teams/182.png',
  'Werder Bremen':      'https://media.api-sports.io/football/teams/162.png',
  'Wolfsburg':          'https://media.api-sports.io/football/teams/161.png',
  'Bochum':             'https://media.api-sports.io/football/teams/176.png',
  'Heidenheim':         'https://media.api-sports.io/football/teams/674.png',
  'St. Pauli':          'https://media.api-sports.io/football/teams/186.png',
  'Holstein Kiel':      'https://media.api-sports.io/football/teams/185.png',
  'Hamburger SV':       'https://media.api-sports.io/football/teams/180.png',
  'Hamburg':            'https://media.api-sports.io/football/teams/180.png',
  'Schalke 04':         'https://media.api-sports.io/football/teams/178.png',
  'Hertha Berlin':      'https://media.api-sports.io/football/teams/159.png',
  'FC Köln':            'https://media.api-sports.io/football/teams/192.png',
  'Hannover 96':        'https://media.api-sports.io/football/teams/183.png',
  'Fortuna Düsseldorf': 'https://media.api-sports.io/football/teams/181.png',
  'Nürnberg':           'https://media.api-sports.io/football/teams/188.png',
  'Darmstadt 98':       'https://media.api-sports.io/football/teams/177.png',
  'Kaiserslautern':     'https://media.api-sports.io/football/teams/184.png',
  'Greuther Fürth':     'https://media.api-sports.io/football/teams/1049.png',
  'Paderborn':          'https://media.api-sports.io/football/teams/1050.png',
  'Karlsruhe':          'https://media.api-sports.io/football/teams/175.png',
  'Arminia Bielefeld':  'https://media.api-sports.io/football/teams/1051.png',
  // ── Ligue 1 ─────────────────────────────────────────────────────
  'PSG':                'https://media.api-sports.io/football/teams/85.png',
  'Marseille':          'https://media.api-sports.io/football/teams/81.png',
  'Lyon':               'https://media.api-sports.io/football/teams/80.png',
  'Monaco':             'https://media.api-sports.io/football/teams/91.png',
  'Lille':              'https://media.api-sports.io/football/teams/79.png',
  'Nice':               'https://media.api-sports.io/football/teams/84.png',
  'Lens':               'https://media.api-sports.io/football/teams/116.png',
  'Rennes':             'https://media.api-sports.io/football/teams/94.png',
  'Strasbourg':         'https://media.api-sports.io/football/teams/95.png',
  'Nantes':             'https://media.api-sports.io/football/teams/83.png',
  'Brest':              'https://media.api-sports.io/football/teams/130.png',
  'Reims':              'https://media.api-sports.io/football/teams/93.png',
  'Toulouse':           'https://media.api-sports.io/football/teams/96.png',
  'Le Havre':           'https://media.api-sports.io/football/teams/1103.png',
  'Montpellier':        'https://media.api-sports.io/football/teams/82.png',
  'Angers':             'https://media.api-sports.io/football/teams/77.png',
  'Auxerre':            'https://media.api-sports.io/football/teams/778.png',
  'Saint-Etienne':      'https://media.api-sports.io/football/teams/97.png',
  'Lorient':            'https://media.api-sports.io/football/teams/112.png',
  'Metz':               'https://media.api-sports.io/football/teams/113.png',
  'Bordeaux':           'https://media.api-sports.io/football/teams/78.png',
  'Guingamp':           'https://media.api-sports.io/football/teams/106.png',
  'Caen':               'https://media.api-sports.io/football/teams/71.png',
  'Dijon':              'https://media.api-sports.io/football/teams/90.png',
  'Clermont':           'https://media.api-sports.io/football/teams/523.png',
  'Ajaccio':            'https://media.api-sports.io/football/teams/76.png',
  'Nancy':              'https://media.api-sports.io/football/teams/109.png',
  'Valenciennes':       'https://media.api-sports.io/football/teams/108.png',
  'Nîmes':              'https://media.api-sports.io/football/teams/118.png',
  'Bastia':             'https://media.api-sports.io/football/teams/120.png',
  'Grenoble':           'https://media.api-sports.io/football/teams/119.png',
  'Troyes':             'https://media.api-sports.io/football/teams/514.png',
  // ── Champions League ────────────────────────────────────────────
  'Benfica':            'https://media.api-sports.io/football/teams/211.png',
  'Bologna':            'https://media.api-sports.io/football/teams/500.png',
  'Celtic':             'https://media.api-sports.io/football/teams/264.png',
  'Club Brugge':        'https://media.api-sports.io/football/teams/462.png',
  'Dinamo Zagreb':      'https://media.api-sports.io/football/teams/472.png',
  'Feyenoord':          'https://media.api-sports.io/football/teams/715.png',
  'Leverkusen':         'https://media.api-sports.io/football/teams/168.png',
  'PSV Eindhoven':      'https://media.api-sports.io/football/teams/718.png',
  'Red Star Belgrade':  'https://media.api-sports.io/football/teams/477.png',
  'Salzburg':           'https://media.api-sports.io/football/teams/1084.png',
  'Shakhtar Donetsk':   'https://media.api-sports.io/football/teams/255.png',
  'Slovan Bratislava':  'https://media.api-sports.io/football/teams/543.png',
  'Sporting CP':        'https://media.api-sports.io/football/teams/228.png',
  'Sturm Graz':         'https://media.api-sports.io/football/teams/1084.png',
  'Young Boys':         'https://media.api-sports.io/football/teams/1099.png',
  // ── Egyptian Premier League ───────────────────────────────────
  // ── South Africa PSL ───────────────────────────────────────────
  'Mamelodi Sundowns':   'https://media.api-sports.io/football/teams/2699.png',
  'Kaizer Chiefs':       'https://media.api-sports.io/football/teams/2712.png',
  'Orlando Pirates':     'https://media.api-sports.io/football/teams/2713.png',
  'AmaZulu':             'https://media.api-sports.io/football/teams/10504.png',
  'Golden Arrows':       'https://media.api-sports.io/football/teams/10506.png',
  'Swallows FC':         'https://media.api-sports.io/football/teams/10511.png',
  'Maritzburg United':   'https://media.api-sports.io/football/teams/10513.png',
  // ── Morocco Botola Pro ────────────────────────────────────────────
  'Wydad AC':            'https://media.api-sports.io/football/teams/968.png',
  'Raja CA':             'https://media.api-sports.io/football/teams/967.png',
  'AS FAR':              'https://media.api-sports.io/football/teams/8149.png',
  'Moghreb Tétouan':     'https://media.api-sports.io/football/teams/8151.png',
  'Hassania Agadir':     'https://media.api-sports.io/football/teams/1347.png',
  'Difaa El Jadidi':     'https://media.api-sports.io/football/teams/8154.png',
  'Ittihad Tanger':      'https://media.api-sports.io/football/teams/8155.png',
  'FUS Rabat':           'https://media.api-sports.io/football/teams/8156.png',
  'MAS Fès':             'https://media.api-sports.io/football/teams/8157.png',
  'Renaissance Berkane': 'https://media.api-sports.io/football/teams/8158.png',
  'Rapide Oued Zem':     'https://media.api-sports.io/football/teams/8159.png',
  'Chabab Rif':          'https://media.api-sports.io/football/teams/8160.png',
  'Youssoufia Berrechid':'https://media.api-sports.io/football/teams/8161.png',
  'Maghreb Fès':         'https://media.api-sports.io/football/teams/8162.png',
  // ── Algeria Ligue 1 ───────────────────────────────────────────────────
  'USM Alger':           'https://media.api-sports.io/football/teams/8350.png',
  'MC Alger':            'https://media.api-sports.io/football/teams/8351.png',
  'CR Belouizdad':       'https://media.api-sports.io/football/teams/8352.png',
  'JS Kabylie':          'https://media.api-sports.io/football/teams/8353.png',
  'ES Sétif':            'https://media.api-sports.io/football/teams/8354.png',
  'MC Oran':             'https://media.api-sports.io/football/teams/8355.png',
  'NA Hussein Dey':      'https://media.api-sports.io/football/teams/8356.png',
  'ASO Chlef':           'https://media.api-sports.io/football/teams/8358.png',
  'CS Constantine':      'https://media.api-sports.io/football/teams/8359.png',
  'AS Aïn M\'lila':     'https://media.api-sports.io/football/teams/8361.png',
  'Paradou AC':          'https://media.api-sports.io/football/teams/8362.png',
  'DRB Tadjenanet':      'https://media.api-sports.io/football/teams/8363.png',
  'RC Relizane':         'https://media.api-sports.io/football/teams/8364.png',
  'NC Magra':            'https://media.api-sports.io/football/teams/8365.png',
  // ── Tunisia Ligue 1 ───────────────────────────────────────────────────
  'Espérance ST':        'https://media.api-sports.io/football/teams/854.png',
  'Étoile Sahel':        'https://media.api-sports.io/football/teams/855.png',
  'Club Africain':       'https://media.api-sports.io/football/teams/856.png',
  'CS Sfaxien':          'https://media.api-sports.io/football/teams/857.png',
  'CA Bizertin':         'https://media.api-sports.io/football/teams/8754.png',
  'AS Gabès':            'https://media.api-sports.io/football/teams/8759.png',
  'US Ben Guerdane':     'https://media.api-sports.io/football/teams/8760.png',
  'Olympique Béja':      'https://media.api-sports.io/football/teams/8763.png',
  'CO Médenine':         'https://media.api-sports.io/football/teams/8765.png',
  'Al Ahly':            'https://media.api-sports.io/football/teams/440.png',
  'Zamalek':            '/images/clubs/zamalek.png',
  'Pyramids FC':        '/images/clubs/pyramids_fc.png',
  'Ismaily':            '/images/clubs/ismaily.png',
  'ENPPI':              '/images/clubs/enppi.png',
  'Haras El Hodood':    'https://media.api-sports.io/football/teams/633.png',
  'Smouha':             '/images/clubs/smouha.png',
  'Ittihad Alexandria': '/images/clubs/ittihad_alexandria.png',
  'El Geish':           'https://media.api-sports.io/football/teams/2285.png',
  'Ceramica Cleopatra': 'https://media.api-sports.io/football/teams/2284.png',
  'Future FC':          'https://media.api-sports.io/football/teams/2286.png',
  'Wadi Degla':         'https://media.api-sports.io/football/teams/2287.png',
  'Ghazl El Mahalla':   '/images/clubs/ghazl_el_mahalla.png',
  'National Bank':      '/images/clubs/national_bank.png',
  // ── FIFA World Cup — National Teams (flags via flagcdn.com) ──────
  'Argentina':    'https://flagcdn.com/w80/ar.png',
  'Australia':    'https://flagcdn.com/w80/au.png',
  'Belgium':      'https://flagcdn.com/w80/be.png',
  'Brazil':       'https://flagcdn.com/w80/br.png',
  'Cameroon':     'https://flagcdn.com/w80/cm.png',
  'Canada':       'https://flagcdn.com/w80/ca.png',
  'Costa Rica':   'https://flagcdn.com/w80/cr.png',
  'Croatia':      'https://flagcdn.com/w80/hr.png',
  'Denmark':      'https://flagcdn.com/w80/dk.png',
  'Ecuador':      'https://flagcdn.com/w80/ec.png',
  'England':      'https://flagcdn.com/w80/gb-eng.png',
  'France':       'https://flagcdn.com/w80/fr.png',
  'Germany':      'https://flagcdn.com/w80/de.png',
  'Ghana':        'https://flagcdn.com/w80/gh.png',
  'Iran':         'https://flagcdn.com/w80/ir.png',
  'Japan':        'https://flagcdn.com/w80/jp.png',
  'Mexico':       'https://flagcdn.com/w80/mx.png',
  'Morocco':      'https://flagcdn.com/w80/ma.png',
  'Netherlands':  'https://flagcdn.com/w80/nl.png',
  'Poland':       'https://flagcdn.com/w80/pl.png',
  'Portugal':     'https://flagcdn.com/w80/pt.png',
  'Qatar':        'https://flagcdn.com/w80/qa.png',
  'Saudi Arabia': 'https://flagcdn.com/w80/sa.png',
  'Senegal':      'https://flagcdn.com/w80/sn.png',
  'Serbia':       'https://flagcdn.com/w80/rs.png',
  'South Korea':  'https://flagcdn.com/w80/kr.png',
  'Spain':        'https://flagcdn.com/w80/es.png',
  'Switzerland':  'https://flagcdn.com/w80/ch.png',
  'Tunisia':      'https://flagcdn.com/w80/tn.png',
  'USA':          'https://flagcdn.com/w80/us.png',
  'Uruguay':      'https://flagcdn.com/w80/uy.png',
  'Wales':        'https://flagcdn.com/w80/gb-wls.png',
  // ── Saudi Pro League ─────────────────────────────────────────────
  'Al Hilal':     'https://media.api-sports.io/football/teams/2932.png',
  'Al Nassr':     'https://media.api-sports.io/football/teams/2930.png',
  'Al Ittihad':   'https://media.api-sports.io/football/teams/2934.png',
  'Al Ahli':      'https://media.api-sports.io/football/teams/2937.png',
  'Al Ettifaq':   'https://media.api-sports.io/football/teams/2924.png',
  'Al Shabab':    'https://media.api-sports.io/football/teams/2929.png',
};

const CLUBS_DB = {
  // ── EUROPE ──────────────────────────────────────────────────────
  'Premier League': { country: 'England', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', continent: 'europe', clubs: [
    'Arsenal','Aston Villa','Bournemouth','Brentford','Brighton',
    'Chelsea','Crystal Palace','Everton','Fulham','Ipswich Town',
    'Leicester City','Liverpool','Manchester City','Manchester United','Newcastle',
    'Nottingham Forest','Southampton','Tottenham','West Ham','Wolverhampton',
    'Leeds United','Sunderland','Sheffield United','Middlesbrough','West Brom',
    'Burnley','Luton Town','Derby County','Norwich City','Watford',
    'Swansea City','Stoke City'
  ]},
  'La Liga': { country: 'Spain', flag: '🇪🇸', continent: 'europe', clubs: [
    'Alaves','Almeria','Athletic Bilbao','Atletico Madrid','Barcelona',
    'Betis','Celta Vigo','Getafe','Girona','Granada',
    'Las Palmas','Mallorca','Osasuna','Rayo Vallecano','Real Madrid',
    'Real Sociedad','Sevilla','Valencia','Valladolid','Villarreal',
    'Espanyol','Cádiz','Leganés','Málaga','Levante',
    'Huesca','Elche','Deportivo La Coruña','Zaragoza','Sporting Gijón',
    'Eibar','Tenerife'
  ]},
  'Serie A': { country: 'Italy', flag: '🇮🇹', continent: 'europe', clubs: [
    'AC Milan','Atalanta','Bologna','Cagliari','Como',
    'Empoli','Fiorentina','Genoa','Inter Milan','Juventus',
    'Lazio','Lecce','Monza','Napoli','Parma',
    'Roma','Torino','Udinese','Venezia','Verona',
    'Sassuolo','Sampdoria','Spezia','Salernitana','Frosinone',
    'Cremonese','Palermo','Benevento','Brescia','Pisa',
    'Ascoli','Cosenza'
  ]},
  'Bundesliga': { country: 'Germany', flag: '🇩🇪', continent: 'europe', clubs: [
    'Augsburg','Bayer Leverkusen','Bayern Munich','Borussia Dortmund','Borussia Mönchengladbach',
    'Eintracht Frankfurt','Freiburg','Hamburger SV','Heidenheim','Hoffenheim',
    'Mainz','RB Leipzig','St. Pauli','Stuttgart','Union Berlin',
    'Werder Bremen','Wolfsburg','Bochum','Holstein Kiel','FC Köln',
    'Schalke 04','Hertha Berlin','Hannover 96','Fortuna Düsseldorf','Nürnberg',
    'Darmstadt 98','Kaiserslautern','Greuther Fürth','Paderborn','Karlsruhe',
    'Arminia Bielefeld','VfB Stuttgart II'
  ]},
  'Ligue 1': { country: 'France', flag: '🇫🇷', continent: 'europe', clubs: [
    'PSG','Monaco','Marseille','Lyon','Lille',
    'Nice','Lens','Rennes','Strasbourg','Toulouse',
    'Montpellier','Nantes','Reims','Le Havre','Auxerre',
    'Angers','Saint-Etienne','Brest','Lorient','Metz',
    'Bordeaux','Guingamp','Caen','Dijon','Clermont',
    'Ajaccio','Nancy','Valenciennes','Nîmes','Bastia',
    'Grenoble','Troyes'
  ]},

  // ── AFRICA ──────────────────────────────────────────────────────
  'Egyptian Premier League': { country: 'Egypt', flag: '🇪🇬', continent: 'africa', clubs: [
    'Al Ahly','Al Mokawloon','Asyut Cement','Ceramica Cleopatra','El Entag El Harby',
    'El Geish','El Gouna','ENPPI','Farco','Future FC',
    'Haras El Hodood','Ismaily','Ittihad Alexandria','National Bank','Pyramids FC',
    'Smouha','Tala\'a El Gaish','Wadi Degla','Zamalek','Ghazl El Mahalla'
  ]},
  'South African PSL': { country: 'South Africa', flag: '🇿🇦', continent: 'africa', clubs: [
    'Mamelodi Sundowns','Kaizer Chiefs','Orlando Pirates','SuperSport United',
    'Cape Town City','AmaZulu','Stellenbosch FC','Golden Arrows',
    'TS Galaxy','Sekhukhune United','Chippa United','Richards Bay',
    'Swallows FC','Polokwane City','Maritzburg United','Marumo Gallants'
  ]},
  'Botola Pro (Morocco)': { country: 'Morocco', flag: '🇲🇦', continent: 'africa', clubs: [
    'Wydad AC','Raja CA','RS Berkane','AS FAR',
    'Moghreb Tétouan','Olympique Khouribga','Hassania Agadir','Difaa El Jadidi',
    'Ittihad Tanger','FUS Rabat','MAS Fès','Renaissance Berkane',
    'Rapide Oued Zem','Chabab Rif','Youssoufia Berrechid','Maghreb Fès'
  ]},
  'Ligue 1 (Algeria)': { country: 'Algeria', flag: '🇩🇿', continent: 'africa', clubs: [
    'USM Alger','MC Alger','CR Belouizdad','JS Kabylie',
    'ES Sétif','MC Oran','NA Hussein Dey','USM Bel Abbès',
    'ASO Chlef','CS Constantine','RC Arbaâ','AS Aïn M\'lila',
    'Paradou AC','DRB Tadjenanet','RC Relizane','NC Magra'
  ]},
  'Ligue 1 (Tunisia)': { country: 'Tunisia', flag: '🇹🇳', continent: 'africa', clubs: [
    'Espérance ST','Club Africain','Étoile Sahel','CS Sfaxien',
    'CA Bizertin','US Monastir','AS Soliman','US Tataouine',
    'AS Kassérine','AS Gabès','US Ben Guerdane','Stade Tunisien',
    'AS Marsa','Olympique Béja','SC Ben Arous','CO Médenine'
  ]},
  'Saudi Pro League': { country: 'Saudi Arabia', flag: '🇸🇦', continent: 'asia', clubs: [
    'Al Ahli','Al Ettifaq','Al Fateh','Al Fayha','Al Hazem',
    'Al Hilal','Al Ittihad','Al Nassr','Al Okhdood','Al Qadsiah',
    'Al Raed','Al Riyadh','Al Shabab','Al Tai','Al Wehda',
    'Al Khaleej','Damac','Nassaji','Al Qadisiyah','Al Taawoun'
  ]},
  // ── AMERICAS ───────────────────────────────────────────────────
  'MLS': { country: 'USA', flag: '🇺🇸', continent: 'americas', clubs: [
    'Atlanta United','Austin FC','Charlotte FC','Chicago Fire','Colorado Rapids',
    'Columbus Crew','D.C. United','FC Cincinnati','FC Dallas','Houston Dynamo',
    'Inter Miami','LA Galaxy','LAFC','Minnesota United','Nashville SC',
    'New England Revolution','New York City FC','New York Red Bulls','Orlando City','Philadelphia Union',
    'Portland Timbers','Real Salt Lake','San Jose Earthquakes','Seattle Sounders','Sporting KC',
    'St. Louis City','Toronto FC','Vancouver Whitecaps','CF Montreal','New York Red Bulls II'
  ]},
  // ── WORLD ───────────────────────────────────────────────────────
  'FIFA World Cup': { country: 'International', flag: '🌍', continent: 'world', clubs: [
    'Argentina','Australia','Belgium','Brazil','Cameroon',
    'Canada','Croatia','Denmark','Ecuador','England',
    'France','Germany','Ghana','Iran','Japan',
    'Mexico','Morocco','Netherlands','Poland','Portugal',
    'Qatar','Saudi Arabia','Senegal','Serbia','South Korea',
    'Spain','Switzerland','Tunisia','USA','Uruguay',
    'Wales','Costa Rica'
  ]},
};

let votedTodayMap  = {}; // clubName -> true
let leagueVotedMap = {}; // leagueName -> clubName (the club they already voted for in this league)
let clubLogosMap   = {}; // clubName -> logoUrl (from DB match data)
// These are the 5 live leagues — all others get a "Coming Soon" treatment
const ACTIVE_VOTE_LEAGUES = new Set([
  'Premier League', 'La Liga', 'Serie A', 'Bundesliga', 'Ligue 1',
  'Egyptian Premier League', 'South African PSL', 'Botola Pro (Morocco)', 'Ligue 1 (Algeria)', 'Ligue 1 (Tunisia)',
  'FIFA World Cup'
]);

async function ensureClubLogosLoaded() {
  if (Object.keys(clubLogosMap).length > 0) return;
  try {
    const res = await fetch('/api/clubs/logos');
    if (res.ok) {
      clubLogosMap = await res.json();
    }
    // Merge static fallback logos — DB logos take priority, static fills the gaps
    Object.entries(STATIC_LOGO_MAP).forEach(([club, url]) => {
      if (!clubLogosMap[club]) clubLogosMap[club] = url;
    });
  } catch(e) {
    // Even on fetch error, use static logos so the page isn't blank
    clubLogosMap = { ...STATIC_LOGO_MAP };
  }
}

async function initVote() {
  // Load today's votes + club logos in parallel
  try {
    const [voteRes, _] = await Promise.all([
      fetch('/api/clubs/vote'),
      ensureClubLogosLoaded()
    ]);
    if (voteRes.ok) {
      const data = await voteRes.json();
      votedTodayMap  = {};
      leagueVotedMap = {};
      (data.votedToday || []).forEach(v => {
        votedTodayMap[v.clubName] = true;
        if (v.league) leagueVotedMap[v.league] = v.clubName;
      });
    }
  } catch(e) {
    // Even on fetch error, use static logos so the page isn't blank
    if (Object.keys(clubLogosMap).length === 0) {
      clubLogosMap = { ...STATIC_LOGO_MAP };
    }
  }
  
  selectVoteContinent('europe');
  loadClubLeaderboard('alltime');
}

let currentVoteContinent = 'europe';

function selectVoteContinent(id) {
  currentVoteContinent = id;
  const grid = document.getElementById('vote-continent-grid');
  if (grid) {
    grid.querySelectorAll('.continent-card').forEach(c => c.classList.remove('active-continent'));
  }
  const btn = document.getElementById(`vote-cont-${id}`);
  if (btn) btn.classList.add('active-continent');

  const titles = {
    'europe': 'European Clubs',
    'africa': 'African Clubs',
    'americas': 'Americas Clubs',
    'asia': 'Asian Clubs',
    'oceania': 'Oceania Clubs',
    'world': 'International Clubs'
  };
  const titleEl = document.getElementById('vote-leagues-title');
  if (titleEl) titleEl.textContent = titles[id] || 'Clubs';

  renderVoteLeagues();
}

// Colour-coded initials badge — used when no logo URL is available
function _clubInitialsBadge(club, size) {
  const s = size || 36;
  const colours = ['#e63946','#457b9d','#2a9d8f','#e9c46a','#f4a261','#6a4c93','#1982c4','#8ac926','#ff595e','#6a0572'];
  const hue = colours[club.charCodeAt(0) % colours.length];
  const initials = club.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase();
  return '<div style="width:' + s + 'px;height:' + s + 'px;border-radius:50%;background:' + hue + ';display:flex;align-items:center;justify-content:center;font-size:' + Math.round(s*0.36) + 'px;font-weight:900;color:#fff;flex-shrink:0;">' + initials + '</div>';
}

function renderVoteLeagues() {
  const container = document.getElementById('vote-leagues-container');
  if (!container) return;

  const leagues = Object.entries(CLUBS_DB).filter(([_, data]) => data.continent === currentVoteContinent);

  if (leagues.length === 0) {
    container.innerHTML = '<div style="text-align:center;color:var(--text-muted);padding:32px;background:var(--bg-card);border-radius:16px;border:1px solid rgba(255,255,255,0.06)">No clubs available for voting in this region yet.</div>';
    return;
  }

  container.innerHTML = leagues.map(([league, data]) => {
    const isActive = ACTIVE_VOTE_LEAGUES.has(league);
    const cardStyle = isActive
      ? 'background:var(--bg-card);border-radius:16px;padding:20px;margin-bottom:24px;border:1px solid rgba(255,255,255,0.06);box-shadow:0 8px 32px rgba(0,0,0,0.2);position:relative;'
      : 'background:var(--bg-card);border-radius:16px;padding:20px;margin-bottom:24px;border:1px solid rgba(255,255,255,0.04);box-shadow:0 4px 16px rgba(0,0,0,0.15);position:relative;opacity:0.45;filter:grayscale(0.6);pointer-events:none;user-select:none;';

    const comingSoonBadge = !isActive
      ? '<div style="position:absolute;top:14px;right:14px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.14);color:rgba(255,255,255,0.55);font-size:0.6rem;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;padding:3px 10px;border-radius:100px;">Coming Soon</div>'
      : '';

    const clubs = data.clubs.map(club => {
      const voted   = votedTodayMap[club];              // this club was voted
      const leagueWinner = leagueVotedMap[league];      // another club voted in same league
      const blocked = !voted && leagueWinner;           // can't vote — league slot taken

      const safe = club.replace(/"/g,'&quot;');
      const safeCo = data.country.replace(/"/g,'&quot;');
      const initials = club.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase();
      const colours = ['#e63946','#457b9d','#2a9d8f','#e9c46a','#f4a261','#6a0572','#1982c4','#8ac926','#ff595e','#6a0572'];
      const badgeBg = colours[club.charCodeAt(0) % colours.length];
      const logoUrl = clubLogosMap[club] || '';
      const logoInner = logoUrl
        ? '<img src="' + logoUrl + '" alt="' + safe + '" style="width:64px;height:64px;object-fit:contain;border-radius:50%;" onerror="this.style.display=\'none\';this.nextSibling.style.display=\'flex\'"><span style="display:none;width:64px;height:64px;border-radius:50%;background:' + badgeBg + ';align-items:center;justify-content:center;font-size:22px;font-weight:900;color:#fff">' + initials + '</span>'
        : '<span style="width:64px;height:64px;border-radius:50%;background:' + badgeBg + ';display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:900;color:#fff">' + initials + '</span>';

      // Voted: green highlight. Blocked: dimmed + lock icon. Normal: default.
      let btnStyle = 'display:flex;flex-direction:column;align-items:center;gap:8px;padding:14px 10px;border-radius:14px;font-size:0.78rem;font-weight:700;cursor:pointer;transition:all 0.2s;text-align:center;';
      let clickHandler = 'castVote(this)';
      if (voted) {
        btnStyle += 'background:rgba(60,184,46,0.12);border:1.5px solid rgba(60,184,46,0.5);color:var(--green);';
      } else if (blocked) {
        btnStyle += 'background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.05);color:rgba(255,255,255,0.25);opacity:0.4;cursor:not-allowed;pointer-events:none;filter:grayscale(0.8);';
        clickHandler = 'void(0)';
      } else {
        btnStyle += 'background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);color:rgba(255,255,255,0.75);';
      }

      const lockOverlay = blocked
        ? '<div style="position:absolute;top:0;right:0;width:18px;height:18px;background:rgba(0,0,0,0.7);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px">🔒</div>'
        : '';

      return '<button onclick="' + clickHandler + '" data-club="' + safe + '" data-country="' + safeCo + '" data-continent="' + data.continent + '" data-league="' + league.replace(/"/g,'&quot;') + '"' +
        ' style="' + btnStyle + '">' +
        '<div style="width:64px;height:64px;position:relative;">' +
          logoInner +
          lockOverlay +
          (voted ? '<div style="position:absolute;bottom:-2px;right:-2px;width:18px;height:18px;background:#29bf12;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px;color:#fff;border:2px solid var(--bg-card)">✓</div>' : '') +
        '</div>' +
        '<span style="line-height:1.2;word-break:break-word">' + club + '</span>' +
        (voted ? '<span style="font-size:0.65rem;font-weight:700;color:var(--green)">✓ Voted</span>' :
         blocked ? '<span style="opacity:0.4;font-size:0.6rem">' + leagueWinner + '\u2019s league</span>' :
         '<span style="opacity:0.45;font-size:0.65rem;font-weight:600">+50 XP</span>') +
      '</button>';
    }).join('');

    return '<div style="' + cardStyle + '">' +
      comingSoonBadge +
      '<div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;padding-bottom:12px;border-bottom:1px solid rgba(255,255,255,0.06)">' +
        '<div style="width:36px;height:36px;border-radius:10px;background:rgba(255,255,255,0.05);display:flex;align-items:center;justify-content:center;font-size:22px">' + (data.flag || '🌍') + '</div>' +
        '<div>' +
          '<div style="font-weight:800;color:#fff;font-size:1rem;letter-spacing:0.5px">' + data.country + '</div>' +
          '<div style="font-size:0.75rem;color:var(--text-muted);font-weight:600;text-transform:uppercase;letter-spacing:1px">' + league + '</div>' +
        '</div>' +
      '</div>' +
      '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:10px">' +
        clubs +
      '</div>' +
    '</div>';
  }).join('');
}

async function castVote(el) {
  const clubName  = el.getAttribute ? el.getAttribute('data-club')      : el;
  const country   = el.getAttribute ? el.getAttribute('data-country')   : arguments[1];
  const continent = el.getAttribute ? el.getAttribute('data-continent') : (arguments[2] || 'world');
  const league    = el.getAttribute ? el.getAttribute('data-league')    : (arguments[3] || '');
  try {
    const res = await fetch('/api/clubs/vote', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ clubName, league, country, continent }),
    });
    const data = await res.json();
    if (res.ok) {
      votedTodayMap[clubName] = true;
      if (league) leagueVotedMap[league] = clubName;
      showNotification('+50 XP! Voted for ' + clubName, 'success');
      renderVoteLeagues();
      loadClubLeaderboard(state.voteLeaderboardPeriod || 'alltime');
    } else if (data.error === 'already_voted_league') {
      showNotification('You already voted for ' + data.votedFor + ' in the ' + league + ' today!', 'warning');
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

  // Update global lang tracker
  window._currentLang = lang;

  // Apply translations (i18n.js)
  if (typeof applyTranslations === 'function') {
    applyTranslations(lang);
  }

  // Update the URL to reflect the language change without a page reload
  const currentPage = state.currentPage || 'home';
  const newUrl = _buildUrl(lang, currentPage);
  window.history.pushState({ page: currentPage, lang }, '', newUrl);
}
