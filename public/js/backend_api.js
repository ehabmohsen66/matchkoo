/* ═══════════════════════════════════════════════════════════════
   MATCHKOO — REAL BACKEND CONNECTOR
   Replaces backend_sim.js — connects to Next.js API routes
   All data flows through kickoff-taupe.vercel.app APIs
═══════════════════════════════════════════════════════════════ */

const Backend = {
  user: null,
  preferredLeagues: [], // canonical league names the user follows

  // ─── INIT — call on page load ────────────────────────────────────
  async init() {
    try {
      const res = await fetch('/api/auth/session');
      const session = await res.json();

      if (session && session.user) {
        this.user = {
          id: session.user.id,
          email: session.user.email,
          name: session.user.name || 'Player',
          image: session.user.image || null,
          role: (session.user.role || 'USER').toLowerCase(),
          xp: session.user.xp || 0,
          streak: session.user.streak ?? 0,
          predictionCount: session.user.predictionCount ?? 0,
          gender: session.user.gender ?? 'male',
        };
        this._updateAuthState();
        // Fetch global rank immediately (doesn't depend on full leaderboard)
        this._fetchAndShowGlobalRank();
        await this._hydrateData();
        return true;
      } else {
        // Not logged in — redirect to login
        window.location.href = '/login?callbackUrl=/app.html';
        return false;
      }
    } catch (e) {
      console.error('[Backend] Init failed:', e);
      // On error, keep mock data and continue (graceful degradation)
      return true;
    }
  },

  // ─── HYDRATE DATA object with real API data ──────────────────────
  async _hydrateData() {
    try {
      const [matchesRes, predsRes, lbRes, tournamentsRes, prefsRes] = await Promise.all([
        fetch('/api/matches').then(r => r.ok ? r.json() : []),
        fetch('/api/predictions').then(r => r.ok ? r.json() : []),
        fetch('/api/leaderboard').then(r => r.ok ? r.json() : []),
        fetch('/api/tournaments').then(r => r.ok ? r.json() : []),
        fetch('/api/user/preferences').then(r => r.ok ? r.json() : { preferredLeagues: [] }),
      ]);

      // Store preferred leagues so Discover can use them
      this.preferredLeagues = prefsRes.preferredLeagues || [];

      // ── Today's Fixtures from real matches ──────────────────────
      if (matchesRes.length > 0) {
        const today = new Date();
        const todayStr    = today.getFullYear() + '-' + String(today.getMonth()+1).padStart(2,'0') + '-' + String(today.getDate()).padStart(2,'0');
        const tomorrow    = new Date(today); tomorrow.setDate(today.getDate() + 1);
        const tomorrowStr = tomorrow.getFullYear() + '-' + String(tomorrow.getMonth()+1).padStart(2,'0') + '-' + String(tomorrow.getDate()).padStart(2,'0');
        
        // helper: get local YYYY-MM-DD from a match date
        const localDateStr = (dt) => { const d = new Date(dt); return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0'); };

        const todayMatches = matchesRes.filter(m => {
          const tName = (m.tournament?.name || '').toLowerCase()
            .replace(/\s+\d{4}(\s+\[\d+\])?$/, '')
            .replace(/\s+\[\d+\]$/, '').trim();
          const isTargetLeague = ACTIVE_LEAGUES.includes(tName);
          return isTargetLeague && localDateStr(m.matchDate) === todayStr;
        }).slice(0, 8);

        if (todayMatches.length > 0) {
          DATA.todayFixtures = todayMatches.map(m => ({
            id: m.id,
            league: m.tournament?.name || 'League',
            leagueFlag: m.tournament?.type === 'Cup' ? '🏆' : '⚽',
            home: m.homeTeam,
            away: m.awayTeam,
            time: new Date(m.matchDate).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
            predicted: !!m.userPrediction,
            homeColor: '#3CB82E',
            awayColor: '#6FE840',
            _realId: m.id,
            _tournamentName: m.tournament?.name,
          }));
        }
      }

      // ── Real Predictions ─────────────────────────────────────────
      if (predsRes.length > 0) {
        DATA.predictions = predsRes.map(p => {
          const status = p.match?.status === 'COMPLETED'
            ? (p.xpEarned > 0 ? 'correct' : 'wrong')
            : 'pending';
          const picks = [
            p.homeScore !== null ? `Score ${p.homeScore}-${p.awayScore}` : null,
            p.firstGoalScorer ? `FGS: ${p.firstGoalScorer}` : null,
            `Confidence ${p.confidence || 70}%`,
            p.isDouble ? '⚡ Double XP' : null,
          ].filter(Boolean);
          return {
            id: p.id,
            league: p.match?.tournament?.name || 'League',
            match: `${p.match?.homeTeam || '?'} vs ${p.match?.awayTeam || '?'}`,
            status,
            picks,
            xp: status === 'correct' ? `+${p.xpEarned || 0} XP` : status === 'pending' ? 'Pending' : '+0 XP',
            time: p.match?.matchDate ? new Date(p.match.matchDate).toLocaleDateString('en-GB') : '',
          };
        });
      }

      // ── Real Leaderboard ─────────────────────────────────────────
      if (lbRes.length > 0) {
        const levelMap = xp => {
          if (xp >= 100000) return 'legend';
          if (xp >= 50000)  return 'diamond';
          if (xp >= 20000)  return 'platinum';
          if (xp >= 10000)  return 'gold';
          if (xp >= 3000)   return 'silver';
          return 'bronze';
        };

        DATA.leaderboard = lbRes.map((u, i) => ({
          rank: i + 1,
          name: u.name || 'Player',
          flag: '🌍',
          level: levelMap(u.xp || 0),
          xp: (u.xp || 0).toLocaleString(),
          acc: u.accuracy ? `${u.accuracy}%` : '—',
          seed: u.name?.toLowerCase().replace(/\s/g, '') || `user${i}`,
          isYou: u.isMe || u.userId === this.user?.id,
        }));

        // Update "Your Rank" banner
        const myEntry = lbRes.find(u => u.isMe || u.userId === this.user?.id);
        const myRank  = myEntry ? (myEntry.rank ? myEntry.rank - 1 : lbRes.indexOf(myEntry)) : -1;
        if (myEntry && myRank >= 0) {
          const yrRank = document.querySelector('.yrb-rank');
          const yrName = document.querySelector('.yrb-name');
          const yrXp   = document.querySelector('.yrb-xp');
          if (yrRank) yrRank.textContent = `#${myRank + 1}`;
          if (yrName) yrName.textContent = `You (${this.user.name?.split(' ')[0]})`;
          if (yrXp)   yrXp.textContent = `${(this.user.xp || 0).toLocaleString()} XP`;

          // ── Sidebar global rank badge ──────────────────────────────
          const rankVal = document.getElementById('sidebar-rank-val');
          if (rankVal) rankVal.textContent = `#${(myRank + 1).toLocaleString()}`;

          // Cache for ticker fallback refresh cycles
          window._cachedUserRank = myRank + 1;
        }
      }

      // ── Tournaments → Discover page leagues ─────────────────────
      // ONLY inject the 5 agreed active leagues. Each real DB tournament
      // replaces its matching static placeholder by exact staticId.
      if (tournamentsRes.length > 0) {
        // Maps cleaned canonical name → { continent, staticId, country, canonicalName, logo }
        const ACTIVE_EXACT = {
          'english premier league': { continent: 'europe', staticId: 'epl',     country: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', emoji: '⚽', logo: 'https://media.api-sports.io/football/leagues/39.png', canonicalName: 'English Premier League' },
          'la liga':                { continent: 'europe', staticId: 'laliga',  country: '🇪🇸', emoji: '🇪🇸', logo: 'https://media.api-sports.io/football/leagues/140.png', canonicalName: 'La Liga' },
          'uefa champions league':  { continent: 'europe', staticId: 'ucl',     country: '🇪🇺', emoji: '⭐', logo: 'https://media.api-sports.io/football/leagues/2.png', canonicalName: 'UEFA Champions League' },
          'egyptian premier league':{ continent: 'africa', staticId: 'egipt',   country: '🇪🇬', emoji: '🇪🇬', logo: 'https://tmssl.akamaized.net//images/logo/header/egy1.png?lm=1741338264', canonicalName: 'Egyptian Premier League' },
          'fifa world cup':         { continent: 'world',  staticId: 'wc2026',  country: '🌍', emoji: '🏆', logo: '/images/wc2026-logo.png', canonicalName: 'FIFA World Cup' },
        };

        tournamentsRes.forEach(t => {
          const cleanName = (t.name || '').toLowerCase()
            .replace(/\s+\d{4}(\s+\[\d+\])?$/, '')
            .replace(/\s+\[\d+\]$/, '').trim();

          const cfg = ACTIVE_EXACT[cleanName];
          if (!cfg) return; // not one of our 5 active leagues

          const bucket = DATA.continents[cfg.continent];
          if (!bucket) return;

          // Find by staticId — guaranteed unique, no ambiguity
          const idx = bucket.leagues.findIndex(l => l.id === cfg.staticId);

          const realLeague = {
            id: t.id,
            name: cfg.canonicalName,          // clean display name, no year/[id]
            country: cfg.country,
            emoji: cfg.emoji,
            logo: cfg.logo,
            matches: t._count?.matches ?? 0,  // real count from DB
            color: '#3CB82E',
            _realId: t.id,
            canonicalName: cfg.canonicalName, // used by toggleFollow
            comingSoon: false,
          };

          if (idx >= 0) {
            bucket.leagues[idx] = realLeague; // replace static placeholder
          } else {
            bucket.leagues.unshift(realLeague); // first time — prepend
          }
        });

        // Dynamically update continent count pills from actual data
        Object.entries(DATA.continents).forEach(([key, val]) => {
          const el = document.getElementById('count-' + key);
          if (!el) return;
          if (key === 'world') return; // keep "Special"
          el.textContent = val.leagues.length + ' leagues';
        });
      }

      // Re-render current page with new data
      const cur = window.state?.currentPage || 'home';
      if (cur === 'home') { renderFixturesList(); renderMiniLeaderboard(); }
      if (cur === 'predictions') renderPredictions(window.state?.predFilter || 'pending');
      if (cur === 'leaderboard') renderLeaderboardTable(DATA.leaderboard);

    } catch (e) {
      console.warn('[Backend] Data hydration failed, using mock data:', e);
    }
  },

  // ─── AUTH ────────────────────────────────────────────────────────
  _updateAuthState() {
    // Admin role → show admin nav link
    if (this.user.role === 'admin') {
      document.body.setAttribute('data-role', 'admin');
      const adminLink = document.getElementById('nav-admin');
      if (adminLink) adminLink.style.display = 'flex';
    }

    // ── Sidebar user info — try ID first, fall back to class ──────────
    const nameEl  = document.getElementById('sidebar-username') || document.querySelector('.user-name-sm');
    const xpEl    = document.getElementById('sidebar-xp')       || document.querySelector('.user-xp-sm');
    if (nameEl) nameEl.textContent = this.user.name.split(' ')[0];
    if (xpEl)   xpEl.textContent   = `${(this.user.xp || 0).toLocaleString()} XP`;

    // ── Level badge letter based on XP ───────────────────────────────
    const levelBadge = document.getElementById('sidebar-level-badge');
    if (levelBadge) {
      const xp = this.user.xp || 0;
      const { letter, cls } = xp >= 50000 ? { letter:'L', cls:'legend'   }
                            : xp >= 20000 ? { letter:'P', cls:'platinum' }
                            : xp >= 10000 ? { letter:'G', cls:'gold'     }
                            : xp >= 3000  ? { letter:'S', cls:'silver'   }
                            :               { letter:'B', cls:'bronze'   };
      levelBadge.textContent = letter;
      levelBadge.className   = `level-badge-sm ${cls}`;
    }

    // ── Avatar — gender-aware ─────────────────────────────────────────
    const avatarImg = document.querySelector('.sidebar-user .user-avatar-sm img');
    if (avatarImg) {
      const seed     = encodeURIComponent(this.user.name);
      const isFemale = this.user.gender === 'female';
      const avatarUrl = isFemale
        ? `https://api.dicebear.com/7.x/lorelei/svg?seed=${seed}&backgroundColor=1e1e2e`
        : `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`;
      avatarImg.src = this.user.image || avatarUrl;
    }

    // ── Profile page fields ───────────────────────────────────────────
    const profileName = document.querySelector('.profile-name');
    if (profileName) profileName.textContent = this.user.name;
    const profileXpLabel = document.querySelector('.xp-label-row span:last-child');
    if (profileXpLabel) profileXpLabel.textContent = `${(this.user.xp || 0).toLocaleString()} XP`;
    const xpFill = document.querySelector('.xp-fill');
    if (xpFill) xpFill.style.width = `${Math.min((this.user.xp / 20000) * 100, 100)}%`;

    // ── Rank badge — shows "—" until _fetchAndShowGlobalRank fills it in ─
    // (populated immediately via /api/leaderboard/my-rank)
  },

  // ─── GLOBAL RANK — fetch once after login ────────────────────────
  async _fetchAndShowGlobalRank() {
    try {
      const res = await fetch('/api/leaderboard/my-rank');
      if (!res.ok) return;
      const data = await res.json();
      const rank = data.rank;
      if (!rank) return;

      // Update sidebar rank badge
      const rankVal = document.getElementById('sidebar-rank-val');
      if (rankVal) rankVal.textContent = '#' + rank.toLocaleString();

      // Also update the leaderboard page "Your Rank" banner if visible
      const yrRank = document.querySelector('.yrb-rank');
      if (yrRank && yrRank.textContent === '#1,247') yrRank.textContent = '#' + rank.toLocaleString();

      // Cache for later use
      window._cachedUserRank = rank;
    } catch (e) {
      // Graceful degradation — badge stays "—"
    }
  },

  async logout() {
    // Navigate to /signout — the dedicated Next.js page calls NextAuth signOut() reliably
    window.location.href = '/signout';
  },

  // ─── PREDICTIONS ─────────────────────────────────────────────────
  async submitPrediction(matchId, payload) {
    try {
      const res = await fetch('/api/predictions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchId, ...payload }),
      });
      const data = await res.json();
      return { success: res.ok, message: data.message || (res.ok ? 'Prediction saved!' : 'Error saving prediction') };
    } catch (e) {
      return { success: false, message: 'Network error' };
    }
  },

  // ─── LEADERBOARD ─────────────────────────────────────────────────
  async getLeaderboard(scope = 'global', tournamentId = null) {
    try {
      const url = tournamentId ? `/api/leaderboard?tournamentId=${tournamentId}` : '/api/leaderboard';
      const res = await fetch(url);
      return res.ok ? res.json() : DATA.leaderboard;
    } catch (e) {
      return DATA.leaderboard;
    }
  },

  // ─── MATCHES ─────────────────────────────────────────────────────
  async getMatchesForTournament(tournamentId) {
    try {
      const res = await fetch(`/api/matches?tournamentId=${tournamentId}`);
      return res.ok ? res.json() : [];
    } catch (e) {
      return [];
    }
  },

  // ─── TOURNAMENTS ─────────────────────────────────────────────────
  async joinTournament(tournamentId, inviteCode) {
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteCode: inviteCode || undefined }),
      });
      const data = await res.json();
      return { success: res.ok, message: data.message };
    } catch (e) {
      return { success: false, message: 'Network error' };
    }
  },

  // ─── ADMIN ───────────────────────────────────────────────────────
  async resolveMatch(matchId, homeScore, awayScore, firstGoalScorer) {
    if (!this.user || this.user.role !== 'admin') {
      return { error: 'Unauthorized' };
    }
    try {
      const res = await fetch(`/api/admin/matches/${matchId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ homeScore, awayScore, firstGoalScorer, status: 'COMPLETED' }),
      });
      return res.json();
    } catch (e) {
      return { error: 'Network error' };
    }
  },

  // ─── LEAGUE FOLLOW / UNFOLLOW ────────────────────────────────────
  async toggleLeagueFollow(canonicalLeagueName, action) {
    try {
      const res = await fetch('/api/user/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ league: canonicalLeagueName, action }),
      });
      if (!res.ok) return false;
      const data = await res.json();
      // Update local cache
      this.preferredLeagues = data.preferredLeagues || [];
      // Refresh Today's Fixtures to reflect the new preference
      await this._refreshTodayFixtures();
      return true;
    } catch (e) {
      console.error('[Backend] toggleLeagueFollow failed:', e);
      return false;
    }
  },

  // Refetch /api/matches and rebuild Today's Fixtures in DATA
  async _refreshTodayFixtures() {
    try {
      const matchesRes = await fetch('/api/matches').then(r => r.ok ? r.json() : []);
      if (!matchesRes.length) return;

      const localDateStr = (dt) => { const d = new Date(dt); return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0'); };
      const now = new Date();
      const todayStr = localDateStr(now);
      const prefs = this.preferredLeagues;
      const ACTIVE_LEAGUES = ['english premier league', 'premier league', 'la liga',
        'uefa champions league', 'egyptian premier league', 'fifa world cup'];

      const todayMatches = matchesRes.filter(m => {
        const tName = (m.tournament?.name || '').toLowerCase()
          .replace(/\s+\d{4}(\s+\[\d+\])?$/, '').replace(/\s+\[\d+\]$/, '').trim();
        const inActive = ACTIVE_LEAGUES.includes(tName);
        if (!inActive) return false;
        if (prefs.length > 0) {
          const matchesPref = prefs.some(p => tName.includes(p.toLowerCase()));
          if (!matchesPref) return false;
        }
        return localDateStr(m.matchDate) === todayStr;
      }).slice(0, 8);

      if (todayMatches.length > 0) {
        DATA.todayFixtures = todayMatches.map(m => ({
          id: m.id, league: m.tournament?.name || 'League',
          leagueFlag: m.tournament?.type === 'Cup' ? '🏆' : '⚽',
          home: m.homeTeam, away: m.awayTeam,
          time: new Date(m.matchDate).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
          predicted: !!m.userPrediction,
          homeColor: '#3CB82E', awayColor: '#6FE840',
          _realId: m.id, _tournamentName: m.tournament?.name,
        }));
      } else {
        DATA.todayFixtures = [];
      }

      // Re-render the today tab if it's currently active
      if (typeof renderHome === 'function') renderHome();
    } catch (e) {
      console.error('[Backend] _refreshTodayFixtures failed:', e);
    }
  },
};

// ── Auto-init on load ──────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  Backend.init();
});

// ── Global sign-out handler (called from sidebar button) ───────────
async function handleSignOut() {
  const btn = document.getElementById('sidebar-signout-btn');
  const label = document.getElementById('signout-label');
  if (btn) { btn.disabled = true; }
  if (label) { label.textContent = 'Signing out…'; }
  await Backend.logout();
}
