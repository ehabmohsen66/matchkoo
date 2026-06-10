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
  fixtureLeagueFilter: 'all',
  lbScope: 'global',
  lbPeriod: 'alltime',
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
  if (page === 'league-detail') initLeagueDetail();
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

  const titleEl = document.getElementById('home-top-clubs-title');
  if (titleEl) {
    const now = new Date();
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    titleEl.innerHTML = `❤️ Top Clubs This Month - ${monthNames[now.getMonth()]} ${now.getFullYear()}`;
  }

  try {
    // Fetch leaderboard + vote state in parallel, and ensure logos are loaded
    const [lbClubs, voteState] = await Promise.all([
      fetch('/api/clubs/leaderboard?period=monthly').then(r => r.ok ? r.json() : []),
      fetch('/api/clubs/vote-state').then(r => r.ok ? r.json() : {}).catch(() => {}),
      ensureClubLogosLoaded()
    ]);

    const voted = voteState?.votedClub || '';
    const topClubs = lbClubs.slice(0, 10);

    if (!topClubs.length) {
      clubEl.innerHTML = '<div style="text-align:center;color:var(--text-muted);font-size:0.85rem;padding:20px">No votes this month yet — be the first! <button onclick="navigate(\'vote\')" style="background:none;border:none;color:var(--green);cursor:pointer;font-weight:700;font-family:inherit">Vote Now →</button></div>';
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
        btnLabel = '❤️ Vote +20 XP';
      }

      const clickAttr = (!isVoted && !isBlocked)
        ? `onclick="_homeVote(this)" data-club="${c.clubName.replace(/"/g,'&quot;')}" data-country="" data-continent="${(c.continent || '').replace(/"/g,'&quot;')}" data-league=""`
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

function _homeVote(el) {
  if (!el) return;
  const continent = el.dataset.continent || 'europe';
  state.targetVoteContinent = continent.toLowerCase();
  navigate('vote');
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
            '<div class="team-badge" style="background:#3a1a2a;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:12px">' +
              (m.awayLogo ? '<img src="'+m.awayLogo+'" width="40" height="40" style="border-radius:50%">' : m.awayTeam.substring(0,3).toUpperCase()) +
            '</div>' +
            '<span class="team-name">' + m.awayTeam + '</span>' +
            '<span class="team-score">' + (m.awayScore ?? 0) + '</span>' +
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
      container.innerHTML = '<div style="color:var(--text-muted);font-size:0.85rem;text-align:center;">No live matches for ' + label + ' right now.</div>';
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
        const home = _resolveTeam(m.homeTeam, m.homeLogo);
        const away = _resolveTeam(m.awayTeam, m.awayLogo);
        const hLogo = home.logo ? '<img src="'+home.logo+'" width="36" height="36" style="border-radius:50%;flex-shrink:0;border:1.5px solid rgba(255,255,255,0.1)">' : '<div style="width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,0.06);flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;color:rgba(255,255,255,0.4)">'+home.name.substring(0,3).toUpperCase()+'</div>';
        const aLogo = away.logo ? '<img src="'+away.logo+'" width="36" height="36" style="border-radius:50%;flex-shrink:0;border:1.5px solid rgba(255,255,255,0.1)">' : '<div style="width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,0.06);flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;color:rgba(255,255,255,0.4)">'+away.name.substring(0,3).toUpperCase()+'</div>';
        html +=
          '<div class="fixture-row" data-match-id="' + matchId + '" onclick="openRealMatchDetail(\'' + matchId + '\')" role="button" tabindex="0">' +
            '<div style="display:flex;align-items:center;gap:4px;flex-shrink:0;margin-right:10px">' + hLogo + aLogo + '</div>' +
            '<div class="fixture-teams" style="display:flex;align-items:center;gap:10px;flex:1;min-width:0">' +
              '<div style="min-width:0">' +
                '<div class="fixture-league-name" style="color:var(--red)">' + min + '</div>' +
                '<div class="fixture-team-names">' + home.name + ' vs ' + away.name + '</div>' +
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
        const home = _resolveTeam(m.homeTeam, m.homeLogo);
        const away = _resolveTeam(m.awayTeam, m.awayLogo);

        const hLogo = home.logo
          ? '<img src="' + home.logo + '" width="36" height="36" style="border-radius:50%;flex-shrink:0;border:1.5px solid rgba(255,255,255,0.1)">'
          : '<div style="width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,0.06);flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;color:rgba(255,255,255,0.4)">' + home.name.substring(0,3).toUpperCase() + '</div>';
        const aLogo = away.logo
          ? '<img src="' + away.logo + '" width="36" height="36" style="border-radius:50%;flex-shrink:0;border:1.5px solid rgba(255,255,255,0.1)">'
          : '<div style="width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,0.06);flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;color:rgba(255,255,255,0.4)">' + away.name.substring(0,3).toUpperCase() + '</div>';
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
                '<div class="fixture-team-names">' + home.name + ' vs ' + away.name + '</div>' +
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
  // comingSoon = locked placeholder, never active
  if (l.comingSoon === true) return false;
  // DB leagues (have _realId) are always active — they were validated by LEAGUE_META in backend_api
  if (l._realId) return true;
  // Static-only leagues with a COMPLETED status should render as active (clickable completed card)
  if (l.status && l.status.toUpperCase() === 'COMPLETED') return true;
  // All other static entries without comingSoon are active
  return true;
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

  const sortedLeagues = [...data.leagues].sort((a, b) => {
    const aActive = _isLeagueActive(a);
    const bActive = _isLeagueActive(b);
    if (aActive && !bActive) return -1;
    if (!aActive && bActive) return 1;
    return 0;
  });

  grid.innerHTML = sortedLeagues.map(l => {
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
    const canonicalName = l.canonicalName || l.name;
    const isFollowed = Backend.preferredLeagues.some(p =>
      p.toLowerCase() === canonicalName.toLowerCase() ||
      canonicalName.toLowerCase().includes(p.toLowerCase())
    );

    // Real DB tournament ID — null for static placeholder leagues
    const realTournamentId = l._realId || null;
    const safeTournamentId = realTournamentId ? String(realTournamentId).replace(/'/g, "\\'") : '';
    const isCompleted = !!(l.status && l.status.toUpperCase() === 'COMPLETED');

    const followBtn = isCompleted
      ? ""
      : "<button " +
        "  id=\"follow-btn-" + safeId + "\" " +
        "  onclick=\"event.stopPropagation();toggleFollow('" + safeId + "','" + safeName + "','" + canonicalName.replace(/'/g,"\\'") + "','" + safeTournamentId + "')\" " +
        "  style=\"" +
          "flex-shrink:0;margin-left:auto;padding:4px 12px;border-radius:100px;" +
          "border:1px solid " + (isFollowed ? "rgba(111,232,64,0.5)" : "rgba(111,232,64,0.4)") + ";" +
          "background:" + (isFollowed ? "rgba(111,232,64,0.15)" : "rgba(111,232,64,0.1)") + ";" +
          "color:" + (isFollowed ? "#6FE840" : "#6FE840") + ";" +
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
          (isCompleted ? " &nbsp;<span style=\"font-size:0.6rem;font-weight:800;padding:2px 8px;border-radius:100px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.15);color:rgba(255,255,255,0.5);letter-spacing:0.5px;text-transform:uppercase\">✓ Season Ended</span>" : "") +
          (!isCompleted && isInviteOnly ? " &nbsp;<span style=\"font-size:0.6rem;font-weight:800;padding:2px 6px;border-radius:100px;background:rgba(255,153,20,0.15);color:#ff9914\">🔒 Invite Only</span>" : "") +
          (!isCompleted && l.prizes ? " &nbsp;<span style=\"font-size:0.6rem;font-weight:800;padding:2px 6px;border-radius:100px;background:rgba(255,153,20,0.08);color:rgba(255,153,20,0.8)\">🏆 Prizes</span>" : "") +
        "</div>" +
      "</div>" +
      followBtn +
    "</div>";
  }).join("");
}

// ── Join / Leave a league from the Discover page ─────────────────────────
// tournamentId = real DB cuid, or empty string for static placeholder leagues
async function toggleFollow(leagueId, leagueName, canonicalName, tournamentId) {
  const btn = document.getElementById('follow-btn-' + leagueId);
  if (!btn) return;

  const currentlyFollowed = btn.textContent.trim().startsWith('✓');
  const action = currentlyFollowed ? 'unfollow' : 'follow';

  // Optimistic UI: disable + show spinner
  btn.disabled = true;
  btn.textContent = '…';

  // Pass real tournament ID so backend can also update Registration table
  const ok = await Backend.toggleLeagueFollow(canonicalName, action, tournamentId || null);

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
// ── Team name & logo overrides for live API data ────────────────────────────
// Use this map when the API returns a different name/logo than what we display.
const TEAM_DISPLAY_MAP = {
  // Egyptian Premier League — API name → display name + logo
  'Future FC':        { name: 'Modern Sport FC',    logo: '/images/clubs/modern_sport_fc.png' },
  'Kahraba Ismailia': { logo: '/images/clubs/kahraba_ismailia.png' },
  'Masr':             { name: 'ZED FC',             logo: '/images/clubs/zed_fc.png' },
  'El Gouna FC':      { name: 'El Gouna FC'         /* keep API logo */ },
  'Ismaily SC':       { name: 'Ismaily',            logo: '/images/clubs/ismaily.png' },
  'Al Ittihad':       { name: 'Ittihad Alexandria', logo: '/images/clubs/ittihad_alexandria.png' },
  'Pharco FC':        { name: 'Pharco'              /* keep API logo */ },

  // South African PSL
  'Kaizer Chiefs':     { logo: '/images/clubs/kaizer_chiefs.png' },
  'Orlando Pirates':   { logo: '/images/clubs/orlando_pirates.png' },
  'Cape Town City':    { logo: '/images/clubs/cape_town_city.png' },
  'Amazulu':           { name: 'AmaZulu', logo: '/images/clubs/amazulu.png' },
  'Golden Arrows':     { logo: '/images/clubs/golden_arrows.png' },
  'Stellenbosch':      { name: 'Stellenbosch FC', logo: '/images/clubs/stellenbosch.png' },
  'Stellenbosch FC':   { logo: '/images/clubs/stellenbosch.png' },
  'Durban City FC':    { logo: '/images/clubs/durban_city.png' },

  // English Clubs
  'Middlesbrough':     { logo: '/images/clubs/middlesbrough.png' },
  'Derby County':      { logo: '/images/clubs/derby_county.png' },
  'Swansea City':      { logo: '/images/clubs/swansea_city.png' },
  'Stoke City':        { logo: '/images/clubs/stoke_city.png' },

  // Spain La Liga
  'Atletico Madrid':   { logo: '/images/clubs/atletico_madrid.png' },
  'Atletico':          { logo: '/images/clubs/atletico_madrid.png' },
  'Girona':            { logo: '/images/clubs/girona.png' },

  // Germany
  'Hamburger SV':      { logo: '/images/clubs/hamburger_sv.png' },
  'Hamburg':           { logo: '/images/clubs/hamburger_sv.png' },
  'Heidenheim':        { logo: '/images/clubs/heidenheim.png' },
  '1. FC Heidenheim':  { logo: '/images/clubs/heidenheim.png' },
  'Holstein Kiel':     { logo: '/images/clubs/holstein_kiel.png' },
  'Karlsruher SC':     { logo: '/images/clubs/karlsruher_sc.png' },
  'Karlsruhe':         { logo: '/images/clubs/karlsruher_sc.png' },
  'Darmstadt 98':      { logo: '/images/clubs/darmstadt_98.png' },
  'Kaiserslautern':    { logo: '/images/clubs/kaiserslautern.png' },
  'Arminia Bielefeld': { logo: '/images/clubs/arminia_bielefeld.png' },
  'Paderborn':         { logo: '/images/clubs/paderborn.png' },
  'SC Paderborn 07':   { logo: '/images/clubs/paderborn.png' },
  'Fortuna Düsseldorf':{ logo: '/images/clubs/fortuna_dusseldorf.png' },
  'Schalke 04':        { logo: '/images/clubs/schalke_04.png' },
  'Hannover 96':       { logo: '/images/clubs/hannover_96.png' },

  // Italy
  'Genoa':             { logo: '/images/clubs/genoa.png' },
  'Parma':             { logo: '/images/clubs/parma.png' },
  'Palermo':           { logo: '/images/clubs/palermo.png' },
  'Como':              { logo: '/images/clubs/como.png' },

  // France
  'Le Havre':          { logo: '/images/clubs/le_havre.png' },
  'Auxerre':           { logo: '/images/clubs/auxerre.png' },
  'Brest':             { logo: '/images/clubs/brest.png' },
  'Lorient':           { logo: '/images/clubs/lorient.png' },
  'Metz':              { logo: '/images/clubs/metz.png' },
  'Saint-Etienne':     { logo: '/images/clubs/saint_etienne.png' },

  // Morocco Botola Pro
  'Wydad Casablanca':    { name: 'Wydad AC' },
  'Raja Casablanca':     { name: 'Raja CA' },
  'AS FAR Rabat':        { name: 'AS FAR' },
  'Renaissance Berkane': { name: 'RS Berkane', logo: '/images/clubs/rs_berkane.png' },
  'RS Berkane':           { logo: '/images/clubs/rs_berkane.png' },
  'Difaa El Jadidi':      { logo: '/images/clubs/difaa_el_jadidi.png' },
  'Hassania Agadir':      { logo: '/images/clubs/hassania_agadir.png' },
  'Moghreb Tétouan':      { logo: '/images/clubs/moghreb_tetouan.png' },
  'Olympique Khouribga':  { logo: '/images/clubs/olympique_khouribga.png' },
  'FUS Rabat':            { logo: '/images/clubs/fus_rabat.png' },
  'Ittihad Tanger':       { logo: '/images/clubs/ittihad_tanger.png' },
  'MAS Fès':              { logo: '/images/clubs/mas_fes.png' },
  'Raja CA':              { logo: '/images/clubs/raja_ca.png' },
  'Youssoufia Berrechid': { logo: '/images/clubs/youssoufia_berrechid.png' },
  'AS FAR':               { logo: '/images/clubs/as_far.png' },
  'AS FAR Rabat':         { logo: '/images/clubs/as_far.png' },

  // Algeria
  'USM Alger':            { logo: '/images/clubs/usm_alger.png' },
  'MC Alger':             { logo: '/images/clubs/mc_alger.png' },
  'ES Sétif':            { logo: '/images/clubs/es_setif.png' },
  'JS Kabylie':           { logo: '/images/clubs/js_kabylie.png' },
  'CR Belouizdad':        { logo: '/images/clubs/cr_belouizdad.png' },
  'MC Oran':              { logo: '/images/clubs/mc_oran.png' },
  'NA Hussein Dey':       { logo: '/images/clubs/na_hussein_dey.png' },
  'USM Bel Abbès':        { logo: '/images/clubs/usm_bel_abbes.png' },
  "AS Aïn M'lila":       { logo: '/images/clubs/as_ain_mlila.png' },
  'Paradou AC':           { logo: '/images/clubs/paradou_ac.png' },
  'DRB Tadjenanet':       { logo: '/images/clubs/drb_tadjenanet.png' },
  'Moghreb Tetouan':     { name: 'Moghreb Tétouan' },

  // Algeria Ligue 1
  'ES Setif':          { name: 'ES Sétif' },
  "Mouloudia d'Alger": { name: 'MC Alger' },

  // Tunisia Ligue 1
  'Esperance Tunis':   { name: 'Espérance ST', logo: '/images/clubs/esperance_st.png' },
  'Espérance ST':     { logo: '/images/clubs/esperance_st.png' },

  // Tunisia
  'Club Africain':      { logo: '/images/clubs/club_africain.png' },
  'Étoile Sahel':       { logo: '/images/clubs/etoile_sahel.png' },
  'CS Sfaxien':         { logo: '/images/clubs/cs_sfaxien.png' },
  'CA Bizertin':        { logo: '/images/clubs/ca_bizertin.png' },

  'US Monastir':        { logo: '/images/clubs/us_monastir.png' },
  'AS Soliman':         { logo: '/images/clubs/as_soliman.png' },
  'US Tataouine':       { logo: '/images/clubs/us_tataouine.png' },
  'Stade Tunisien':     { logo: '/images/clubs/stade_tunisien.png' },
  'AS Gabès':          { logo: '/images/clubs/as_gabes.png' },
  'Etoile Sahel':      { name: 'Étoile Sahel' },
  'US Monastirienne':  { name: 'US Monastir' },

  // Saudi Arabia
  'Al Nassr':           { logo: '/images/clubs/al_nassr.png' },
  'Al Nassr FC':        { name: 'Al Nassr', logo: '/images/clubs/al_nassr.png' },
  'Al Ittihad':         { logo: '/images/clubs/al_ittihad.png' },
  'Al-Ittihad':         { name: 'Al Ittihad', logo: '/images/clubs/al_ittihad.png' },
  'Al Ittihad Jeddah':  { name: 'Al Ittihad', logo: '/images/clubs/al_ittihad.png' },
  'Al Ahli':            { logo: '/images/clubs/al_ahli.png' },
  'Al-Ahli':            { name: 'Al Ahli', logo: '/images/clubs/al_ahli.png' },
  'Al Ahli Jeddah':     { name: 'Al Ahli', logo: '/images/clubs/al_ahli.png' },
  'Al Ettifaq':         { logo: '/images/clubs/al_ettifaq.png' },
  'Al-Ettifaq':         { name: 'Al Ettifaq', logo: '/images/clubs/al_ettifaq.png' },
  'Al Fateh':           { logo: '/images/clubs/al_fateh.png' },
  'Al-Fateh':           { name: 'Al Fateh', logo: '/images/clubs/al_fateh.png' },
  'Al Qadsiah':         { logo: '/images/clubs/al_qadsiah.png' },
  'Al-Qadsiah':         { name: 'Al Qadsiah', logo: '/images/clubs/al_qadsiah.png' },
  'Al Qadisiya':        { name: 'Al Qadsiah', logo: '/images/clubs/al_qadsiah.png' },
  'Al Qadsiah FC':      { name: 'Al Qadsiah', logo: '/images/clubs/al_qadsiah.png' },
  'Al Taawoun':         { logo: '/images/clubs/al_taawoun.png' },
  'Al-Taawoun':         { name: 'Al Taawoun', logo: '/images/clubs/al_taawoun.png' },
  'Al Taawon':          { name: 'Al Taawoun', logo: '/images/clubs/al_taawoun.png' },
  'Al Khaleej':         { logo: '/images/clubs/al_khaleej.png' },
  'Al-Khaleej':         { name: 'Al Khaleej', logo: '/images/clubs/al_khaleej.png' },
  'Damac':              { logo: '/images/clubs/damac.png' },
  'Damac FC':           { name: 'Damac', logo: '/images/clubs/damac.png' },
  'Al Wehda':           { logo: '/images/clubs/al_wehda.png' },
  'Al-Wehda':           { name: 'Al Wehda', logo: '/images/clubs/al_wehda.png' },
  'Al Wehda Mecca':     { name: 'Al Wehda', logo: '/images/clubs/al_wehda.png' },
  'Al Fayha':           { logo: '/images/clubs/al_fayha.png' },
  'Al-Fayha':           { name: 'Al Fayha', logo: '/images/clubs/al_fayha.png' },
  'Al Fayha FC':        { name: 'Al Fayha', logo: '/images/clubs/al_fayha.png' },
  'Al Hazem':           { logo: '/images/clubs/al_hazem.png' },
  'Al-Hazem':           { name: 'Al Hazem', logo: '/images/clubs/al_hazem.png' },
  'Al Hazem FC':        { name: 'Al Hazem', logo: '/images/clubs/al_hazem.png' },
  'Al Tai':             { logo: '/images/clubs/al_tai.png' },
  'Al-Tai':             { name: 'Al Tai', logo: '/images/clubs/al_tai.png' },
  'Al Tai FC':          { name: 'Al Tai', logo: '/images/clubs/al_tai.png' },

  // UAE
  'Al Ain':             { logo: '/images/clubs/al_ain.png' },
  'Al Ain FC':          { name: 'Al Ain', logo: '/images/clubs/al_ain.png' },
  'Al-Ain':             { name: 'Al Ain', logo: '/images/clubs/al_ain.png' },
  'Al Wasl':            { logo: '/images/clubs/al_wasl.png' },
  'Al Wasl FC':         { name: 'Al Wasl', logo: '/images/clubs/al_wasl.png' },
  'Al-Wasl':            { name: 'Al Wasl', logo: '/images/clubs/al_wasl.png' },
  'Al Jazira':          { logo: '/images/clubs/al_jazira.png' },
  'Al Jazira FC':       { name: 'Al Jazira', logo: '/images/clubs/al_jazira.png' },
  'Al-Jazira':          { name: 'Al Jazira', logo: '/images/clubs/al_jazira.png' },
  'Al Wahda':           { logo: '/images/clubs/al_wahda.png' },
  'Al Wahda FC':        { name: 'Al Wahda', logo: '/images/clubs/al_wahda.png' },
  'Al-Wahda':           { name: 'Al Wahda', logo: '/images/clubs/al_wahda.png' },
  'Shabab Al Ahli':     { logo: '/images/clubs/shabab_al_ahli.png' },
  'Shabab Al Ahli Dubai': { name: 'Shabab Al Ahli', logo: '/images/clubs/shabab_al_ahli.png' },
  'Shabab Al-Ahli':     { name: 'Shabab Al Ahli', logo: '/images/clubs/shabab_al_ahli.png' },
  'Baniyas':            { logo: '/images/clubs/baniyas.png' },
  'Baniyas Club':       { name: 'Baniyas', logo: '/images/clubs/baniyas.png' },
  'Al Dhafra':          { logo: '/images/clubs/al_dhafra.png' },
  'Al-Dhafra':          { name: 'Al Dhafra', logo: '/images/clubs/al_dhafra.png' },
  'Ajman':              { logo: '/images/clubs/ajman.png' },
  'Ajman Club':         { name: 'Ajman', logo: '/images/clubs/ajman.png' },
  'Emirates Club':      { logo: '/images/clubs/emirates_club.png' },
  'Emirates':           { name: 'Emirates Club', logo: '/images/clubs/emirates_club.png' },
  'Al Nasr':            { logo: '/images/clubs/al_nasr.png' },
  'Al-Nasr':            { name: 'Al Nasr', logo: '/images/clubs/al_nasr.png' },
  'Al Nasr SC':         { name: 'Al Nasr', logo: '/images/clubs/al_nasr.png' },

  // Brazil
  'Fluminense':         { logo: '/images/clubs/fluminense.png' },
  'Grêmio':             { logo: '/images/clubs/gremio.png' },
  'Gremio':             { name: 'Grêmio', logo: '/images/clubs/gremio.png' },
  'Santos':             { logo: '/images/clubs/santos.png' },
  'Botafogo':           { logo: '/images/clubs/botafogo.png' },
  'Cruzeiro':           { logo: '/images/clubs/cruzeiro.png' },

  // Argentina
  'Racing Club':        { logo: 'https://media.api-sports.io/football/teams/436.png' },
  'Huracán':            { logo: 'https://media.api-sports.io/football/teams/445.png' },
  'Huracan':            { name: 'Huracán', logo: 'https://media.api-sports.io/football/teams/445.png' },
  'River Plate':        { logo: 'https://media.api-sports.io/football/teams/435.png' },
  'Boca Juniors':       { logo: '/images/clubs/boca_juniors.png' },
  'Independiente':      { logo: '/images/clubs/independiente.png' },
  'San Lorenzo':        { logo: '/images/clubs/san_lorenzo.png' },
  'Estudiantes':        { logo: '/images/clubs/estudiantes.png' },
  'Lanus':              { logo: '/images/clubs/lanus.png' },


  // Spain
  'Zaragoza':           { logo: '/images/clubs/zaragoza.png' },
  'Real Zaragoza':      { name: 'Zaragoza', logo: '/images/clubs/zaragoza.png' },
  'Deportivo La Coruña': { logo: '/images/clubs/deportivo_la_coruna.png' },
  'Málaga':             { logo: '/images/clubs/malaga.png' },
  'Malaga':             { name: 'Málaga', logo: '/images/clubs/malaga.png' },

  // MLS
  'Atlanta United':     { name: 'Atlanta United FC' },
  'Inter Miami':        { name: 'Inter Miami CF', logo: '/images/clubs/inter_miami.png' },
  'Inter Miami CF':     { logo: '/images/clubs/inter_miami.png' },
  'LAFC':               { name: 'Los Angeles FC (LAFC)' },
  'Seattle Sounders':   { name: 'Seattle Sounders FC' },
};

function _resolveTeam(name, logo) {
  const override = TEAM_DISPLAY_MAP[name];
  if (!override) return { name, logo };
  return {
    name: override.name || name,
    logo: override.logo || logo,
  };
}

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
        const hasPred = !!m.userPrediction;
        const isCompleted = m.status === 'COMPLETED';
        const isLive = m.status === 'LIVE';
        const scoreOrTime = isCompleted
          ? (m.homeScore + '\u2013' + m.awayScore)
          : isLive ? '\uD83D\uDD34 LIVE' : t.toLocaleDateString('en-GB', {day:'2-digit', month:'2-digit', year:'numeric'}) + ' ' + t.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
        const cleanLeagueName = (leagueName || '').replace(/\s*\[\d+\]$/, '');
        const home = _resolveTeam(m.homeTeam, m.homeLogo);
        const away = _resolveTeam(m.awayTeam, m.awayLogo);
        const hLogo = home.logo
          ? '<img src="' + home.logo + '" width="36" height="36" style="border-radius:50%;flex-shrink:0;border:1.5px solid rgba(255,255,255,0.1)">'
          : '<div style="width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,0.06);flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;color:rgba(255,255,255,0.4)">' + home.name.substring(0,3).toUpperCase() + '</div>';
        const aLogo = away.logo
          ? '<img src="' + away.logo + '" width="36" height="36" style="border-radius:50%;flex-shrink:0;border:1.5px solid rgba(255,255,255,0.1)">'
          : '<div style="width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,0.06);flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;color:rgba(255,255,255,0.4)">' + away.name.substring(0,3).toUpperCase() + '</div>';
        return '<div class="fixture-row" onclick="openRealMatchDetail(\'' + m.id + '\')" role="button" tabindex="0">' +
          '<div style="display:flex;align-items:center;gap:4px;flex-shrink:0;margin-right:10px">' + hLogo + aLogo + '</div>' +
          '<div class="fixture-teams" style="display:flex;align-items:center;gap:10px;flex:1;min-width:0">' +
            '<div style="min-width:0">' +
              '<div class="fixture-league-name">' + cleanLeagueName + '</div>' +
              '<div class="fixture-team-names">' + home.name + ' vs ' + away.name + '</div>' +
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
  if (p.firstGoalScorer) baseXp += correctFGS ? 150 : 0;
  let xp = Math.round(baseXp * multiplier);
  if (!correctResult) xp -= Math.round(50  * (conf / 100));
  if (p.firstGoalScorer && !correctFGS) xp -= Math.round(150 * (conf / 100));
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
          ? `<div style="${rowStyle}"><span style="${labelStyle}">⚽ First goalscorer bonus</span>${tick('+150 XP')}</div>` 
          : `<div style="${rowStyle}"><span style="${labelStyle}">⚽ Wrong goalscorer (penalty)</span>${cross('−'+Math.round(150*(conf/100))+' XP')}</div>`)
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
          '<div class="pred-item-match" style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">' + (() => { const ph = _resolveTeam(p.homeTeam, p.homeLogo); const pa = _resolveTeam(p.awayTeam, p.awayLogo); return (ph.logo ? '<img src="' + ph.logo + '" style="width:20px;height:20px;object-fit:contain">' : '') + '<span>' + ph.name + ' vs ' + pa.name + '</span>' + (pa.logo ? '<img src="' + pa.logo + '" style="width:20px;height:20px;object-fit:contain">' : ''); })() +
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
      const nameEl  = card.querySelector('.podium-name');
      const flagEl  = card.querySelector('.podium-flag');
      const xpEl    = card.querySelector('.podium-xp');
      const imgEl   = card.querySelector('img');
      const rnkEl   = card.querySelector('.rank-num');
      const badgeEl = card.querySelector('.level-badge');
      const rank    = i === 0 ? 2 : i === 1 ? 1 : 3;
      const lvl     = _xpToLevel(u.xp || 0);
      if (nameEl)  nameEl.textContent  = u.name || 'Player';
      if (flagEl)  flagEl.textContent  = _getFlagEmoji(u.country);
      if (xpEl)    xpEl.textContent    = (u.xp || 0).toLocaleString() + ' XP';
      if (imgEl)   imgEl.src = u.image || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + encodeURIComponent(u.name || 'user');
      if (rnkEl)   rnkEl.textContent   = '#' + rank;
      if (badgeEl) {
        badgeEl.textContent = lvl.badge;
        badgeEl.className   = 'level-badge ' + lvl.cls;
      }
    });


    // ── Update Your Rank Banner ──
    const me = data.find(u => u.isMe);
    if (me) {
      const yrb = document.querySelector('.your-rank-banner');
      if (yrb) {
        const rankEl  = yrb.querySelector('.yrb-rank');
        const nameEl  = yrb.querySelector('.yrb-name');
        const xpEl    = yrb.querySelector('.yrb-xp');
        const imgEl   = yrb.querySelector('img');
        const badgeEl = yrb.querySelector('.level-badge-sm');

        if (rankEl) rankEl.textContent = '#' + me.rank;
        if (nameEl) nameEl.textContent = (me.name || 'You') + ' (You)';
        if (xpEl)   xpEl.textContent   = (me.xp || 0).toLocaleString() + ' XP';
        if (imgEl)  imgEl.src = me.image || 'https://api.dicebear.com/7.x/avataaars/svg?seed=me';
        
        if (badgeEl) {
          const lvl = _xpToLevel(me.xp || 0);
          badgeEl.textContent = lvl.badge;
          badgeEl.className   = 'level-badge-sm ' + lvl.cls;
        }

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

    // ── My Mini Leagues — INVITE_ONLY tournaments the user has joined ──
    const rawMiniLeagues = tournamentsRes.filter(t => t.registrationMode === 'INVITE_ONLY' && t.userRegistered === true);
    
    // Sort mini leagues by the status of their underlying official competition
    const getCompStatus = (comp) => {
      const off = officialTournaments.find(t => t.competition === comp);
      return off ? off.status : 'UPCOMING';
    };
    // Match the backend sorting: UPCOMING (0) -> ONGOING (1) -> COMPLETED (2)
    const statusWeight = { 'UPCOMING': 0, 'ONGOING': 1, 'COMPLETED': 2 };
    
    const myMiniLeagues = rawMiniLeagues.sort((a, b) => {
      const wA = statusWeight[getCompStatus(a.competition)] ?? 3;
      const wB = statusWeight[getCompStatus(b.competition)] ?? 3;
      if (wA !== wB) return wA - wB;
      // If same status, sort newer created mini-leagues first
      return new Date(b.createdAt || b.startDate) - new Date(a.createdAt || a.startDate);
    });

    const allTournamentsToFetch = [...officialTournaments, ...myMiniLeagues];

    if (!allTournamentsToFetch.length) {
      if (listEl) listEl.innerHTML = '<div style="text-align:center;color:var(--text-muted);padding:32px">No active leagues yet.</div>';
      if (miniListEl) miniListEl.innerHTML = '<div style="text-align:center;color:var(--text-muted);padding:24px">No mini leagues joined yet</div>';
      return;
    }

    if (listEl) listEl.innerHTML = '<div style="text-align:center;color:var(--text-muted);padding:16px;font-size:0.8rem;">Loading rankings...</div>';

    // Fetch leaderboard for each tournament in parallel
    const rankResults = await Promise.all(
      allTournamentsToFetch.map(t =>
        fetch('/api/leaderboard?tournamentId=' + t.id)
          .then(r => r.ok ? r.json() : [])
          .then(rows => ({ tournament: t, rows }))
      )
    );

    const officialRankResults = rankResults.filter(r => r.tournament.registrationMode !== 'INVITE_ONLY');
    const miniRankResults = rankResults.filter(r => r.tournament.registrationMode === 'INVITE_ONLY');

    // Find my entry in official leagues
    const myEntries = officialRankResults
      .map(({ tournament: t, rows }) => {
        const me = rows.find(r => r.isMe);
        if (!me) return null;
        const comp = _compFromTournament(t);
        return { t, me, comp, total: rows.length, allRows: rows };
      })
      .filter(Boolean);

    if (listEl) {
      if (!myEntries.length) {
        listEl.innerHTML = '<div style="text-align:center;color:var(--text-muted);padding:32px;font-size:0.85rem;">Make predictions on league matches to appear here!</div>';
      } else {
        listEl.innerHTML = myEntries.map(({ t, me, comp, total }) => {
          const logoHtml = comp
            ? `<img src="${comp.logo}" width="30" height="30" style="object-fit:contain;">`
            : `<span style="font-size:1.3rem">⚽</span>`;
          const rawName = (t.name || '');
          const seasonMatch = rawName.match(/(\d{4})\s*\[\d+\]$/);
          let name;
          if (seasonMatch) {
            const yr = parseInt(seasonMatch[1]);
            name = rawName.replace(/\s+\d{4}(\s+\[\d+\])?$/, '').replace(/\s+\[\d+\]$/, '').trim() + ' ' + yr + '/' + (yr + 1);
          } else {
            name = rawName.replace(/\s+\d{4}(\s+\[\d+\])?$/, '').replace(/\s+\[\d+\]$/, '').trim();
          }
          const rankColor = me.rank === 1 ? '#ffd700' : me.rank === 2 ? '#c0c0c0' : me.rank === 3 ? '#cd7f32' : '#fff';
          const trendHtml = me.trend === 'up' ? '<span style="color:#4caf50;font-size:0.8rem;margin-left:6px">▲</span>' : me.trend === 'down' ? '<span style="color:#f44336;font-size:0.8rem;margin-left:6px">▼</span>' : '<span style="color:rgba(255,255,255,0.2);font-size:0.8rem;margin-left:6px">—</span>';
          return '<div style="display:flex;align-items:center;gap:14px;padding:12px;background:rgba(255,255,255,0.03);border-radius:12px;margin-bottom:8px;border:1px solid rgba(255,255,255,0.05);cursor:pointer;transition:background 0.2s" ' +
            'onclick="openLeagueDetail(\'' + t.id + '\')" ' +
            'onmouseenter="this.style.background=\'rgba(255,255,255,0.06)\'" onmouseleave="this.style.background=\'rgba(255,255,255,0.03)\'">' +
            '<div style="width:34px;height:34px;display:flex;align-items:center;justify-content:center">' + logoHtml + '</div>' +
            '<div style="flex:1">' +
              '<div style="font-weight:700;color:#fff;font-size:0.88rem">' + name + '</div>' +
              '<div style="font-size:0.7rem;color:rgba(255,255,255,0.4)">' + me.xp.toLocaleString() + ' XP · out of ' + total + ' predictors</div>' +
            '</div>' +
            '<div style="text-align:right">' +
              '<div style="display:flex;align-items:center;justify-content:flex-end;font-weight:800;font-size:1.1rem;color:' + rankColor + '">#' + me.rank + trendHtml + '</div>' +
              '<div style="font-size:0.65rem;color:rgba(255,255,255,0.3)">' + Math.round((me.accuracy || 0)) + '% acc</div>' +
            '</div>' +
            '<div style="color:rgba(255,255,255,0.25);font-size:0.75rem;margin-left:4px">›</div>' +
          '</div>';
        }).join('');
      }
    }

    if (miniListEl) {
      if (!myMiniLeagues.length) {
        miniListEl.innerHTML = '<div style="text-align:center;color:var(--text-muted);padding:24px">No mini leagues joined yet</div>';
      } else {
        miniListEl.innerHTML = myMiniLeagues.map(t => {
          const lr = miniRankResults.find(r => r.tournament.id === t.id);
          const rows = lr ? lr.rows : [];
          let me = rows.find(r => r.isMe);
          if (!me) me = { rank: '-', accuracy: 0 };
          
          const comp = COMP_META[t.competition] || COMP_META['premier_league'];
          const logoHtml = `<img src="${comp.logo}" width="30" height="30" style="object-fit:contain;">`;
          const rankColor = me.rank === 1 ? '#ffd700' : me.rank === 2 ? '#c0c0c0' : me.rank === 3 ? '#cd7f32' : '#fff';
          const trendHtml = me.trend === 'up' ? '<span style="color:#4caf50;font-size:0.8rem;margin-left:6px">▲</span>' : me.trend === 'down' ? '<span style="color:#f44336;font-size:0.8rem;margin-left:6px">▼</span>' : '<span style="color:rgba(255,255,255,0.2);font-size:0.8rem;margin-left:6px">—</span>';
          
          return '<div style="display:flex;align-items:center;gap:14px;padding:12px;background:rgba(255,255,255,0.03);border-radius:12px;margin-bottom:8px;border:1px solid rgba(255,255,255,0.05);cursor:pointer;transition:background 0.2s" ' +
            'onclick="navigateToMiniLeague(\'' + t.id + '\')" ' +
            'onmouseenter="this.style.background=\'rgba(255,255,255,0.06)\'" onmouseleave="this.style.background=\'rgba(255,255,255,0.03)\'">' +
            '<div style="width:34px;height:34px;display:flex;align-items:center;justify-content:center">' + logoHtml + '</div>' +
            '<div style="flex:1">' +
              '<div style="font-weight:700;color:#fff;font-size:0.88rem">' + t.name + '</div>' +
              '<div style="font-size:0.7rem;color:rgba(255,255,255,0.4)">' + comp.label + ' · ' + (t._count?.registrations || 0) + ' members</div>' +
            '</div>' +
            '<div style="text-align:right">' +
              '<div style="display:flex;align-items:center;justify-content:flex-end;font-weight:800;font-size:1.1rem;color:' + rankColor + '">#' + me.rank + trendHtml + '</div>' +
              '<div style="font-size:0.65rem;color:rgba(255,255,255,0.3)">' + Math.round((me.accuracy || 0)) + '% acc</div>' +
            '</div>' +
            '<div style="color:rgba(255,255,255,0.25);font-size:0.75rem;margin-left:4px">›</div>' +
          '</div>';
        }).join('');
      }
    }
  } catch(e) {
    if (listEl) listEl.innerHTML = '<div style="text-align:center;color:var(--text-muted);padding:32px">Could not load league ranks</div>';
  }
}

// ─── Open a specific official league as a full page ───────────────────────────
function openLeagueDetail(tournamentId) {
  state.leagueDetailId = tournamentId;
  navigate('league-detail');
}

async function initLeagueDetail() {
  const content = document.getElementById('league-detail-content');
  if (!content) return;

  const tournamentId = state.leagueDetailId;
  if (!tournamentId) {
    content.innerHTML = '<div style="text-align:center;color:var(--text-muted);padding:60px">No league selected.</div>';
    return;
  }

  content.innerHTML = '<div style="text-align:center;color:var(--text-muted);padding:60px">Loading...</div>';

  try {
    const [lbRows, matchesRes, tourRes] = await Promise.all([
      fetch('/api/leaderboard?tournamentId=' + tournamentId).then(r => r.ok ? r.json() : []),
      fetch('/api/matches?tournamentId=' + tournamentId).then(r => r.ok ? r.json() : []),
      fetch('/api/tournaments').then(r => r.ok ? r.json() : []),
    ]);

    const tour = tourRes.find(t => t.id === tournamentId) || {};
    const comp = _compFromTournament(tour) || COMP_META['premier_league'];
    // Format name with season year e.g. "English Premier League 2025 [39]" → "English Premier League 2025/2026"
    const rawDetailName = (tour.name || '');
    const detailSeasonMatch = rawDetailName.match(/(\d{4})\s*\[\d+\]$/);
    let name;
    if (detailSeasonMatch) {
      const yr = parseInt(detailSeasonMatch[1]);
      name = rawDetailName.replace(/\s+\d{4}(\s+\[\d+\])?$/, '').replace(/\s+\[\d+\]$/, '').trim() + ' ' + yr + '/' + (yr + 1);
    } else {
      name = rawDetailName.replace(/\s+\d{4}(\s+\[\d+\])?$/, '').replace(/\s+\[\d+\]$/, '').trim();
    }
    const accentColor = comp.color || '#3CB82E';

    const DAY_NAMES = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

    // ── Podium top 3 (Using Main Leaderboard Styles) ──────────────────────────
    const top3 = lbRows.slice(0, 3);
    const podiumHtml = top3.length ? `
      <div class="podium-section" style="margin-top:20px;">
        <div class="podium-row">
          ${top3[1] ? `
          <div class="podium-card rank2">
            <div class="podium-avatar">
              <img src="${top3[1].image || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + encodeURIComponent(top3[1].name || 'player')}" alt="${top3[1].name}">
              <div class="level-badge ${_xpToLevel(top3[1].xp||0).cls}">${_xpToLevel(top3[1].xp||0).badge}</div>
            </div>
            <div class="podium-name">${top3[1].name}${top3[1].isMe ? ' (You)' : ''}</div>
            <div class="podium-flag">${_getFlagEmoji(top3[1].country)}</div>
            <div class="podium-xp">${(top3[1].xp||0).toLocaleString()} XP</div>
            <div class="podium-block rank2-block"><span class="rank-num">#2</span></div>
          </div>` : '<div class="podium-card rank2" style="visibility:hidden"></div>'}

          ${top3[0] ? `
          <div class="podium-card rank1">
            <div class="crown-icon">
              <svg viewBox="0 0 24 24" fill="#ff9914" width="30" height="30"><path d="M2 20h20l-2-10-6 5-2-8-2 8-6-5-2 10z" /></svg>
            </div>
            <div class="podium-avatar">
              <img src="${top3[0].image || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + encodeURIComponent(top3[0].name || 'player')}" alt="${top3[0].name}">
              <div class="level-badge ${_xpToLevel(top3[0].xp||0).cls}">${_xpToLevel(top3[0].xp||0).badge}</div>
            </div>
            <div class="podium-name">${top3[0].name}${top3[0].isMe ? ' (You)' : ''}</div>
            <div class="podium-flag">${_getFlagEmoji(top3[0].country)}</div>
            <div class="podium-xp">${(top3[0].xp||0).toLocaleString()} XP</div>
            <div class="podium-block rank1-block"><span class="rank-num">#1</span></div>
          </div>` : '<div class="podium-card rank1" style="visibility:hidden"></div>'}

          ${top3[2] ? `
          <div class="podium-card rank3">
            <div class="podium-avatar">
              <img src="${top3[2].image || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + encodeURIComponent(top3[2].name || 'player')}" alt="${top3[2].name}">
              <div class="level-badge ${_xpToLevel(top3[2].xp||0).cls}">${_xpToLevel(top3[2].xp||0).badge}</div>
            </div>
            <div class="podium-name">${top3[2].name}${top3[2].isMe ? ' (You)' : ''}</div>
            <div class="podium-flag">${_getFlagEmoji(top3[2].country)}</div>
            <div class="podium-xp">${(top3[2].xp||0).toLocaleString()} XP</div>
            <div class="podium-block rank3-block"><span class="rank-num">#3</span></div>
          </div>` : '<div class="podium-card rank3" style="visibility:hidden"></div>'}
        </div>
      </div>` : '<div style="text-align:center;color:var(--text-muted);padding:32px;font-size:0.85rem;">No scores yet. Be the first to predict!</div>';

    // ── Rank rows 4+ (Using Main Leaderboard Styles) ──────────────────────────
    const rankRestHtml = lbRows.slice(3).map((u) => {
      const lvl = _xpToLevel(u.xp || 0);
      const avatar = u.image || ('https://api.dicebear.com/7.x/avataaars/svg?seed=' + encodeURIComponent(u.name || 'player'));
      const streak = u.streak || 0;
      const acc = u.accuracy != null ? Math.round(u.accuracy) + '%' : '';
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
      </div>`;
    }).join('');

    const rankingContent = podiumHtml + (lbRows.length > 3 ? `<div class="leaderboard-table" style="margin-top:0">${rankRestHtml}</div>` : '');

    // ── Your Rank Banner ──────────────────────────────────────────────────────
    const me = lbRows.find(r => r.isMe);
    let myRankBannerHtml = '';
    if (me) {
      const lvl = _xpToLevel(me.xp || 0);
      myRankBannerHtml = `
      <div class="your-rank-banner" style="margin-top:20px;margin-bottom:20px;">
        <div class="yrb-left">
          <span class="yrb-rank">#${me.rank}</span>
          <span class="yrb-label">Your Rank</span>
        </div>
        <div class="yrb-center">
          <div class="user-avatar-sm">
            <img src="${me.image || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + encodeURIComponent(me.name || 'player')}" alt="You">
            <div class="level-badge-sm ${lvl.cls}">${lvl.badge}</div>
          </div>
          <div>
            <div class="yrb-name">${me.name} (You)</div>
            <div class="yrb-xp">${(me.xp||0).toLocaleString()} XP · ${me.accuracy!=null ? Math.round(me.accuracy)+'%' : '0%'} acc</div>
          </div>
        </div>
        <div class="yrb-right">
          <svg viewBox="0 0 24 24" fill="none" stroke="#ff9914" stroke-width="2" width="20" height="20">
            <polyline points="18 15 12 9 6 15" />
          </svg>
          <span>— today</span>
        </div>
      </div>`;
    }

    // ── Fixtures (Bottom grid) ──────────────────────────────────────────────
    const nowD = new Date(); nowD.setHours(0,0,0,0);
    const cutoffD = new Date(nowD); cutoffD.setDate(cutoffD.getDate() + 14);
    const upcoming = matchesRes
      .filter(m => { const d = new Date(m.matchDate); return m.status === 'UPCOMING' && d >= nowD && d <= cutoffD; })
      .sort((a,b) => new Date(a.matchDate) - new Date(b.matchDate));

    let lastDayLabel = '';
    const fixtureHtml = upcoming.length ? upcoming.map(m => {
      const mt = new Date(m.matchDate);
      const mDay = new Date(mt); mDay.setHours(0,0,0,0);
      const diff = Math.round((mDay - nowD) / 86400000);
      const dayLabel = diff === 0 ? 'Today' : diff === 1 ? 'Tomorrow' : DAY_NAMES[mt.getDay()] + ' ' + mt.toLocaleDateString('en-GB',{day:'numeric',month:'short'});
      const timeStr = mt.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'});
      
      const hasPred = !!m.userPrediction;
      const homeLogo = m.homeLogo
        ? `<img src="${m.homeLogo}" width="24" height="24" style="border-radius:50%;">`
        : `<div style="width:24px;height:24px;border-radius:50%;background:rgba(255,255,255,0.07);display:flex;align-items:center;justify-content:center;font-size:7px;font-weight:800;">${(m.homeTeam||'').substring(0,3).toUpperCase()}</div>`;
      const awayLogo = m.awayLogo
        ? `<img src="${m.awayLogo}" width="24" height="24" style="border-radius:50%;">`
        : `<div style="width:24px;height:24px;border-radius:50%;background:rgba(255,255,255,0.07);display:flex;align-items:center;justify-content:center;font-size:7px;font-weight:800;">${(m.awayTeam||'').substring(0,3).toUpperCase()}</div>`;
      return `
        <div onclick="openRealMatchDetail('${m.id}')" role="button"
             style="cursor:pointer;display:flex;flex-direction:column;align-items:center;padding:12px;border-radius:12px;
                    background:${hasPred?'rgba(60,184,46,0.07)':'rgba(255,255,255,0.025)'};
                    border:1px solid ${hasPred?'rgba(60,184,46,0.22)':'rgba(255,255,255,0.06)'};
                    transition:background 0.15s; min-width: 140px; text-align:center;"
             onmouseenter="this.style.background='rgba(255,255,255,0.06)'" onmouseleave="this.style.background='${hasPred?'rgba(60,184,46,0.07)':'rgba(255,255,255,0.025)'}'">
          <div style="font-size:0.65rem;font-weight:800;color:rgba(255,255,255,0.4);margin-bottom:8px;letter-spacing:0.5px;">${dayLabel} · ${timeStr}</div>
          <div style="display:flex;gap:8px;align-items:center;justify-content:center;margin-bottom:8px;">
            ${homeLogo}
            <span style="font-size:0.7rem;color:rgba(255,255,255,0.3);font-weight:700;">VS</span>
            ${awayLogo}
          </div>
          <div style="font-size:0.75rem;font-weight:700;color:#fff;margin-bottom:2px;">${m.homeTeam}</div>
          <div style="font-size:0.75rem;font-weight:700;color:#fff;margin-bottom:8px;">${m.awayTeam}</div>
          <div style="font-size:0.7rem;font-weight:800;color:${hasPred?'var(--green)':'var(--cyan)'};padding:4px 10px;background:rgba(0,0,0,0.2);border-radius:100px;">
            ${hasPred?'✓ Predicted':'Predict'}
          </div>
        </div>`;
    }).join('') : '<div style="color:var(--text-muted);font-size:0.85rem;">No upcoming fixtures in the next 14 days.</div>';

    const isCompletedLeague = !!(tour.status && tour.status.toUpperCase() === 'COMPLETED');

    // ── Build final page HTML ─────────────────────────────────────────────────
    content.innerHTML = `
      <div class="page-header-block" style="display:flex;align-items:center;justify-content:space-between;border-bottom:none;padding-bottom:0;">
        <div style="display:flex;align-items:center;gap:14px;">
          <div style="width:48px;height:48px;border-radius:12px;background:rgba(0,0,0,0.2);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
            <img src="${comp.logo}" width="36" height="36" style="object-fit:contain;">
          </div>
          <div>
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
              <h1 class="page-title" style="margin:0;font-size:1.6rem;text-transform:uppercase;letter-spacing:1px;">${name}</h1>
              ${isCompletedLeague ? `<span style="font-size:0.6rem;font-weight:800;padding:3px 10px;border-radius:100px;background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.18);color:rgba(255,255,255,0.55);letter-spacing:0.8px;text-transform:uppercase;white-space:nowrap;">✓ Season Ended</span>` : ''}
            </div>
            <div style="font-size:0.8rem;color:rgba(255,255,255,0.4);margin-top:2px;">
              ${isCompletedLeague
                ? `${lbRows.length} predictor${lbRows.length===1?'':'s'} · Final Standings`
                : `${lbRows.length} predictor${lbRows.length===1?'':'s'} · Official League`}
            </div>
          </div>
        </div>
        <button onclick="navigate('leaderboard');"
                style="background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12);border-radius:100px;padding:9px 18px;color:rgba(255,255,255,0.8);cursor:pointer;font-size:0.82rem;font-weight:700;display:flex;align-items:center;gap:6px;transition:background 0.15s;"
                onmouseenter="this.style.background='rgba(255,255,255,0.1)'" onmouseleave="this.style.background='rgba(255,255,255,0.06)'">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="14" height="14"><polyline points="15 18 9 12 15 6"></polyline></svg>
          Back
        </button>
      </div>

      ${isCompletedLeague ? `
      <div style="margin-top:16px;padding:14px 18px;border-radius:14px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);display:flex;align-items:center;gap:12px;">
        <div style="width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,0.07);display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:1.1rem;">🏁</div>
        <div>
          <div style="font-size:0.85rem;font-weight:800;color:rgba(255,255,255,0.8);margin-bottom:2px;">This season has ended</div>
          <div style="font-size:0.78rem;color:rgba(255,255,255,0.4);line-height:1.4;">Predictions for this league are now closed. The rankings below reflect the final standings.</div>
        </div>
      </div>` : ''}

      <!-- Fixtures Section at Top -->
      <div style="margin-top:24px;margin-bottom:32px;">
        <h2 style="font-size:1rem;font-weight:900;color:#fff;letter-spacing:1px;text-transform:uppercase;margin-bottom:16px;">
          ${isCompletedLeague ? '📋 Past Fixtures' : '📅 Upcoming Fixtures'}
        </h2>
        <div style="display:flex;gap:12px;overflow-x:auto;padding-bottom:12px;scrollbar-width:thin;">
          ${isCompletedLeague
            ? (matchesRes.length
                ? '<div style="color:rgba(255,255,255,0.35);font-size:0.85rem;padding:16px 0;">This season\'s matches have all been played. Check your predictions in the <strong style="color:rgba(255,255,255,0.6);">Predictions</strong> tab.</div>'
                : '<div style="color:var(--text-muted);font-size:0.85rem;">No match data available.</div>')
            : fixtureHtml}
        </div>
      </div>

      <!-- Main Leaderboard Layout at Bottom -->
      <div style="border-top:1px solid rgba(255,255,255,0.06);padding-top:24px;">
        <h2 style="font-size:1rem;font-weight:900;color:#fff;letter-spacing:1px;text-transform:uppercase;margin-bottom:16px;">🏆 Rankings</h2>
        ${podiumHtml}
        ${myRankBannerHtml}
        ${rankingContent.includes('leaderboard-table') ? rankingContent.split('</div`>')[0].replace(podiumHtml, '') : ''}
      </div>
    `;
  } catch(e) {
    console.error('initLeagueDetail error:', e);
    if (content) content.innerHTML = '<div style="color:var(--red);padding:32px;text-align:center;">Failed to load league data. Please try again.</div>';
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

function _getFlagEmoji(countryCode) {
  const code = (countryCode || 'EG').toUpperCase();
  if (code.length !== 2) return '';
  return String.fromCodePoint(...code.split('').map(c => 127397 + c.charCodeAt(0)));
}

function _xpToLevel(xp) {
  if (xp >= 50000) return { label: 'Legend',   cls: 'legend',   badge: 'L' };
  if (xp >= 20000) return { label: 'Platinum', cls: 'platinum', badge: 'P' };
  if (xp >= 10000) return { label: 'Gold',     cls: 'gold',     badge: 'G' };
  if (xp >= 1000)  return { label: 'Silver',   cls: 'silver',   badge: 'S' };
  return                  { label: 'Bronze',   cls: 'bronze',   badge: 'B' };
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

    // Official tournaments for status lookup
    const officialTournaments = data.filter(t => t.registrationMode !== 'INVITE_ONLY');
    const getCompStatus = (comp) => {
      const off = officialTournaments.find(t => t.competition === comp);
      return off ? off.status : 'UPCOMING';
    };
    const statusWeight = { 'UPCOMING': 0, 'ONGOING': 1, 'COMPLETED': 2 };
    
    myLeagues.sort((a, b) => {
      const wA = statusWeight[getCompStatus(a.competition)] ?? 3;
      const wB = statusWeight[getCompStatus(b.competition)] ?? 3;
      if (wA !== wB) return wA - wB;
      return new Date(b.createdAt || b.startDate) - new Date(a.createdAt || a.startDate);
    });

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
  world_cup:               { label: 'FIFA World Cup 2026', logo: '/images/wc2026-logo.png',                              color: '#17458F', accent: '#ffd700' },
};

// Returns an <img> badge for a competition
function _compBadge(comp, size = 32) {
  return `<img src="${comp.logo}" width="${size}" height="${size}" style="object-fit:contain;filter:drop-shadow(0 0 4px rgba(0,0,0,0.4))">`;
}

// Current football season year: Jan–Jul = previous year, Aug–Dec = current year
function _getCurrentSeason() {
  const now = new Date();
  return (now.getMonth() < 7 ? now.getFullYear() - 1 : now.getFullYear()).toString();
}

// Derive COMP_META key from a tournament name (works for DB names like "La Liga 2025 [140]")
function _compKeyFromName(name) {
  const n = (name || '').toLowerCase()
    .replace(/\s+\d{4}(\s+\[\d+\])?$/, '')
    .replace(/\s+\[\d+\]$/, '')
    .trim();
  if (n.includes('egyptian')) return 'egyptian_premier_league';
  if (n.includes('world cup') || n.includes('fifa world cup') || n.includes('fifa world cup 2026')) return 'world_cup';
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

    // ── Top-3 Podium (Using Main Leaderboard Styles) ──
    const top3 = data.ranking.slice(0, 3);
    const podiumHtml = top3.length ? `
      <div class="podium-section" style="margin-top:10px;">
        <div class="podium-row">
          ${top3[1] ? `
          <div class="podium-card rank2">
            <div class="podium-avatar">
              <img src="${top3[1].image || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + encodeURIComponent(top3[1].name || 'player')}" alt="${top3[1].name}">
              <div class="level-badge ${_xpToLevel(top3[1].xp||0).cls}">${_xpToLevel(top3[1].xp||0).badge}</div>
            </div>
            <div class="podium-name">${top3[1].name}${top3[1].isMe ? ' (You)' : ''}</div>
            <div class="podium-flag">${_getFlagEmoji(top3[1].country)}</div>
            <div class="podium-xp">${(top3[1].xp||0).toLocaleString()} XP</div>
            <div class="podium-block rank2-block"><span class="rank-num">#2</span></div>
          </div>` : '<div class="podium-card rank2" style="visibility:hidden"></div>'}

          ${top3[0] ? `
          <div class="podium-card rank1">
            <div class="crown-icon">
              <svg viewBox="0 0 24 24" fill="#ff9914" width="30" height="30"><path d="M2 20h20l-2-10-6 5-2-8-2 8-6-5-2 10z" /></svg>
            </div>
            <div class="podium-avatar">
              <img src="${top3[0].image || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + encodeURIComponent(top3[0].name || 'player')}" alt="${top3[0].name}">
              <div class="level-badge ${_xpToLevel(top3[0].xp||0).cls}">${_xpToLevel(top3[0].xp||0).badge}</div>
            </div>
            <div class="podium-name">${top3[0].name}${top3[0].isMe ? ' (You)' : ''}</div>
            <div class="podium-flag">${_getFlagEmoji(top3[0].country)}</div>
            <div class="podium-xp">${(top3[0].xp||0).toLocaleString()} XP</div>
            <div class="podium-block rank1-block"><span class="rank-num">#1</span></div>
          </div>` : '<div class="podium-card rank1" style="visibility:hidden"></div>'}

          ${top3[2] ? `
          <div class="podium-card rank3">
            <div class="podium-avatar">
              <img src="${top3[2].image || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + encodeURIComponent(top3[2].name || 'player')}" alt="${top3[2].name}">
              <div class="level-badge ${_xpToLevel(top3[2].xp||0).cls}">${_xpToLevel(top3[2].xp||0).badge}</div>
            </div>
            <div class="podium-name">${top3[2].name}${top3[2].isMe ? ' (You)' : ''}</div>
            <div class="podium-flag">${_getFlagEmoji(top3[2].country)}</div>
            <div class="podium-xp">${(top3[2].xp||0).toLocaleString()} XP</div>
            <div class="podium-block rank3-block"><span class="rank-num">#3</span></div>
          </div>` : '<div class="podium-card rank3" style="visibility:hidden"></div>'}
        </div>
      </div>` : '';

    // ── Rows rank 4+ (Using Main Leaderboard Styles) ──
    const rankRestHtml = data.ranking.slice(3).map((u, i) => {
      const lvl = _xpToLevel(u.xp || 0);
      const avatar = u.image || ('https://api.dicebear.com/7.x/avataaars/svg?seed=' + encodeURIComponent(u.name || 'player'));
      const streak = u.streak || 0;
      const acc = u.accuracy != null ? Math.round(u.accuracy) + '%' : '';
      return `
      <div class="mini-lb-row ${u.isMe ? 'you-row' : ''}" role="row">
        <div class="lb-rank" style="color:var(--text-muted);font-weight:800">#${u.rank || (i+4)}</div>
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
      </div>`;
    }).join('');

    const rankingContent = data.ranking.length === 0
      ? '<div style="color:var(--text-muted);text-align:center;padding:24px;font-size:0.82rem;">No predictions scored yet.<br>Predict upcoming games!</div>'
      : podiumHtml + (data.ranking.length > 3 ? `<div class="leaderboard-table" style="margin-top:0">${rankRestHtml}</div>` : '');

    // ── Build fixture rows ──
    const today = new Date(); today.setHours(0,0,0,0);
    let lastLabel = '';
    const fixtureHtml = data.fixtures.length ? data.fixtures.map(m => {
      const t = new Date(m.matchDate);
      const mDay = new Date(t); mDay.setHours(0,0,0,0);
      const diffDays = Math.round((mDay - today) / 86400000);
      const dayLabel = diffDays === 0 ? 'Today' : diffDays === 1 ? 'Tomorrow' : DAY_NAMES[t.getDay()];
      const timeStr = t.toLocaleDateString('en-GB',{day:'2-digit',month:'2-digit'}) + ' ' + t.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'});
      let sep = '';
      if (dayLabel !== lastLabel) { lastLabel = dayLabel; sep = `<div style="font-size:0.65rem;font-weight:800;color:rgba(255,255,255,0.3);letter-spacing:1.5px;text-transform:uppercase;padding:10px 0 5px;">${dayLabel}</div>`; }
      const hasPred = !!m.userPrediction;
      const homeLogo = m.homeLogo ? `<img src="${m.homeLogo}" width="28" height="28" style="border-radius:50%;border:1.5px solid rgba(255,255,255,0.1)">` : `<div style="width:28px;height:28px;border-radius:50%;background:rgba(255,255,255,0.06);display:flex;align-items:center;justify-content:center;font-size:8px;font-weight:800;color:rgba(255,255,255,0.4)">${m.homeTeam.substring(0,3).toUpperCase()}</div>`;
      const awayLogo = m.awayLogo ? `<img src="${m.awayLogo}" width="28" height="28" style="border-radius:50%;border:1.5px solid rgba(255,255,255,0.1)">` : `<div style="width:28px;height:28px;border-radius:50%;background:rgba(255,255,255,0.06);display:flex;align-items:center;justify-content:center;font-size:8px;font-weight:800;color:rgba(255,255,255,0.4)">${m.awayTeam.substring(0,3).toUpperCase()}</div>`;
      return sep + `
        <div onclick="openRealMatchDetail('${m.id}')" role="button" style="cursor:pointer;display:flex;align-items:center;gap:8px;padding:9px 10px;border-radius:10px;margin-bottom:4px;background:${hasPred?'rgba(60,184,46,0.06)':'rgba(255,255,255,0.02)'};border:1px solid ${hasPred?'rgba(60,184,46,0.2)':'rgba(255,255,255,0.05)'};">
          <div style="display:flex;gap:3px;flex-shrink:0;">${homeLogo}${awayLogo}</div>
          <div style="flex:1;min-width:0;">
            <div style="font-size:0.68rem;font-weight:700;color:${hasPred?'var(--green)':'rgba(255,255,255,0.35)'};">${hasPred?'✓ Predicted':'Predict'}</div>
            <div style="font-size:0.8rem;font-weight:600;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${m.homeTeam} vs ${m.awayTeam}</div>
          </div>
          <div style="font-size:0.68rem;color:var(--text-muted);text-align:right;flex-shrink:0;">${timeStr}</div>
        </div>`;
    }).join('') : '<div style="color:var(--text-muted);text-align:center;padding:24px;font-size:0.82rem;">No upcoming fixtures.</div>';

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
      <div style="background:rgba(8,189,189,0.08);border:1px solid rgba(8,189,189,0.2);border-radius:12px;padding:12px 16px;margin-bottom:20px;display:flex;justify-content:space-between;align-items:center;">
        <span style="font-size:0.78rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px;">Invite Code</span>
        <code style="font-size:0.9rem;font-weight:800;color:var(--cyan);cursor:pointer;" onclick="navigator.clipboard.writeText('${data.inviteCode}');showNotification('Code copied!','success')">${data.inviteCode} 📋</code>
      </div>

      <!-- Live Now strip -->
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

      <!-- Tabs Navigation -->
      <div style="display:flex;border-bottom:1px solid rgba(255,255,255,0.1);margin-bottom:16px;">
        <div id="ml-tab-rank" onclick="switchMlTab('rank')" style="flex:1;text-align:center;padding:12px;font-size:0.85rem;font-weight:800;color:var(--cyan);border-bottom:2px solid var(--cyan);cursor:pointer;text-transform:uppercase;letter-spacing:1px;">🏆 Rankings</div>
        <div id="ml-tab-fix" onclick="switchMlTab('fix')" style="flex:1;text-align:center;padding:12px;font-size:0.85rem;font-weight:800;color:rgba(255,255,255,0.4);border-bottom:2px solid transparent;cursor:pointer;text-transform:uppercase;letter-spacing:1px;">📅 Fixtures</div>
      </div>

      <!-- Tab Content: Rankings -->
      <div id="ml-tab-content-rank" style="background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);border-radius:14px;padding:16px;">
        ${rankingContent}
      </div>

      <!-- Tab Content: Fixtures -->
      <div id="ml-tab-content-fix" class="hidden" style="background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);border-radius:14px;padding:16px;">
        ${fixtureHtml}
      </div>
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

// Navigate to the mini leagues page and immediately open a specific league's detail
function navigateToMiniLeague(leagueId) {
  navigate('minileague');
  // Wait for the page to render and initMiniLeagues() to complete before opening detail
  setTimeout(() => openMiniLeagueDetail(leagueId), 300);
}

async function createLeague() {
  const name = document.getElementById('league-name-input').value.trim();
  if (!name) {
    document.getElementById('league-name-input').style.borderColor = 'var(--red)';
    return;
  }
  const competition = document.querySelector('input[name="mini_league_comp"]:checked')?.value || 'Premier League';
  const scoringMode = 'global';
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
        season: _getCurrentSeason(),
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

      // Flag
      const flagEl = document.getElementById('profile-flag');
      if (flagEl) flagEl.textContent = _getFlagEmoji(u.country || 'EG');

      // XP display
      const xpEl = document.getElementById('profile-xp');
      if (xpEl) xpEl.textContent = xp.toLocaleString() + ' XP';

      // Real Insights (Stats Grid)
      let statsObj = null;
      try {
        const s = await fetch('/api/predictions/stats').then(r => r.ok ? r.json() : null);
        statsObj = s;
        if (s) {
          const accEl = document.getElementById('profile-stat-accuracy');
          if (accEl) accEl.textContent = (s.accuracy || 0) + '%';
          
          const totalEl = document.getElementById('profile-stat-total-preds');
          if (totalEl) totalEl.textContent = (s.allPredictions || 0).toLocaleString();
          
          const bestEl = document.getElementById('profile-stat-best-streak');
          if (bestEl) bestEl.textContent = (u.bestStreak || 0).toLocaleString();
          
          const correctEl = document.getElementById('profile-stat-correct-preds');
          if (correctEl) correctEl.textContent = (s.correct || 0).toLocaleString();
        }
      } catch(e) { console.error('Failed to load profile stats:', e); }

      // Level / tier
      const TIERS = [
        { name: 'Bronze',   min: 0,     max: 999,   cls: 'bronze'   },
        { name: 'Silver',   min: 1000,  max: 9999,  cls: 'silver'   },
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
      let globalRankNum = null;
      try {
        const lbRes = await fetch('/api/leaderboard?period=alltime&limit=5000');
        if (lbRes.ok) {
          const lbData = await lbRes.json();
          const entries = Array.isArray(lbData) ? lbData : (lbData.entries || []);
          const myEntry  = entries.find(e => e.isMe || e.userId === u.id);
          const myIdx   = myEntry ? (entries.indexOf(myEntry)) : -1;
          const globalRank = myEntry ? (myEntry.rank || myIdx + 1) : null;
          globalRankNum = globalRank;
          const rankEl = document.getElementById('profile-global-rank');
          if (rankEl) {
            rankEl.textContent = globalRank ? '#' + globalRank.toLocaleString() + ' Globally' : 'Unranked';
            rankEl.style.opacity = '1';
          }
        }
      } catch(e) {}

      // Invite card
      _renderInviteCard(u.id, u.name);

      renderTrophies(u, statsObj, globalRankNum);
    }
  } catch(e) { console.error('initProfile error', e); }
}

function _renderInviteCard(userId, userName) {
  // Remove existing card if any (prevents duplicates on re-nav)
  const existing = document.getElementById('invite-friends-card');
  if (existing) existing.remove();

  const refLink = `${window.location.origin}/register?ref=${userId}`;
  const shareText = encodeURIComponent(`Join me on Matchkoo — the football prediction platform! Predict scores, earn XP and compete on leaderboards.\n\nSign up with my invite link:`);
  const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(refLink)}`;
  const twUrl = `https://twitter.com/intent/tweet?text=${shareText}&url=${encodeURIComponent(refLink)}`;

  const card = document.createElement('section');
  card.id = 'invite-friends-card';
  card.className = 'content-section';
  card.innerHTML = `
      <h2 class="section-title" style="padding-bottom: 10px;">🎁 Invite Friends</h2>
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
        <a href="${fbUrl}" target="_blank"
          style="flex:1;padding:10px;background:#1877F2;color:#fff;border-radius:12px;text-decoration:none;font-weight:700;font-size:0.82rem;text-align:center;">
          Facebook
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


function renderTrophies(user, stats, globalRank) {
  const container = document.getElementById('trophies-grid');
  if (!container) return;

  const xp = user?.xp || 0;
  const bestStreak = user?.bestStreak || 0;
  const correctCount = stats?.correct || 0;
  const isTop100 = globalRank !== null && globalRank <= 100;

  const myTrophies = [
    { id: 't1', icon: '⚽', name: 'First Blood', desc: 'First correct prediction', unlocked: correctCount >= 1 },
    { id: 't2', icon: '🎯', name: 'Sniper', desc: 'Exact scoreline correct', unlocked: correctCount >= 5 }, // Fallback: assuming 5 correct gives at least 1 exact
    { id: 't3', icon: '🔥', name: 'On Fire', desc: '7-game streak', unlocked: bestStreak >= 7 },
    { id: 't4', icon: '🚀', name: 'Rocket', desc: 'Reach Gold level', unlocked: xp >= 10000 },
    { id: 't5', icon: '👑', name: 'King', desc: 'Win a mini league', unlocked: false }, // Placeholder until mini league wins are tracked
    { id: 't6', icon: '🌍', name: 'Globetrotter', desc: 'Predict in 5 leagues', unlocked: correctCount >= 15 }, // Fallback heuristic
    { id: 't7', icon: '💯', name: 'Century', desc: '100 correct predictions', unlocked: correctCount >= 100 },
    { id: 't8', icon: '🏆', name: 'Champion', desc: 'Top 100 Global', unlocked: isTop100 },
    { id: 't9', icon: '💎', name: 'Diamond', desc: 'Reach Platinum level', unlocked: xp >= 20000 },
    { id: 't10', icon: '⭐', name: 'Legend', desc: 'Reach Legend level', unlocked: xp >= 50000 },
    { id: 't11', icon: '🔮', name: 'Oracle', desc: '10 correct scorelines', unlocked: correctCount >= 50 }, // Fallback heuristic
    { id: 't12', icon: '🌟', name: 'Superstar', desc: 'Season trophy winner', unlocked: false },
  ];

  container.innerHTML = myTrophies.map(t =>
    '<div class="trophy-item ' + (t.unlocked ? '' : 'locked') + '" title="' + t.desc + '">' +
      '<div class="trophy-icon">' + t.icon + '</div>' +
      '<div class="trophy-name">' + t.name + '</div>' +
      '<div class="trophy-desc">' + t.desc + '</div>' +
      (t.unlocked ? '<button onclick="shareTrophy(this)" data-userid="' + (user?.id || '') + '" data-name="' + t.name.replace(/"/g,"&quot;") + '" data-icon="' + t.icon + '" style="margin-top:8px;font-size:0.65rem;font-weight:700;padding:4px 10px;border-radius:100px;background:rgba(29,161,242,0.12);border:1px solid rgba(29,161,242,0.3);color:#1DA1F2;cursor:pointer">Share</button>' : '') +
    '</div>'
  ).join('');
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


// ─── MATCH COMMENTARY ───────────────────────────────────────────────
const _EVT_ICON = {
  'Goal':    '⚽',
  'Own Goal': '⚽',
  'Penalty': '⚽',
  'Yellow Card': '🟨',
  'Red Card':    '🟥',
  'Yellow Red Card': '🟥',
  'subst':   '🔄',
  'Var':     '📺',
};

function _evtIcon(type, detail) {
  if (type === 'Goal' || type === 'Goal Disallowed') {
    if (detail && detail.toLowerCase().includes('own')) return '⚽️\uD83D\uDE45'; // own goal marker
    return '⚽';
  }
  if (type === 'Card')  return _EVT_ICON[detail] || '🟨';
  if (type === 'subst') return '🔄';
  if (type === 'Var')   return '📺';
  return '•';
}

function _evtClass(type, detail) {
  if (type === 'Goal') return 'goal-event';
  if (type === 'Card') {
    if (detail && detail.toLowerCase().includes('red')) return 'red-event';
    return 'yellow-event';
  }
  if (type === 'subst') return 'sub-event';
  if (type === 'Var')   return 'var-event';
  return '';
}

function _evtActionHtml(evt) {
  const team   = evt.team   ? '<span class="team-name">' + _esc(evt.team) + '</span>' : '';
  const player = evt.player ? _esc(evt.player) : '';
  const assist = evt.assist ? ' <span style="color:rgba(255,255,255,0.4)">(assist: ' + _esc(evt.assist) + ')</span>' : '';

  if (evt.type === 'Goal') {
    const sub = evt.detail && evt.detail !== 'Normal Goal' ? ' <span style="opacity:.5">(' + _esc(evt.detail) + ')</span>' : '';
    return (player ? '<strong>' + player + '</strong>' + sub : 'Goal') + (team ? ' — ' + team : '') + assist;
  }
  if (evt.type === 'Card') {
    const cls = evt.detail && evt.detail.toLowerCase().includes('red') ? 'red-txt' : 'yellow-txt';
    return '<span class="' + cls + '">' + _esc(evt.detail || 'Card') + '</span>' +
           (player ? ' — <strong>' + player + '</strong>' : '') +
           (team ? ' (' + team + ')' : '');
  }
  if (evt.type === 'subst') {
    return '❌ <strong>' + _esc(evt.player || '?') + '</strong>' +
           (evt.assist ? ' → ✅ <strong>' + _esc(evt.assist) + '</strong>' : '') +
           (team ? ' — ' + team : '');
  }
  if (evt.type === 'Var') {
    return 'VAR: ' + _esc(evt.detail || '') + (team ? ' — ' + team : '');
  }
  return _esc(evt.detail || evt.type || '');
}

function _esc(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function _loadMatchCommentary(matchId) {
  const feed = document.getElementById('commentary-feed');
  if (!feed) return;

  try {
    const data = await fetch('/api/matches/commentary?matchId=' + matchId)
      .then(r => r.ok ? r.json() : null);

    if (!data || !data.events || data.events.length === 0) {
      feed.innerHTML = '<div class="commentary-empty">No events yet</div>';
      return;
    }

    // Show newest first (reverse chronological for live matches)
    const sorted = [...data.events].sort((a, b) => (b.minute + (b.extraMinute || 0)) - (a.minute + (a.extraMinute || 0)));

    feed.innerHTML = sorted.map(evt => {
      const min   = evt.minute + (evt.extraMinute ? '+' + evt.extraMinute : '') + "'";
      const icon  = _evtIcon(evt.type, evt.detail);
      const cls   = _evtClass(evt.type, evt.detail);
      const action = _evtActionHtml(evt);
      const comment = evt.commentary
        ? '<div class="commentary-text">' + _esc(evt.commentary) + '</div>'
        : '';
      return '<div class="commentary-event ' + cls + '">' +
        '<span class="commentary-minute">' + min + '</span>' +
        '<span class="commentary-icon">' + icon + '</span>' +
        '<div class="commentary-body"><div class="commentary-action">' + action + '</div>' + comment + '</div>' +
        '</div>';
    }).join('');

    // Auto-scroll to top (most recent event)
    feed.scrollTop = 0;
  } catch { /* silent */ }
}


// ─── WHO WILL WIN? (fixed prediction distribution) ───────────────
// Fetched ONCE when the modal opens — based on user predictions locked
// before kick-off. Never refreshed during the match (stats are frozen).
async function _loadLivePulse(matchId, homeTeam, awayTeam) {
  try {
    const pulse = await fetch('/api/matches/pulse?matchId=' + matchId)
      .then(r => r.ok ? r.json() : null);
    if (!pulse) return;

    // Team name labels on the momentum bar
    const labels = document.querySelectorAll('.mm-label');
    if (labels[0]) labels[0].textContent = homeTeam || 'Home';
    if (labels[1]) labels[1].textContent = awayTeam || 'Away';

    // Bar widths (home win % on the left, away win % on the right)
    const homeBar = document.querySelector('.mm-home');
    const awayBar = document.querySelector('.mm-away');
    if (homeBar) homeBar.style.width = pulse.homeWin + '%';
    if (awayBar) awayBar.style.width = pulse.awayWin + '%';

    // Percentage text under each bar segment
    const homeEl = document.querySelector('.home-pct');
    const drawEl = document.querySelector('.draw-pct');
    const awayEl = document.querySelector('.away-pct');
    if (homeEl) homeEl.textContent = pulse.homeWin + '%';
    if (drawEl) drawEl.textContent = pulse.draw    + '%';
    if (awayEl) awayEl.textContent = pulse.awayWin + '%';

    // Predictor count sub-label
    const countEl = document.getElementById('pulse-predictor-count');
    if (countEl) countEl.textContent = pulse.total
      ? pulse.total + (pulse.total === 1 ? ' predictor' : ' predictors')
      : 'No predictions yet';
  } catch { /* silent */ }
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
  const home = _resolveTeam(m.homeTeam, m.homeLogo);
  const away = _resolveTeam(m.awayTeam, m.awayLogo);

  if (homeNameEl) homeNameEl.textContent = home.name;
  if (awayNameEl) awayNameEl.textContent = away.name;
  if (venueEl)    venueEl.textContent    = m.league || m.tournament?.name || '';

  if (statusEl) {
    if (isLive) {
      if (m.statusShort === 'HT') {
        statusEl.textContent = '⏸ Half Time';
        statusEl.style.color = 'var(--accent, #f59e0b)';
      } else {
        const min = m.minute ? m.minute + "'" : '';
        statusEl.textContent = '\uD83D\uDD34 LIVE ' + min;
        statusEl.style.color = 'var(--red)';
      }
    } else if (isCompleted) {
      statusEl.textContent = 'Full Time';
      statusEl.style.color = 'var(--text-secondary)';
    } else {
      statusEl.textContent = new Date(m.matchDate).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
      statusEl.style.color = 'var(--text-secondary)';
    }
  }

  const homeColor = '#1a3a5c', awayColor = '#3a1a2a';
  if (homeSvgEl) homeSvgEl.innerHTML = home.logo
    ? '<image href="' + home.logo + '" x="2" y="2" width="56" height="56" clip-path="circle(28px at 30px 30px)"/>'
    : '<circle cx="30" cy="30" r="28" fill="' + homeColor + '"/><text x="30" y="37" text-anchor="middle" fill="white" font-size="12" font-weight="bold" font-family="sans-serif">' + _mkAbbr(home.name) + '</text>';
  if (awaySvgEl) awaySvgEl.innerHTML = away.logo
    ? '<image href="' + away.logo + '" x="2" y="2" width="56" height="56" clip-path="circle(28px at 30px 30px)"/>'
    : '<circle cx="30" cy="30" r="28" fill="' + awayColor + '"/><text x="30" y="37" text-anchor="middle" fill="white" font-size="12" font-weight="bold" font-family="sans-serif">' + _mkAbbr(away.name) + '</text>';

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
      // Chip highlight is restored by _renderPlayerPicker after lineup loads

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
    if (live.status === 'LIVE' && !state._liveScoreInterval) {
      // Match is live (e.g. was stale COMPLETED from old HT bug) — start polling
      state._liveScoreInterval = setInterval(() => {
        if (document.getElementById('match-modal-overlay').classList.contains('hidden')) {
          clearInterval(state._liveScoreInterval);
          state._liveScoreInterval = null;
          return;
        }
        _fetchAndApplyLive(matchId);
        _loadLineup(matchId, 'LIVE');
      }, 30000);
    } else if (live.status === 'COMPLETED') {
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

    // ── Load commentary for any match status ────────────────────
    _loadMatchCommentary(matchId);

    // Load lineup for prediction form (upcoming + live)
    if (m.status !== 'COMPLETED') {
      _loadLineup(matchId, m.status);
    }

    if (m.status === 'LIVE') {
      // Immediate live fetch then poll every 30s
      _fetchAndApplyLive(matchId);
      state._liveScoreInterval = setInterval(() => {
        if (document.getElementById('match-modal-overlay').classList.contains('hidden')) {
          clearInterval(state._liveScoreInterval);
          state._liveScoreInterval = null;
          return;
        }
        _fetchAndApplyLive(matchId);
        _loadLineup(matchId, 'LIVE');
        _loadMatchCommentary(matchId); // refresh commentary every 30s
      }, 30000);

      // ── Live Pulse: load real prediction breakdown ──────────────
      _loadLivePulse(matchId, m.homeTeam, m.awayTeam);

    } else if (m.status === 'COMPLETED') {
      const matchTime = new Date(m.matchDate).getTime();
      const msSinceKickoff = Date.now() - matchTime;
      if (msSinceKickoff > 0 && msSinceKickoff < 3 * 60 * 60 * 1000) {
        _fetchAndApplyLive(matchId);
      }
    }
  } catch(e) {
    showNotification('Could not load match details', 'error');
  }
}



// ─── LINEUP / PLAYER PICKER ──────────────────────────────────────

async function _loadLineup(matchId, matchStatus) {
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
    // Only show match events for live/completed matches, not upcoming ones
    if (events && events.length > 0 && (matchStatus === 'LIVE' || matchStatus === 'COMPLETED')) {
      _renderEventsTimeline(events);
    } else {
      // Hide the events timeline container for upcoming matches
      const evtContainer = document.getElementById('match-events-timeline');
      if (evtContainer) evtContainer.style.display = 'none';
    }
  } catch(e) {
    // Silently fall back to text input
    if (loading) loading.style.display = 'none';
    if (picker)  picker.style.display  = 'block';
    const noMsg = document.getElementById('no-lineup-msg');
    if (noMsg) noMsg.style.display = 'block';
  }
}

function _renderPlayerPicker(lineup, events) {
  const noMsg       = document.getElementById('no-lineup-msg');
  const homePlayers = document.getElementById('lineup-home-players');
  const homeSubs    = document.getElementById('lineup-home-subs');
  const awayPlayers = document.getElementById('lineup-away-players');
  const awaySubs    = document.getElementById('lineup-away-subs');
  const homeLabel   = document.getElementById('lineup-home-label');
  const awayLabel   = document.getElementById('lineup-away-label');

  // Clear previous content
  [homePlayers, homeSubs, awayPlayers, awaySubs].forEach(el => { if (el) el.innerHTML = ''; });

  if (!lineup || (!lineup.home?.startXI?.length && !lineup.away?.startXI?.length)) {
    if (noMsg) noMsg.style.display = 'block';
    return;
  }
  if (noMsg) noMsg.style.display = 'none';

  // Build set of players subbed off (assistName = player who came off)
  const subbedOff = new Set();
  const subbedOn  = new Set();
  if (events) {
    events.filter(e => e.type === 'subst').forEach(e => {
      if (e.assistName) subbedOff.add(e.assistName);
      if (e.playerName) subbedOn.add(e.playerName);
    });
  }

  const currentScorer = (document.getElementById('scorer-select')?.value || '').trim();

  // Set team labels
  if (homeLabel) homeLabel.textContent = '\u26bd ' + (lineup.home?.team || 'Home').toUpperCase();
  if (awayLabel) awayLabel.textContent = '\u26bd ' + (lineup.away?.team || 'Away').toUpperCase();

  // Helper: create a clickable player chip
  const makeChip = (player) => {
    const isOff = subbedOff.has(player.name);
    const isOn  = subbedOn.has(player.name);
    const chip  = document.createElement('button');
    chip.type = 'button';
    chip.className = 'player-chip'
      + (isOff ? ' subbed-off' : '')
      + (isOn  ? ' subbed-on'  : '')
      + (player.name === currentScorer ? ' selected-player' : '');
    chip.dataset.playerName = player.name;
    chip.innerHTML =
      (player.number ? '<span class="player-num">' + player.number + '</span> ' : '') +
      player.name;
    if (!isOff) {
      chip.addEventListener('click', () => _selectPlayerChip(player.name, chip));
    }
    return chip;
  };

  // Populate grids
  const fillGrid = (container, players) => {
    if (!container) return;
    players.forEach(p => container.appendChild(makeChip(p)));
  };

  fillGrid(homePlayers, lineup.home?.startXI   || []);
  fillGrid(homeSubs,    lineup.home?.substitutes || []);
  fillGrid(awayPlayers, lineup.away?.startXI   || []);
  fillGrid(awaySubs,    lineup.away?.substitutes || []);

  // Restore pick indicator if scorer already chosen
  if (currentScorer) {
    const indicator = document.getElementById('fgs-pick-indicator');
    const pickName  = document.getElementById('fgs-pick-name');
    if (indicator) indicator.style.display = 'flex';
    if (pickName)  pickName.textContent = currentScorer;
  }
}

function _selectPlayerChip(playerName, chipEl) {
  // Update hidden input
  const scorerInput = document.getElementById('scorer-select');
  if (scorerInput) scorerInput.value = playerName;

  // Update chip styles — deselect all, select clicked
  document.querySelectorAll('.player-chip').forEach(c => c.classList.remove('selected-player'));
  if (chipEl) chipEl.classList.add('selected-player');

  // Show pick indicator
  const indicator = document.getElementById('fgs-pick-indicator');
  const pickName  = document.getElementById('fgs-pick-name');
  if (indicator) indicator.style.display = 'flex';
  if (pickName)  pickName.textContent = playerName;
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
  // Deselect all player chips
  document.querySelectorAll('.player-chip').forEach(c => c.classList.remove('selected-player'));
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
      // Banner text remains 'Spin Now' as requested
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

// startLiveSimulation removed — Live Pulse now uses real prediction data
// from /api/matches/pulse (see _loadLivePulse)


function shareTrophy(el) {
  const trophyName = el.getAttribute ? el.getAttribute('data-name') : el;
  const trophyIcon = el.getAttribute ? el.getAttribute('data-icon') : arguments[1];
  const userId = el.getAttribute ? el.getAttribute('data-userid') : '';
  
  const refText = userId ? '\n\nSign up with my invite link:' : '';
  const refUrl = userId ? `${window.location.origin}/register?ref=${userId}` : window.location.origin;
  
  const text = encodeURIComponent('I just unlocked the "' + trophyName + '" trophy on Matchkoo! ' + trophyIcon + ' Come join me and predict football matches for XP prizes!' + refText);
  const url = encodeURIComponent(refUrl);
  const twitterUrl = 'https://twitter.com/intent/tweet?text=' + text + '&url=' + url;
  const facebookUrl = 'https://www.facebook.com/sharer/sharer.php?u=' + url;
  const share = document.createElement('div');
  share.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:9999;background:#0F1520;border:1px solid rgba(255,255,255,0.1);border-radius:20px;padding:28px 32px;text-align:center;min-width:280px;box-shadow:0 32px 80px rgba(0,0,0,0.5)';
  share.innerHTML = '<div style="font-size:2.5rem;margin-bottom:8px">' + trophyIcon + '</div>' +
    '<div style="font-weight:800;color:#fff;margin-bottom:4px">' + trophyName + '</div>' +
    '<div style="color:rgba(255,255,255,0.4);font-size:0.8rem;margin-bottom:20px">Share your achievement!</div>' +
    '<div style="display:flex;gap:10px;justify-content:center">' +
      '<a href="' + facebookUrl + '" target="_blank" style="flex:1;padding:10px;background:#1877F2;color:#fff;border-radius:12px;text-decoration:none;font-weight:700;font-size:0.85rem">Facebook</a>' +
      '<a href="' + twitterUrl + '" target="_blank" style="flex:1;padding:10px;background:#1DA1F2;color:#fff;border-radius:12px;text-decoration:none;font-weight:700;font-size:0.85rem">𝕏 Twitter</a>' +
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
  // startLiveSimulation() removed — now uses real pulse data

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
  'Middlesbrough':      '/images/clubs/middlesbrough.png',
  'West Brom':          'https://media.api-sports.io/football/teams/67.png',
  'Burnley':            'https://media.api-sports.io/football/teams/44.png',
  'Luton Town':         'https://media.api-sports.io/football/teams/1359.png',
  'Derby County':       '/images/clubs/derby_county.png',
  'Norwich City':       'https://media.api-sports.io/football/teams/71.png',
  'Watford':            'https://media.api-sports.io/football/teams/38.png',
  'Swansea City':       '/images/clubs/swansea_city.png',
  'Stoke City':         '/images/clubs/stoke_city.png',
  // ── La Liga ─────────────────────────────────────────────────────
  'Alaves':             'https://media.api-sports.io/football/teams/542.png',
  'Almeria':            'https://media.api-sports.io/football/teams/723.png',
  'Athletic Bilbao':    'https://media.api-sports.io/football/teams/531.png',
  'Atletico Madrid':    '/images/clubs/atletico_madrid.png',
  'Barcelona':          'https://media.api-sports.io/football/teams/529.png',
  'Betis':              'https://media.api-sports.io/football/teams/543.png',
  'Celta Vigo':         'https://media.api-sports.io/football/teams/538.png',
  'Getafe':             'https://media.api-sports.io/football/teams/546.png',
  'Girona':             '/images/clubs/girona.png',
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
  'Málaga':             '/images/clubs/malaga.png',
  'Levante':            'https://media.api-sports.io/football/teams/731.png',
  'Huesca':             'https://media.api-sports.io/football/teams/730.png',
  'Elche':              'https://media.api-sports.io/football/teams/769.png',
  'Deportivo La Coruña':'/images/clubs/deportivo_la_coruna.png',
  'Zaragoza':           '/images/clubs/zaragoza.png',
  'Sporting Gijón':    'https://media.api-sports.io/football/teams/733.png',
  'Tenerife':           'https://media.api-sports.io/football/teams/745.png',
  // ── Serie A ─────────────────────────────────────────────────────
  'AC Milan':           'https://media.api-sports.io/football/teams/489.png',
  'Atalanta':           'https://media.api-sports.io/football/teams/499.png',
  'Bologna':            'https://media.api-sports.io/football/teams/500.png',
  'Cagliari':           'https://media.api-sports.io/football/teams/490.png',
  'Como':               '/images/clubs/como.png',
  'Empoli':             'https://media.api-sports.io/football/teams/511.png',
  'Fiorentina':         'https://media.api-sports.io/football/teams/502.png',
  'Genoa':              '/images/clubs/genoa.png',
  'Inter Milan':        'https://media.api-sports.io/football/teams/505.png',
  'Juventus':           'https://media.api-sports.io/football/teams/496.png',
  'Lazio':              'https://media.api-sports.io/football/teams/487.png',
  'Lecce':              'https://media.api-sports.io/football/teams/867.png',
  'Monza':              'https://media.api-sports.io/football/teams/1579.png',
  'Napoli':             'https://media.api-sports.io/football/teams/492.png',
  'Parma':              '/images/clubs/parma.png',
  'Roma':               'https://media.api-sports.io/football/teams/497.png',
  'Torino':             'https://media.api-sports.io/football/teams/503.png',
  'Udinese':            'https://media.api-sports.io/football/teams/494.png',
  'Venezia':            'https://media.api-sports.io/football/teams/517.png',
  'Verona':             'https://media.api-sports.io/football/teams/504.png',
  'Sassuolo':           'https://media.api-sports.io/football/teams/498.png',
  'Sampdoria':          'https://media.api-sports.io/football/teams/491.png',
  'Spezia':             'https://media.api-sports.io/football/teams/515.png',
  'Salernitana':        'https://media.api-sports.io/football/teams/514.png',
  'Frosinone':          'https://media.api-sports.io/football/teams/512.png',
  'Cremonese':          'https://media.api-sports.io/football/teams/493.png',
  'Palermo':            '/images/clubs/palermo.png',
  'Benevento':          'https://media.api-sports.io/football/teams/844.png',
  'Brescia':            'https://media.api-sports.io/football/teams/519.png',
  'Pisa':               'https://media.api-sports.io/football/teams/507.png',
  'Ascoli':             'https://media.api-sports.io/football/teams/509.png',
  'Cosenza':            'https://media.api-sports.io/football/teams/521.png',
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
  'Heidenheim':         '/images/clubs/heidenheim.png',
  'St. Pauli':          'https://media.api-sports.io/football/teams/186.png',
  'Holstein Kiel':      '/images/clubs/holstein_kiel.png',
  'Hamburger SV':       '/images/clubs/hamburger_sv.png',
  'Hamburg':            '/images/clubs/hamburger_sv.png',
  'Schalke 04':         '/images/clubs/schalke_04.png',
  'Hertha Berlin':      'https://media.api-sports.io/football/teams/159.png',
  'FC Köln':            'https://media.api-sports.io/football/teams/192.png',
  'Hannover 96':        '/images/clubs/hannover_96.png',
  'Fortuna Düsseldorf': '/images/clubs/fortuna_dusseldorf.png',
  'Nürnberg':           'https://media.api-sports.io/football/teams/188.png',
  'Darmstadt 98':       '/images/clubs/darmstadt_98.png',
  'Kaiserslautern':     '/images/clubs/kaiserslautern.png',
  'Greuther Fürth':     'https://media.api-sports.io/football/teams/1049.png',
  'Paderborn':          '/images/clubs/paderborn.png',
  'Karlsruhe':          '/images/clubs/karlsruher_sc.png',
  'Arminia Bielefeld':  '/images/clubs/arminia_bielefeld.png',
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
  'Brest':              '/images/clubs/brest.png',
  'Reims':              'https://media.api-sports.io/football/teams/93.png',
  'Toulouse':           'https://media.api-sports.io/football/teams/96.png',
  'Le Havre':           '/images/clubs/le_havre.png',
  'Montpellier':        'https://media.api-sports.io/football/teams/82.png',
  'Angers':             'https://media.api-sports.io/football/teams/77.png',
  'Auxerre':            '/images/clubs/auxerre.png',
  'Saint-Etienne':      '/images/clubs/saint_etienne.png',
  'Lorient':            '/images/clubs/lorient.png',
  'Metz':               '/images/clubs/metz.png',
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
  // ── Egyptian Premier League ──────────────────────────────────────────
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
  'Modern Sport FC':    '/images/clubs/modern_sport_fc.png',
  'Wadi Degla':         'https://media.api-sports.io/football/teams/2287.png',
  'Ghazl El Mahalla':   '/images/clubs/ghazl_el_mahalla.png',
  'National Bank':      '/images/clubs/national_bank.png',
  'Al Masry':           '/images/clubs/al_masry.png',
  'ZED FC':             '/images/clubs/zed_fc.png',
  'Petrojet FC':        '/images/clubs/petrojet_fc.png',
  'El Mokawloon':       'https://media.api-sports.io/football/teams/637.png',
  'El Entag El Harby':  'https://media.api-sports.io/football/teams/638.png',
  'El Gouna FC':        'https://media.api-sports.io/football/teams/2288.png',

  // ── South African PSL ─────────────────────────────────────────────────
  'Mamelodi Sundowns':   'https://media.api-sports.io/football/teams/2699.png',
  'Kaizer Chiefs':       '/images/clubs/kaizer_chiefs.png',
  'Orlando Pirates':     '/images/clubs/orlando_pirates.png',
  'Cape Town City':      '/images/clubs/cape_town_city.png',
  'AmaZulu':             '/images/clubs/amazulu.png',
  'Golden Arrows':       '/images/clubs/golden_arrows.png',
  'Stellenbosch FC':     '/images/clubs/stellenbosch.png',
  'Durban City FC':      '/images/clubs/durban_city.png',
  // ── Morocco Botola Pro ────────────────────────────────────────────
  'Wydad AC':            'https://media.api-sports.io/football/teams/968.png',
  'Raja CA':             '/images/clubs/raja_ca.png',
  'AS FAR':              '/images/clubs/as_far.png',
  'Moghreb Tétouan':     '/images/clubs/moghreb_tetouan.png',
  'Hassania Agadir':     '/images/clubs/hassania_agadir.png',
  'Difaa El Jadidi':     '/images/clubs/difaa_el_jadidi.png',
  'Olympique Khouribga': '/images/clubs/olympique_khouribga.png',
  'Ittihad Tanger':      '/images/clubs/ittihad_tanger.png',
  'FUS Rabat':           '/images/clubs/fus_rabat.png',
  'MAS Fès':             '/images/clubs/mas_fes.png',
  'Renaissance Berkane': '/images/clubs/rs_berkane.png',
  'RS Berkane':          '/images/clubs/rs_berkane.png',
  'Rapide Oued Zem':     'https://media.api-sports.io/football/teams/8159.png',
  'Chabab Rif':          'https://media.api-sports.io/football/teams/8160.png',
  'Youssoufia Berrechid': '/images/clubs/youssoufia_berrechid.png',
  'Maghreb Fès':         'https://media.api-sports.io/football/teams/8162.png',
  // ── Algeria Ligue 1 ───────────────────────────────────────────────────
  'USM Alger':           '/images/clubs/usm_alger.png',
  'MC Alger':            '/images/clubs/mc_alger.png',
  'CR Belouizdad':       '/images/clubs/cr_belouizdad.png',
  'JS Kabylie':          '/images/clubs/js_kabylie.png',
  'ES Sétif':            '/images/clubs/es_setif.png',
  'MC Oran':             '/images/clubs/mc_oran.png',
  'NA Hussein Dey':      '/images/clubs/na_hussein_dey.png',
  'USM Bel Abbès':       '/images/clubs/usm_bel_abbes.png',
  'ASO Chlef':           'https://media.api-sports.io/football/teams/8358.png',
  'CS Constantine':      'https://media.api-sports.io/football/teams/8359.png',
  "AS Aïn M'lila":      '/images/clubs/as_ain_mlila.png',
  'Paradou AC':          '/images/clubs/paradou_ac.png',
  'DRB Tadjenanet':      '/images/clubs/drb_tadjenanet.png',
  'RC Relizane':         'https://media.api-sports.io/football/teams/8364.png',
  'NC Magra':            'https://media.api-sports.io/football/teams/8365.png',
  // ── Tunisia Ligue 1 ───────────────────────────────────────────────────
  'Espérance ST':        '/images/clubs/esperance_st.png',
  'Étoile Sahel':        '/images/clubs/etoile_sahel.png',
  'Club Africain':       '/images/clubs/club_africain.png',
  'CS Sfaxien':          '/images/clubs/cs_sfaxien.png',
  'CA Bizertin':         '/images/clubs/ca_bizertin.png',
  'AS Gabès':            '/images/clubs/as_gabes.png',
  'US Ben Guerdane':     'https://media.api-sports.io/football/teams/8760.png',
  'US Monastir':         '/images/clubs/us_monastir.png',
  'AS Soliman':          '/images/clubs/as_soliman.png',
  'US Tataouine':        '/images/clubs/us_tataouine.png',
  'Stade Tunisien':      '/images/clubs/stade_tunisien.png',
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
  'Modern Sport FC':    '/images/clubs/modern_sport_fc.png',
  'Wadi Degla':         'https://media.api-sports.io/football/teams/2287.png',
  'Ghazl El Mahalla':   '/images/clubs/ghazl_el_mahalla.png',
  'National Bank':      '/images/clubs/national_bank.png',
  'Al Masry':           '/images/clubs/al_masry.png',
  'ZED FC':             '/images/clubs/zed_fc.png',
  'Petrojet FC':        '/images/clubs/petrojet_fc.png',
  // ── Saudi Pro League ─────────────────────────────────────────────────
  'Al Hilal':             'https://media.api-sports.io/football/teams/2932.png',
  'Al Nassr':             '/images/clubs/al_nassr.png',
  'Al Ittihad':           '/images/clubs/al_ittihad.png',
  'Al Ahli':              '/images/clubs/al_ahli.png',
  'Al Ettifaq':           '/images/clubs/al_ettifaq.png',
  'Al Fateh':             '/images/clubs/al_fateh.png',
  'Al Shabab':            'https://media.api-sports.io/football/teams/2940.png',
  'Al Qadsiah':           '/images/clubs/al_qadsiah.png',
  'Al Taawoun':           '/images/clubs/al_taawoun.png',
  'Al Khaleej':           '/images/clubs/al_khaleej.png',
  'Damac':                '/images/clubs/damac.png',
  'Al Wehda':             '/images/clubs/al_wehda.png',
  'Al Fayha':             '/images/clubs/al_fayha.png',
  'Al Hazem':             '/images/clubs/al_hazem.png',
  'Al Tai':               '/images/clubs/al_tai.png',
  // ── J1 League Japan ──────────────────────────────────────────────────
  'FC Tokyo':                   'https://media.api-sports.io/football/teams/292.png',
  'Gamba Osaka':                'https://media.api-sports.io/football/teams/293.png',
  'Kashima Antlers':            'https://media.api-sports.io/football/teams/290.png',
  'Kawasaki Frontale':          'https://media.api-sports.io/football/teams/294.png',
  'Sanfrecce Hiroshima':        'https://media.api-sports.io/football/teams/282.png',
  'Urawa Red Diamonds':         'https://media.api-sports.io/football/teams/287.png',
  'Vissel Kobe':                'https://media.api-sports.io/football/teams/289.png',
  'Yokohama F. Marinos':        'https://media.api-sports.io/football/teams/296.png',
  // ── UAE Pro League ───────────────────────────────────────────────────
  'Al Ain':               '/images/clubs/al_ain.png',
  'Al Wasl':              '/images/clubs/al_wasl.png',
  'Sharjah FC':           'https://media.api-sports.io/football/teams/2950.png',
  'Al Jazira':            '/images/clubs/al_jazira.png',
  'Al Wahda':             '/images/clubs/al_wahda.png',
  'Shabab Al Ahli':       '/images/clubs/shabab_al_ahli.png',
  'Baniyas':              '/images/clubs/baniyas.png',
  'Al Dhafra':            '/images/clubs/al_dhafra.png',
  'Ajman':                '/images/clubs/ajman.png',
  'Emirates Club':        '/images/clubs/emirates_club.png',
  'Al Nasr':              '/images/clubs/al_nasr.png',
  // ── MLS ──────────────────────────────────────────────────────────────

  'Atlanta United':           'https://media.api-sports.io/football/teams/1596.png',
  'Atlanta United FC':        'https://media.api-sports.io/football/teams/1596.png',
  'D.C. United':              'https://media.api-sports.io/football/teams/1617.png',
  'Inter Miami':              '/images/clubs/inter_miami.png',
  'Inter Miami CF':           '/images/clubs/inter_miami.png',
  'LA Galaxy':                'https://media.api-sports.io/football/teams/1600.png',
  'LAFC':                     'https://media.api-sports.io/football/teams/1594.png',
  'Los Angeles FC (LAFC)':    'https://media.api-sports.io/football/teams/1594.png',
  'New York City FC':         'https://media.api-sports.io/football/teams/1599.png',
  'Portland Timbers':         'https://media.api-sports.io/football/teams/1604.png',
  'Seattle Sounders':         'https://media.api-sports.io/football/teams/1602.png',
  'Seattle Sounders FC':      'https://media.api-sports.io/football/teams/1602.png',
  // ── Brasileirão Série A ───────────────────────────────────────────────
  'Flamengo':                 'https://media.api-sports.io/football/teams/127.png',
  'Palmeiras':                'https://media.api-sports.io/football/teams/121.png',
  'Atlético Mineiro':         'https://media.api-sports.io/football/teams/1062.png',
  'Fluminense':               '/images/clubs/fluminense.png',
  'São Paulo':                'https://media.api-sports.io/football/teams/126.png',
  'Corinthians':              'https://media.api-sports.io/football/teams/131.png',
  'Grêmio':                   '/images/clubs/gremio.png',
  'Internacional':            'https://media.api-sports.io/football/teams/119.png',
  'Santos':                   '/images/clubs/santos.png',
  'Vasco da Gama':            'https://media.api-sports.io/football/teams/133.png',
  'Botafogo':                 '/images/clubs/botafogo.png',
  'Cruzeiro':                 '/images/clubs/cruzeiro.png',
  // ── Liga Profesional Argentina ────────────────────────────────────────
  'Boca Juniors':             '/images/clubs/boca_juniors.png',
  'River Plate':              'https://media.api-sports.io/football/teams/435.png',
  'Racing Club':              'https://media.api-sports.io/football/teams/436.png',
  'Independiente':            '/images/clubs/independiente.png',
  'San Lorenzo':              '/images/clubs/san_lorenzo.png',
  'Estudiantes':              '/images/clubs/estudiantes.png',
  'Huracán':                  'https://media.api-sports.io/football/teams/445.png',
  'Lanus':                    '/images/clubs/lanus.png',
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
    'Espanyol','Cádiz','Málaga','Levante',
    'Elche','Deportivo La Coruña','Zaragoza'
  ]},
  'Serie A': { country: 'Italy', flag: '🇮🇹', continent: 'europe', clubs: [
    'AC Milan','Atalanta','Bologna','Cagliari','Como',
    'Empoli','Fiorentina','Genoa','Inter Milan','Juventus',
    'Lazio','Lecce','Monza','Napoli','Parma',
    'Roma','Torino','Udinese','Venezia','Verona',
    'Sassuolo','Sampdoria','Spezia','Salernitana','Frosinone',
    'Palermo'
  ]},
  'Bundesliga': { country: 'Germany', flag: '🇩🇪', continent: 'europe', clubs: [
    'Augsburg','Bayer Leverkusen','Bayern Munich','Borussia Dortmund','Borussia Mönchengladbach',
    'Eintracht Frankfurt','Freiburg','Hamburger SV','Heidenheim','Hoffenheim',
    'Mainz','RB Leipzig','St. Pauli','Stuttgart','Union Berlin',
    'Werder Bremen','Wolfsburg','Bochum','Holstein Kiel','FC Köln',
    'Schalke 04','Hertha Berlin','Hannover 96','Fortuna Düsseldorf',
    'Darmstadt 98','Kaiserslautern','Paderborn','Karlsruhe',
    'Arminia Bielefeld'
  ]},
  'Ligue 1': { country: 'France', flag: '🇫🇷', continent: 'europe', clubs: [
    'PSG','Monaco','Marseille','Lyon','Lille',
    'Nice','Lens','Rennes','Strasbourg',
    'Montpellier','Nantes','Le Havre','Auxerre',
    'Angers','Saint-Etienne','Brest','Lorient','Metz',
    'Bordeaux'
  ]},

  // ── AFRICA ──────────────────────────────────────────────────────
  'Egyptian Premier League': { country: 'Egypt', flag: '🇪🇬', continent: 'africa', clubs: [
    'Al Ahly','Al Masry','El Mokawloon','Ceramica Cleopatra',
    'El Geish','El Gouna FC','ENPPI','Modern Sport FC',
    'Haras El Hodood','Ismaily','Ittihad Alexandria','National Bank','Pyramids FC',
    'Smouha','Wadi Degla','Zamalek','Ghazl El Mahalla',
    'ZED FC','Petrojet FC','Pharco'
  ]},
  'South African PSL': { country: 'South Africa', flag: '🇿🇦', continent: 'africa', clubs: [
    'Mamelodi Sundowns','Kaizer Chiefs','Orlando Pirates','Cape Town City',
    'AmaZulu','Stellenbosch FC','Golden Arrows','Durban City FC'
  ]},
  'Botola Pro (Morocco)': { country: 'Morocco', flag: '🇲🇦', continent: 'africa', clubs: [
    'Wydad AC','Raja CA','RS Berkane','AS FAR',
    'Moghreb Tétouan','Olympique Khouribga','Hassania Agadir','Difaa El Jadidi',
    'Ittihad Tanger','FUS Rabat','MAS Fès',
    'Youssoufia Berrechid'
  ]},
  'Ligue 1 (Algeria)': { country: 'Algeria', flag: '🇩🇿', continent: 'africa', clubs: [
    'USM Alger','MC Alger','CR Belouizdad','JS Kabylie',
    'ES Sétif','MC Oran','NA Hussein Dey','USM Bel Abbès',
    'AS Aïn M\'lila','Paradou AC','DRB Tadjenanet'
  ]},
  'Ligue 1 (Tunisia)': { country: 'Tunisia', flag: '🇹🇳', continent: 'africa', clubs: [
    'Espérance ST','Club Africain','Étoile Sahel','CS Sfaxien',
    'CA Bizertin','US Monastir','AS Soliman','US Tataouine',
    'AS Gabès','Stade Tunisien','Olympique Béja'
  ]},
  'Saudi Pro League': { country: 'Saudi Arabia', flag: '🇸🇦', continent: 'asia', clubs: [
    'Al Hilal','Al Nassr','Al Ittihad','Al Ahli','Al Ettifaq',
    'Al Fateh','Al Shabab','Al Qadsiah','Al Taawoun','Al Khaleej',
    'Damac','Al Wehda','Al Fayha','Al Hazem','Al Tai'
  ]},
  'J1 League (Japan)': { country: 'Japan', flag: '🇯🇵', continent: 'asia', clubs: [
    'FC Tokyo', 'Gamba Osaka', 'Kashima Antlers', 'Kawasaki Frontale',
    'Sanfrecce Hiroshima', 'Urawa Red Diamonds', 'Vissel Kobe', 'Yokohama F. Marinos'
  ]},
  'UAE Pro League': { country: 'UAE', flag: '🇦🇪', continent: 'asia', clubs: [
    'Al Ain','Al Wasl','Sharjah FC','Al Jazira','Al Wahda',
    'Shabab Al Ahli','Baniyas','Al Dhafra','Ajman','Emirates Club',
    'Al Nasr'
  ]},
  // ── AMERICAS ───────────────────────────────────────────────────
  'Brasileirão Série A': { country: 'Brazil', flag: '🇧🇷', continent: 'americas', clubs: [
    'Flamengo','Palmeiras','Atlético Mineiro','Fluminense','São Paulo',
    'Corinthians','Grêmio','Internacional','Santos','Vasco da Gama',
    'Botafogo','Cruzeiro'
  ]},
  'Liga Profesional (Argentina)': { country: 'Argentina', flag: '🇦🇷', continent: 'americas', clubs: [
    'Boca Juniors','River Plate','Racing Club','Independiente','San Lorenzo',
    'Estudiantes','Huracán','Lanus'
  ]},
  'MLS': { country: 'USA', flag: '🇺🇸', continent: 'americas', clubs: [
    'Atlanta United FC',
    'D.C. United',
    'Inter Miami CF',
    'LA Galaxy',
    'Los Angeles FC (LAFC)',
    'New York City FC',
    'Portland Timbers',
    'Seattle Sounders FC'
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
  'MLS', 'Brasileirão Série A', 'Liga Profesional (Argentina)',
  'Saudi Pro League', 'J1 League (Japan)', 'UAE Pro League',
  'FIFA World Cup'
]);

async function ensureClubLogosLoaded() {
  if (Object.keys(clubLogosMap).length > 0) return;
  try {
    const res = await fetch('/api/clubs/logos');
    if (res.ok) {
      clubLogosMap = await res.json();
    }
    // Merge static fallback logos — Local overrides take priority, DB logos next, https static last
    Object.entries(STATIC_LOGO_MAP).forEach(([club, url]) => {
      if (!clubLogosMap[club] || url.startsWith('/images/')) clubLogosMap[club] = url;
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
  
  const targetCont = state.targetVoteContinent || 'europe';
  state.targetVoteContinent = null;
  selectVoteContinent(targetCont);
  loadClubLeaderboard('alltime');
  loadContinentLeaderboards('alltime');
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
  renderContinentLeaderboards();
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
      let clickHandler = 'confirmVote(this)';
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
         '<span style="opacity:0.45;font-size:0.65rem;font-weight:600">+20 XP</span>') +
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
      '<div style="margin-top:16px;padding-top:12px;border-top:1px solid rgba(255,255,255,0.05);text-align:center;">' +
        '<button onclick="openMissingClubModal(\'' + league.replace(/'/g,"\\'") + '\',\'' + data.continent + '\')" style="background:none;border:none;color:rgba(255,255,255,0.3);font-size:0.75rem;cursor:pointer;font-family:inherit;padding:4px 8px;border-radius:8px;transition:color 0.2s;" onmouseover="this.style.color=\'rgba(255,255,255,0.6)\'" onmouseout="this.style.color=\'rgba(255,255,255,0.3)\'">🔍 Can\'t find your favourite club?</button>' +
      '</div>' +
    '</div>';
  }).join('');
}

function openMissingClubModal(league, continent) {
  const existing = document.getElementById('missing-club-modal');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'missing-club-modal';
  modal.style.cssText = 'position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;';
  modal.innerHTML = `
    <div style="position:absolute;inset:0;background:rgba(0,0,0,0.65);backdrop-filter:blur(6px);" onclick="document.getElementById('missing-club-modal').remove()"></div>
    <div style="position:relative;background:linear-gradient(135deg,#0f1923,#131e2b);border:1px solid rgba(255,255,255,0.12);border-radius:24px;padding:32px 28px;max-width:380px;width:100%;box-shadow:0 32px 80px rgba(0,0,0,0.6);animation:voteModalIn 0.25s cubic-bezier(0.34,1.56,0.64,1);">
      <div style="margin-bottom:24px;">
        <div style="font-size:1.5rem;margin-bottom:8px;">🔍</div>
        <div style="font-size:1.2rem;font-weight:900;color:#fff;margin-bottom:6px;">Missing Club?</div>
        <div style="font-size:0.82rem;color:rgba(255,255,255,0.45);line-height:1.5;">Tell us which club you'd like to vote for and we'll add it in the next update!</div>
      </div>

      <div style="display:flex;flex-direction:column;gap:14px;margin-bottom:24px;">
        <div>
          <label style="font-size:0.65rem;font-weight:700;color:rgba(255,255,255,0.4);letter-spacing:0.08em;display:block;margin-bottom:6px;">CLUB NAME *</label>
          <input id="missing-club-name" type="text" placeholder="e.g. Zamalek SC" maxlength="100"
            style="width:100%;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);border-radius:12px;padding:12px 14px;color:#fff;font-size:0.9rem;font-family:inherit;box-sizing:border-box;outline:none;transition:border-color 0.2s;"
            onfocus="this.style.borderColor='rgba(41,191,18,0.5)'" onblur="this.style.borderColor='rgba(255,255,255,0.1)'">
        </div>
        <div>
          <label style="font-size:0.65rem;font-weight:700;color:rgba(255,255,255,0.4);letter-spacing:0.08em;display:block;margin-bottom:6px;">LEAGUE / COUNTRY <span style="opacity:0.5">(optional)</span></label>
          <input id="missing-club-league" type="text" placeholder="e.g. Egyptian Premier League" maxlength="100"
            value="${league === 'FIFA World Cup' ? '' : league}"
            style="width:100%;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);border-radius:12px;padding:12px 14px;color:#fff;font-size:0.9rem;font-family:inherit;box-sizing:border-box;outline:none;transition:border-color 0.2s;"
            onfocus="this.style.borderColor='rgba(41,191,18,0.5)'" onblur="this.style.borderColor='rgba(255,255,255,0.1)'">
        </div>
      </div>

      <div id="missing-club-feedback" style="display:none;margin-bottom:16px;padding:10px 14px;border-radius:12px;font-size:0.82rem;font-weight:600;"></div>

      <div style="display:flex;gap:10px;">
        <button onclick="document.getElementById('missing-club-modal').remove()"
          style="flex:1;padding:13px;border-radius:14px;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.05);color:rgba(255,255,255,0.6);font-size:0.9rem;font-weight:700;cursor:pointer;font-family:inherit;"
          onmouseover="this.style.background='rgba(255,255,255,0.1)'" onmouseout="this.style.background='rgba(255,255,255,0.05)'">
          Cancel
        </button>
        <button onclick="_submitMissingClub('${continent}')"
          id="missing-club-submit-btn"
          style="flex:2;padding:13px;border-radius:14px;border:none;background:linear-gradient(135deg,#1a3a4a,#1e4a5a);color:#7dd3fc;font-size:0.9rem;font-weight:900;cursor:pointer;font-family:inherit;box-shadow:0 4px 20px rgba(0,100,200,0.25);transition:all 0.2s;"
          onmouseover="this.style.transform='translateY(-1px)'" onmouseout="this.style.transform='translateY(0)'">
          🔍 Submit Request
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  setTimeout(() => { const inp = document.getElementById('missing-club-name'); if (inp) inp.focus(); }, 100);
}

async function _submitMissingClub(continent) {
  const nameEl   = document.getElementById('missing-club-name');
  const leagueEl = document.getElementById('missing-club-league');
  const feedback = document.getElementById('missing-club-feedback');
  const submitBtn= document.getElementById('missing-club-submit-btn');

  const clubName   = (nameEl?.value || '').trim();
  const leagueHint = (leagueEl?.value || '').trim();

  if (!clubName || clubName.length < 2) {
    feedback.style.display = 'block';
    feedback.style.background = 'rgba(255,68,68,0.1)';
    feedback.style.border = '1px solid rgba(255,68,68,0.25)';
    feedback.style.color = '#f87171';
    feedback.textContent = '⚠️ Please enter a club name (at least 2 characters).';
    return;
  }

  submitBtn.textContent = 'Submitting…';
  submitBtn.disabled = true;

  try {
    const res = await fetch('/api/clubs/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clubName, leagueHint, continent }),
    });
    if (res.ok) {
      feedback.style.display = 'block';
      feedback.style.background = 'rgba(41,191,18,0.1)';
      feedback.style.border = '1px solid rgba(41,191,18,0.25)';
      feedback.style.color = '#6FE840';
      feedback.textContent = '✅ Thanks! We\'ll review your request and add ' + clubName + ' soon.';
      submitBtn.style.display = 'none';
      setTimeout(() => { const m = document.getElementById('missing-club-modal'); if (m) m.remove(); }, 2200);
    } else {
      throw new Error('Server error');
    }
  } catch(e) {
    feedback.style.display = 'block';
    feedback.style.background = 'rgba(255,68,68,0.1)';
    feedback.style.border = '1px solid rgba(255,68,68,0.25)';
    feedback.style.color = '#f87171';
    feedback.textContent = '❌ Something went wrong. Please try again.';
    submitBtn.textContent = '🔍 Submit Request';
    submitBtn.disabled = false;
  }
}

function confirmVote(el) {
  const clubName  = el.getAttribute('data-club');
  const country   = el.getAttribute('data-country');
  const continent = el.getAttribute('data-continent');
  const league    = el.getAttribute('data-league');
  const logoUrl   = clubLogosMap[clubName] || '';
  const colours   = ['#e63946','#457b9d','#2a9d8f','#e9c46a','#f4a261','#6a0572','#1982c4','#8ac926','#ff595e','#6a0572'];
  const badgeBg   = colours[clubName.charCodeAt(0) % colours.length];
  const initials  = clubName.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase();

  const logoHtml = logoUrl
    ? `<img src="${logoUrl}" alt="${clubName}" style="width:72px;height:72px;object-fit:contain;border-radius:50%;" onerror="this.style.display='none';this.nextSibling.style.display='flex'"><span style="display:none;width:72px;height:72px;border-radius:50%;background:${badgeBg};align-items:center;justify-content:center;font-size:26px;font-weight:900;color:#fff">${initials}</span>`
    : `<span style="width:72px;height:72px;border-radius:50%;background:${badgeBg};display:flex;align-items:center;justify-content:center;font-size:26px;font-weight:900;color:#fff">${initials}</span>`;

  // Remove any existing modal
  const existing = document.getElementById('vote-confirm-modal');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'vote-confirm-modal';
  modal.style.cssText = 'position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;';
  modal.innerHTML = `
    <div style="position:absolute;inset:0;background:rgba(0,0,0,0.65);backdrop-filter:blur(6px);" onclick="document.getElementById('vote-confirm-modal').remove()"></div>
    <div style="position:relative;background:linear-gradient(135deg,#0f1923,#131e2b);border:1px solid rgba(255,255,255,0.12);border-radius:24px;padding:32px 28px;max-width:360px;width:100%;box-shadow:0 32px 80px rgba(0,0,0,0.6);animation:voteModalIn 0.25s cubic-bezier(0.34,1.56,0.64,1);">
      <div style="text-align:center;margin-bottom:24px;">
        <div style="display:flex;justify-content:center;margin-bottom:16px;">
          <div style="position:relative;width:80px;height:80px;border-radius:50%;background:rgba(41,191,18,0.1);border:2px solid rgba(41,191,18,0.3);display:flex;align-items:center;justify-content:center;overflow:hidden;">
            ${logoHtml}
          </div>
        </div>
        <div style="font-size:1.4rem;font-weight:900;color:#fff;margin-bottom:6px;">${clubName}</div>
        <div style="font-size:0.8rem;color:rgba(255,255,255,0.45);font-weight:600;text-transform:uppercase;letter-spacing:1px;">${league}</div>
      </div>

      <div style="background:rgba(41,191,18,0.08);border:1px solid rgba(41,191,18,0.2);border-radius:14px;padding:14px 16px;margin-bottom:24px;display:flex;align-items:center;gap:12px;">
        <span style="font-size:1.5rem;">❤️</span>
        <div>
          <div style="font-size:0.9rem;font-weight:800;color:#fff;">Confirm Your Vote</div>
          <div style="font-size:0.78rem;color:rgba(255,255,255,0.5);margin-top:2px;">You'll earn <span style="color:#29bf12;font-weight:700;">+20 XP</span> for this vote. One vote per league per day.</div>
        </div>
      </div>

      <div style="display:flex;gap:10px;">
        <button onclick="document.getElementById('vote-confirm-modal').remove()"
          style="flex:1;padding:13px;border-radius:14px;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.05);color:rgba(255,255,255,0.6);font-size:0.9rem;font-weight:700;cursor:pointer;font-family:inherit;transition:all 0.2s;"
          onmouseover="this.style.background='rgba(255,255,255,0.1)'" onmouseout="this.style.background='rgba(255,255,255,0.05)'">
          Cancel
        </button>
        <button onclick="document.getElementById('vote-confirm-modal').remove();castVote({getAttribute:k=>({'data-club':'${clubName.replace(/'/g,"\\'")}','data-country':'${country.replace(/'/g,"\\'")}','data-continent':'${continent}','data-league':'${league.replace(/'/g,"\\'")}'}[k])})"
          style="flex:2;padding:13px;border-radius:14px;border:none;background:linear-gradient(135deg,#29bf12,#3cde1a);color:#0a1a06;font-size:0.9rem;font-weight:900;cursor:pointer;font-family:inherit;box-shadow:0 4px 20px rgba(41,191,18,0.4);transition:all 0.2s;"
          onmouseover="this.style.transform='translateY(-1px)';this.style.boxShadow='0 6px 24px rgba(41,191,18,0.55)'" onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='0 4px 20px rgba(41,191,18,0.4)'">
          ❤️ Vote for ${clubName}
        </button>
      </div>
    </div>
    <style>
      @keyframes voteModalIn {
        from { opacity:0; transform:scale(0.85) translateY(20px); }
        to   { opacity:1; transform:scale(1) translateY(0); }
      }
    </style>
  `;

  document.body.appendChild(modal);
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
      showNotification('+20 XP! Voted for ' + clubName, 'success');
      renderVoteLeagues();
      loadClubLeaderboard(state.voteLeaderboardPeriod || 'alltime');
      loadContinentLeaderboards(state.continentLeaderboardPeriod || 'alltime');
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
  document.querySelectorAll('.vote-period-tab').forEach(t => {
    t.classList.remove('active');
    t.style.border = '1px solid rgba(255,255,255,0.12)';
    t.style.background = 'transparent';
    t.style.color = 'rgba(255,255,255,0.5)';
  });
  
  const activeTab = document.getElementById('vote-tab-' + period);
  if (activeTab) {
    activeTab.classList.add('active');
    activeTab.style.border = '1px solid var(--green)';
    activeTab.style.background = 'rgba(60,184,46,0.1)';
    activeTab.style.color = 'var(--green)';
  }

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
  container.innerHTML = data.slice(0, 10).map((club, i) =>
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

async function loadContinentLeaderboards(period) {
  state.continentLeaderboardPeriod = period;
  document.querySelectorAll('.cont-period-tab').forEach(t => {
    t.classList.remove('active');
    t.style.border = 'none';
    t.style.background = 'transparent';
    t.style.color = 'rgba(255,255,255,0.5)';
  });
  
  const activeTab = document.getElementById('cont-tab-' + period);
  if (activeTab) {
    activeTab.classList.add('active');
    activeTab.style.border = '1px solid var(--green)';
    activeTab.style.background = 'rgba(60,184,46,0.1)';
    activeTab.style.color = 'var(--green)';
  }

  try {
    const res = await fetch('/api/clubs/leaderboard?group=continents&period=' + period);
    const data = res.ok ? await res.json() : {};
    state.continentRankingsData = data;
    renderContinentLeaderboards();
  } catch(e) {
    state.continentRankingsData = {};
    renderContinentLeaderboards();
  }
}

function renderContinentLeaderboards() {
  const container = document.getElementById('continent-leaderboards-container');
  if (!container) return;

  const data = state.continentRankingsData || {};
  const cont = currentVoteContinent || 'europe';

  const continentMeta = {
    'europe': { title: 'Europe', emoji: '🇪🇺', bg: 'linear-gradient(135deg, rgba(29, 78, 216, 0.05), rgba(30, 64, 175, 0.12))', border: 'rgba(59, 130, 246, 0.15)' },
    'africa': { title: 'Africa', emoji: '🌍', bg: 'linear-gradient(135deg, rgba(4, 120, 87, 0.05), rgba(6, 95, 70, 0.12))', border: 'rgba(16, 185, 129, 0.15)' },
    'americas': { title: 'Americas', emoji: '🌎', bg: 'linear-gradient(135deg, rgba(109, 40, 217, 0.05), rgba(91, 33, 182, 0.12))', border: 'rgba(139, 92, 246, 0.15)' },
    'asia': { title: 'Asia', emoji: '🌏', bg: 'linear-gradient(135deg, rgba(185, 28, 28, 0.05), rgba(153, 27, 27, 0.12))', border: 'rgba(239, 68, 68, 0.15)' },
    'oceania': { title: 'Oceania', emoji: '🇳🇿', bg: 'linear-gradient(135deg, rgba(13, 148, 136, 0.05), rgba(17, 94, 89, 0.12))', border: 'rgba(20, 184, 166, 0.15)' },
    'world': { title: 'International', emoji: '🌎', bg: 'linear-gradient(135deg, rgba(217, 119, 6, 0.05), rgba(180, 83, 9, 0.12))', border: 'rgba(245, 158, 11, 0.15)' }
  };

  const meta = continentMeta[cont] || continentMeta['world'];
  const titleEl = document.getElementById('continent-top10-title');
  if (titleEl) {
    titleEl.innerHTML = '<span style="font-size:1.4rem">' + meta.emoji + '</span> ' + meta.title + ' Top 10 Clubs';
  }

  const clubs = data[cont] || [];
  let html = '';

  if (clubs.length === 0) {
    html = '<div style="text-align:center;color:var(--text-muted);font-size:0.85rem;padding:32px 0;font-style:italic">No votes registered yet in this continent</div>';
  } else {
    html = clubs.map((club, idx) => {
      const logoUrl = clubLogosMap[club.clubName] || '';
      const colours = ['#e63946','#457b9d','#2a9d8f','#e9c46a','#f4a261','#6a0572','#1982c4','#8ac926','#ff595e','#6a0572'];
      const badgeBg = colours[club.clubName.charCodeAt(0) % colours.length];
      const initials = club.clubName.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase();

      const logoHtml = logoUrl
        ? '<img src="' + logoUrl + '" alt="' + club.clubName + '" style="width:28px;height:28px;object-fit:contain;border-radius:50%;" onerror="this.style.display=\'none\';this.nextSibling.style.display=\'flex\'"><span style="display:none;width:28px;height:28px;border-radius:50%;background:' + badgeBg + ';align-items:center;justify-content:center;font-size:11px;font-weight:900;color:#fff">' + initials + '</span>'
        : '<span style="width:28px;height:28px;border-radius:50%;background:' + badgeBg + ';display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:900;color:#fff">' + initials + '</span>';

      const rankIcon = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '#' + (idx + 1);
      const rankColor = idx === 0 ? '#ffd700' : idx === 1 ? '#c0c0c0' : idx === 2 ? '#cd7f32' : 'rgba(255,255,255,0.4)';
      const rankStyle = 'font-weight:800;color:' + rankColor + ';font-size:' + (idx < 3 ? '1.1rem' : '0.8rem') + ';min-width:32px;text-align:center;';

      return '<div style="display:flex;align-items:center;gap:14px;padding:12px 0;border-bottom:1px solid rgba(255,255,255,0.05);">' +
        '<div style="' + rankStyle + '">' + rankIcon + '</div>' +
        '<div style="width:28px;height:28px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">' +
          logoHtml +
        '</div>' +
        '<div style="flex:1;min-width:0;">' +
          '<div style="font-weight:700;color:#fff;font-size:0.9rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="' + club.clubName + '">' +
            club.clubName +
          '</div>' +
          '<div style="font-size:0.72rem;color:rgba(255,255,255,0.4);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' +
            club.country +
          '</div>' +
        '</div>' +
        '<div style="font-weight:800;color:var(--green);font-size:0.85rem;flex-shrink:0;">' +
          club.votes.toLocaleString() + ' <span style="font-size:0.65rem;opacity:0.6;font-weight:600">votes</span>' +
        '</div>' +
      '</div>';
    }).join('');
  }

  const gridStyle = clubs.length === 0
    ? 'display:block;background:var(--bg-card);border:1px solid ' + meta.border + ';border-radius:16px;padding:20px;box-shadow:0 4px 20px rgba(0,0,0,0.15);background-image:' + meta.bg
    : 'display:grid;grid-template-columns:repeat(auto-fit, minmax(260px, 1fr));gap:0 32px;background:var(--bg-card);border:1px solid ' + meta.border + ';border-radius:16px;padding:20px;box-shadow:0 4px 20px rgba(0,0,0,0.15);background-image:' + meta.bg;

  container.innerHTML = '<div style="' + gridStyle + '">' +
    html +
  '</div>';
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

// ─── BOOST MODALS LOGIC ──────────────────────────────────────────

function closeBoostModal() {
  document.getElementById('boost-modal-overlay')?.classList.add('hidden');
}

async function fetchUpcomingPredictedMatches() {
  // Fetch upcoming matches the user has predicted, to apply Joker or Shield
  const res = await fetch('/api/predictions?status=upcoming');
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data) ? data : (data.predictions || []);
}

async function renderBoostMatchSelector(boostType) {
  const content = document.getElementById('boost-modal-content');
  content.innerHTML = '<div style="text-align:center;padding:20px;color:rgba(255,255,255,0.5)">Loading your upcoming predictions...</div>';
  
  const matches = await fetchUpcomingPredictedMatches();
  if (matches.length === 0) {
    content.innerHTML = '<div style="text-align:center;padding:20px;color:rgba(255,255,255,0.5)">You have no upcoming predictions.<br>Make a prediction first to use this boost!</div>';
    return;
  }

  content.innerHTML = '<div style="display:flex;flex-direction:column;gap:12px;">' + matches.map(p => `
    <div style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:12px;padding:16px;display:flex;justify-content:space-between;align-items:center;">
      <div>
        <div style="font-weight:700;font-size:0.95rem;">${p.match.homeTeam} vs ${p.match.awayTeam}</div>
        <div style="font-size:0.8rem;color:rgba(255,255,255,0.5);margin-top:4px;">Your Prediction: ${p.homeScore}-${p.awayScore}</div>
      </div>
      <button onclick="applyBoostToMatch('${p.matchId}', '${boostType}', event)" style="background:#29bf12;color:#fff;border:none;border-radius:8px;padding:8px 16px;font-weight:700;cursor:pointer;">Apply</button>
    </div>
  `).join('') + '</div>';
}

async function applyBoostToMatch(matchId, boostType, event) {
  const boostName = boostType === 'JOKER' ? 'The Joker (2X XP)' : 'Scoreline Shield';
  const color = boostType === 'JOKER' ? '#ff9914' : '#29bf12';
  const icon = boostType === 'JOKER' ? '<span style="font-size: 32px; font-weight: bold; font-family: \'Russo One\', sans-serif; color: #ff9914;">2X</span>' : '<svg viewBox="0 0 24 24" fill="none" stroke="#29bf12" stroke-width="2" width="40" height="40"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>';
  
  const btn = event.currentTarget;
  const originalText = btn.textContent;

  _showBoostConfirmModal({
    title: `Apply ${boostType === 'JOKER' ? 'The Joker' : 'Scoreline Shield'}?`,
    subtitle: `You are applying ${boostName} to this match. You can only use this once per week.`,
    iconHtml: icon,
    color: color,
    onConfirm: async () => {
      btn.textContent = 'Applying...';
      btn.disabled = true;
      try {
        const payload = { matchId };
        if (boostType === 'JOKER') payload.isJoker = true;
        if (boostType === 'SHIELD') payload.isShield = true;

        const res = await fetch('/api/predictions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Failed to apply boost');

        showNotification('Boost successfully applied!', 'success');
        closeBoostModal();
      } catch (err) {
        showNotification(err.message, 'error');
        btn.textContent = originalText;
        btn.disabled = false;
      }
    }
  });
}

function openJokerModal() {
  document.getElementById('boost-modal-title').textContent = 'The Joker';
  document.getElementById('boost-modal-desc').textContent = 'Select an upcoming prediction to apply 2× XP. You can use this once per week.';
  document.getElementById('boost-modal-overlay').classList.remove('hidden');
  renderBoostMatchSelector('JOKER');
}

function openShieldModal() {
  document.getElementById('boost-modal-title').textContent = 'Scoreline Shield';
  document.getElementById('boost-modal-desc').textContent = 'Select an upcoming prediction. If you miss the exact score but get the result right, you still earn full XP. Used once per week.';
  document.getElementById('boost-modal-overlay').classList.remove('hidden');
  renderBoostMatchSelector('SHIELD');
}

// ─── THE DEMON LOGIC ──────────────────────────────────────────────

let _demonLeagues = [];
let _selectedDemonLeague = null;

async function openDemonModal() {
  document.getElementById('boost-modal-title').textContent = 'The Demon 😈';
  document.getElementById('boost-modal-desc').textContent = 'Deduct 500XP from a rival to ruin their ranking. You can only use this once per mini-league.';
  document.getElementById('boost-modal-overlay').classList.remove('hidden');
  
  const content = document.getElementById('boost-modal-content');
  content.innerHTML = '<div style="text-align:center;padding:20px;color:rgba(255,255,255,0.5)">Loading your Mini Leagues...</div>';

  try {
    const res = await fetch('/api/tournaments');
    if (!res.ok) throw new Error('Failed to fetch mini leagues');
    const allTournaments = await res.json();
    _demonLeagues = allTournaments.filter(t => t.registrationMode === 'INVITE_ONLY' && t.userRegistered);
    
    if (_demonLeagues.length === 0) {
      content.innerHTML = '<div style="text-align:center;padding:20px;color:rgba(255,255,255,0.5)">You are not in any mini leagues.</div>';
      return;
    }

    renderDemonLeagueList();
  } catch(e) {
    content.innerHTML = '<div style="color:#e01a4f;text-align:center;padding:20px;">Error loading leagues</div>';
  }
}

function renderDemonLeagueList() {
  const content = document.getElementById('boost-modal-content');
  content.innerHTML = '<div style="margin-bottom:12px;font-weight:700;">Step 1: Select a Mini League</div>' +
    '<div style="display:flex;flex-direction:column;gap:12px;">' + 
    _demonLeagues.map(l => `
      <div onclick="selectDemonLeague('${l.id}')" style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:12px;padding:16px;cursor:pointer;display:flex;justify-content:space-between;align-items:center;">
        <span style="font-weight:700;">${l.name}</span>
        <span style="font-size:0.8rem;color:rgba(255,255,255,0.5);">Select ➔</span>
      </div>
    `).join('') + '</div>';
}

async function selectDemonLeague(leagueId) {
  _selectedDemonLeague = leagueId;
  const content = document.getElementById('boost-modal-content');
  content.innerHTML = '<div style="text-align:center;padding:20px;color:rgba(255,255,255,0.5)">Loading rivals...</div>';
  
  try {
    const res = await fetch('/api/mini-leagues/' + leagueId);
    if (!res.ok) throw new Error('Failed to load league details');
    const data = await res.json();
    
    const rivals = data.ranking.filter(r => !r.isMe);
    if (rivals.length === 0) {
      content.innerHTML = '<button onclick="renderDemonLeagueList()" style="background:none;border:none;color:#1DA1F2;cursor:pointer;margin-bottom:16px;">← Back</button><br><div style="text-align:center;padding:20px;color:rgba(255,255,255,0.5)">No other members in this league.</div>';
      return;
    }

    content.innerHTML = '<button onclick="renderDemonLeagueList()" style="background:none;border:none;color:#1DA1F2;cursor:pointer;margin-bottom:16px;font-weight:700;">← Back to Leagues</button>' +
      '<div style="margin-bottom:12px;font-weight:700;color:#e01a4f;">Step 2: Choose your victim</div>' +
      '<div style="display:flex;flex-direction:column;gap:12px;">' +
      rivals.map(r => `
        <div style="background:rgba(224,26,79,0.1);border:1px solid rgba(224,26,79,0.3);border-radius:12px;padding:16px;display:flex;justify-content:space-between;align-items:center;">
          <div style="display:flex;align-items:center;gap:12px;">
            <img src="${r.image || '/images/default-avatar.png'}" style="width:32px;height:32px;border-radius:50%;object-fit:cover;">
            <div>
              <div style="font-weight:700;">${r.name}</div>
              <div style="font-size:0.8rem;color:rgba(255,255,255,0.5);">Rank: ${r.rank} | XP: ${r.xp}</div>
            </div>
          </div>
          <button onclick="castDemon('${r.userId}', '${r.name}', event)" style="background:#e01a4f;color:#fff;border:none;border-radius:8px;padding:8px 16px;font-weight:700;cursor:pointer;">Deduct 500XP</button>
        </div>
      `).join('') + '</div>';

  } catch(e) {
    content.innerHTML = '<div style="color:#e01a4f;text-align:center;padding:20px;">Error loading rivals</div>';
  }
}

async function castDemon(targetUserId, targetName, event) {
  const btn = event.currentTarget;
  const originalText = btn.textContent;

  _showBoostConfirmModal({
    title: 'Cast The Demon?',
    subtitle: `Are you sure you want to deduct 500XP from ${targetName}? You can only do this once in this league.`,
    iconHtml: '<span style="font-size: 38px;">😈</span>',
    color: '#e01a4f',
    onConfirm: async () => {
      btn.textContent = 'Casting...';
      btn.disabled = true;
      try {
        const res = await fetch('/api/boosts/demon', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ miniLeagueId: _selectedDemonLeague, targetUserId })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Failed to use The Demon');

        showNotification(`The Demon has been cast! ${targetName} lost 500XP!`, 'success');
        closeBoostModal();
      } catch(e) {
        showNotification(e.message, 'error');
        btn.textContent = originalText;
        btn.disabled = false;
      }
    }
  });
}

function _showBoostConfirmModal(opts) {
  const existing = document.getElementById('boost-confirm-modal');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'boost-confirm-modal';
  modal.style.cssText = 'position:fixed;inset:0;z-index:10000;display:flex;align-items:center;justify-content:center;padding:20px;';
  
  const hexToRgb = (hex) => {
    let result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? `${parseInt(result[1], 16)},${parseInt(result[2], 16)},${parseInt(result[3], 16)}` : '255,255,255';
  };
  const rgb = hexToRgb(opts.color);

  modal.innerHTML = `
    <div style="position:absolute;inset:0;background:rgba(0,0,0,0.65);backdrop-filter:blur(6px);" onclick="document.getElementById('boost-confirm-modal').remove()"></div>
    <div style="position:relative;background:linear-gradient(135deg,#0f1923,#131e2b);border:1px solid rgba(255,255,255,0.12);border-radius:24px;padding:32px 28px;max-width:360px;width:100%;box-shadow:0 32px 80px rgba(0,0,0,0.6);animation:voteModalIn 0.25s cubic-bezier(0.34,1.56,0.64,1);">
      <div style="text-align:center;margin-bottom:24px;">
        <div style="display:flex;justify-content:center;margin-bottom:16px;">
          <div style="position:relative;width:80px;height:80px;border-radius:50%;background:rgba(${rgb},0.1);border:2px solid rgba(${rgb},0.3);display:flex;align-items:center;justify-content:center;overflow:hidden;">
            ${opts.iconHtml}
          </div>
        </div>
        <div style="font-size:1.4rem;font-weight:900;color:#fff;margin-bottom:6px;">${opts.title}</div>
      </div>

      <div style="background:rgba(${rgb},0.08);border:1px solid rgba(${rgb},0.2);border-radius:14px;padding:14px 16px;margin-bottom:24px;display:flex;align-items:center;gap:12px;">
        <span style="font-size:1.5rem;">⚠️</span>
        <div>
          <div style="font-size:0.9rem;font-weight:800;color:#fff;">Confirm Action</div>
          <div style="font-size:0.78rem;color:rgba(255,255,255,0.5);margin-top:2px;">${opts.subtitle}</div>
        </div>
      </div>

      <div style="display:flex;gap:10px;">
        <button onclick="document.getElementById('boost-confirm-modal').remove()"
          style="flex:1;padding:13px;border-radius:14px;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.05);color:rgba(255,255,255,0.6);font-size:0.9rem;font-weight:700;cursor:pointer;font-family:inherit;transition:all 0.2s;"
          onmouseover="this.style.background='rgba(255,255,255,0.1)'" onmouseout="this.style.background='rgba(255,255,255,0.05)'">
          Cancel
        </button>
        <button id="boost-confirm-btn"
          style="flex:2;padding:13px;border-radius:14px;border:none;background:linear-gradient(135deg,${opts.color},${opts.color});color:#000;font-size:0.9rem;font-weight:900;cursor:pointer;font-family:inherit;box-shadow:0 4px 20px rgba(${rgb},0.4);transition:all 0.2s;"
          onmouseover="this.style.transform='translateY(-1px)';this.style.boxShadow='0 6px 24px rgba(${rgb},0.55)'" onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='0 4px 20px rgba(${rgb},0.4)'">
          Confirm
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  
  document.getElementById('boost-confirm-btn').onclick = () => {
    document.getElementById('boost-confirm-modal').remove();
    opts.onConfirm();
  };
}
