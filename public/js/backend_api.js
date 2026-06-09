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

      // ── Today's Fixtures from real matches ─────────────────────────
      if (matchesRes.length > 0) {
        const localDateStr = (dt) => { const d = new Date(dt); return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0'); };
        const todayStr = localDateStr(new Date());
        const prefs = this.preferredLeagues; // joined leagues

        const todayMatches = matchesRes.filter(m => {
          if (localDateStr(m.matchDate) !== todayStr) return false;
          if (m.status && m.status !== 'UPCOMING') return false;
          // If user has joined leagues, only show those
          if (prefs.length > 0) {
            const tName = (m.tournament?.name || '').toLowerCase()
              .replace(/\s+\d{4}(\s+\[\d+\])?$/, '').replace(/\s+\[\d+\]$/, '').trim();
            const matched = prefs.some(p => tName.includes(p.toLowerCase()) || p.toLowerCase().includes(tName));
            if (!matched) return false;
          }
          return true;
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

      // ── Tournaments → Discover page leagues ─────────────────────────
      // Fully dynamic: every tournament from the API is placed under the
      // correct continent using its football-api league ID (the [N] suffix
      // in the DB name, e.g. "UEFA Champions League 2025 [2]" → ID 2).
      // No hardcoded names — add new leagues in the DB and they just appear.
      if (tournamentsRes.length > 0) {

        // ── Master league metadata keyed by football-api league ID ──────
        // Format: apiId → { continent, staticId, cleanName, country, emoji, logo }
        // Logo URL pattern: https://media.api-sports.io/football/leagues/{id}.png
        const _cdnLogo = id => 'https://media.api-sports.io/football/leagues/' + id + '.png';
        const LEAGUE_META = {
          // ── EUROPE ─────────────────────────────────────────────────────
          39:  { continent:'europe',   staticId:'epl',         cleanName:'Premier League',          country:'🏴󠁧󠁢󠁥󠁮󠁧󠁿', emoji:'⚽', logo:_cdnLogo(39)  },
          140: { continent:'europe',   staticId:'laliga',      cleanName:'La Liga',                 country:'🇪🇸', emoji:'🇪🇸', logo:_cdnLogo(140) },
          78:  { continent:'europe',   staticId:'bundesliga',  cleanName:'Bundesliga',              country:'🇩🇪', emoji:'🇩🇪', logo:_cdnLogo(78)  },
          135: { continent:'europe',   staticId:'seriea',      cleanName:'Serie A',                 country:'🇮🇹', emoji:'🇮🇹', logo:_cdnLogo(135) },
          61:  { continent:'europe',   staticId:'ligue1',      cleanName:'Ligue 1',                 country:'🇫🇷', emoji:'🇫🇷', logo:_cdnLogo(61)  },
          2:   { continent:'europe',   staticId:'ucl',         cleanName:'UEFA Champions League',   country:'🇪🇺', emoji:'⭐', logo:_cdnLogo(2)   },
          3:   { continent:'europe',   staticId:'uel',         cleanName:'UEFA Europa League',      country:'🇪🇺', emoji:'🟠', logo:_cdnLogo(3)   },
          848: { continent:'europe',   staticId:'uecl',        cleanName:'UEFA Conference League',  country:'🇪🇺', emoji:'🟢', logo:_cdnLogo(848) },
          88:  { continent:'europe',   staticId:'eredivisie',  cleanName:'Eredivisie',              country:'🇳🇱', emoji:'🇳🇱', logo:_cdnLogo(88)  },
          94:  { continent:'europe',   staticId:'primeirliga', cleanName:'Primeira Liga',           country:'🇵🇹', emoji:'🇵🇹', logo:_cdnLogo(94)  },
          203: { continent:'europe',   staticId:'superlig',    cleanName:'Süper Lig',               country:'🇹🇷', emoji:'🇹🇷', logo:_cdnLogo(203) },
          119: { continent:'europe',   staticId:'superliga',   cleanName:'Superliga (Denmark)',     country:'🇩🇰', emoji:'🇩🇰', logo:_cdnLogo(119) },
          113: { continent:'europe',   staticId:'allsvenskan', cleanName:'Allsvenskan',             country:'🇸🇪', emoji:'🇸🇪', logo:_cdnLogo(113) },
          103: { continent:'europe',   staticId:'eliteserien', cleanName:'Eliteserien',             country:'🇳🇴', emoji:'🇳🇴', logo:_cdnLogo(103) },
          // ── AFRICA ─────────────────────────────────────────────────────
          233: { continent:'africa',   staticId:'egipt',       cleanName:'Egyptian Premier League', country:'🇪🇬', emoji:'🇪🇬', logo:'https://tmssl.akamaized.net//images/logo/header/egy1.png?lm=1741338264' },
          12:  { continent:'africa',   staticId:'caf-cl',      cleanName:'CAF Champions League',    country:'🌍', emoji:'🏆', logo:_cdnLogo(12)  },
          6:   { continent:'africa',   staticId:'afcon',       cleanName:'AFCON 2026',              country:'🌍', emoji:'🇲🇦', logo:_cdnLogo(6)   },
          20:  { continent:'africa',   staticId:'npfl',        cleanName:'NPFL (Nigeria)',           country:'🇳🇬', emoji:'🇳🇬', logo:_cdnLogo(20)  },
          289: { continent:'africa',   staticId:'psl',         cleanName:'PSL (South Africa)',      country:'🇿🇦', emoji:'🇿🇦', logo:_cdnLogo(289) },
          31:  { continent:'africa',   staticId:'caf-cc',      cleanName:'CAF Confederation Cup',   country:'🌍', emoji:'🥈', logo:_cdnLogo(31)  },
          // ── AMERICAS ───────────────────────────────────────────────────
          253: { continent:'americas', staticId:'mls',         cleanName:'MLS',                     country:'🇺🇸', emoji:'🇺🇸', logo:_cdnLogo(253) },
          71:  { continent:'americas', staticId:'brasileirao', cleanName:'Brasileirão',             country:'🇧🇷', emoji:'🇧🇷', logo:_cdnLogo(71)  },
          262: { continent:'americas', staticId:'liga-mx',     cleanName:'Liga MX',                 country:'🇲🇽', emoji:'🇲🇽', logo:_cdnLogo(262) },
          13:  { continent:'americas', staticId:'libertadores',cleanName:'Copa Libertadores',       country:'🌎', emoji:'🏆', logo:_cdnLogo(13)  },
          9:   { continent:'americas', staticId:'copa-america',cleanName:'Copa América 2026',       country:'🌎', emoji:'🌎', logo:_cdnLogo(9)   },
          128: { continent:'americas', staticId:'arg-primera', cleanName:'Primera División (ARG)',  country:'🇦🇷', emoji:'🇦🇷', logo:_cdnLogo(128) },
          // ── ASIA ───────────────────────────────────────────────────────
          98:  { continent:'asia',     staticId:'jleague',     cleanName:'J-League',                country:'🇯🇵', emoji:'🇯🇵', logo:_cdnLogo(98)  },
          292: { continent:'asia',     staticId:'kleague',     cleanName:'K League 1',              country:'🇰🇷', emoji:'🇰🇷', logo:_cdnLogo(292) },
          307: { continent:'asia',     staticId:'saudi',       cleanName:'Saudi Pro League',        country:'🇸🇦', emoji:'🇸🇦', logo:_cdnLogo(307) },
          169: { continent:'asia',     staticId:'chinese-sl',  cleanName:'Chinese Super League',    country:'🇨🇳', emoji:'🇨🇳', logo:_cdnLogo(169) },
          17:  { continent:'asia',     staticId:'afc-cl',      cleanName:'AFC Champions League',    country:'🌏', emoji:'⭐', logo:_cdnLogo(17)  },
          323: { continent:'asia',     staticId:'isl',         cleanName:'Indian Super League',     country:'🇮🇳', emoji:'🇮🇳', logo:_cdnLogo(323) },
          // ── OCEANIA ────────────────────────────────────────────────────
          188: { continent:'oceania',  staticId:'a-league',    cleanName:'A-League (Australia)',    country:'🇦🇺', emoji:'🇦🇺', logo:_cdnLogo(188) },
          710: { continent:'oceania',  staticId:'nzfl',        cleanName:'NZFL (New Zealand)',      country:'🇳🇿', emoji:'🇳🇿', logo:_cdnLogo(710) },
          36:  { continent:'oceania',  staticId:'ofc-cl',      cleanName:'OFC Champions League',    country:'🌏', emoji:'🏆', logo:_cdnLogo(36)  },
          // ── WORLD / INTERNATIONAL ──────────────────────────────────────
          1:   { continent:'world',    staticId:'wc2026',      cleanName:'FIFA World Cup',          country:'🌍', emoji:'🏆', logo:'/images/wc2026-logo.png' },
          5:   { continent:'world',    staticId:'nations',     cleanName:'UEFA Nations League',     country:'🇪🇺', emoji:'🇪🇺', logo:_cdnLogo(5)   },
          890: { continent:'world',    staticId:'friendly',    cleanName:'Internationals/Friendlies',country:'🌍', emoji:'⚽', logo:null },
        };

        // Helper: extract football-api league ID from DB name, e.g. "UCL 2025 [2]" → 2
        const _extractApiId = name => {
          const m = (name || '').match(/\[(\d+)\]$/);
          return m ? parseInt(m[1]) : null;
        };

        // Helper: strip year + bracket suffix → clean canonical name
        const _cleanDbName = name => (name || '')
          .replace(/\s+\d{4}(\s+\[\d+\])?$/, '')
          .replace(/\s+\[\d+\]$/, '')
          .trim();

        // Helper: extract season year from DB name, e.g. "EPL 2025 [39]" → "2025/2026"
        const _seasonLabel = name => {
          const m = (name || '').match(/\s(\d{4})\s*(\[\d+\])?$/);
          if (!m) return '';
          const yr = parseInt(m[1]);
          return yr + '/' + (yr + 1);
        };

        tournamentsRes.forEach(t => {
          // ── 1. Identify league via football-api ID in the name ─────────
          const apiId = _extractApiId(t.name);
          let meta = apiId ? LEAGUE_META[apiId] : null;

          // ── 2. Fallback: match by clean name against LEAGUE_META ────────
          if (!meta) {
            const cleaned = _cleanDbName(t.name).toLowerCase();
            meta = Object.values(LEAGUE_META).find(m =>
              m.cleanName.toLowerCase() === cleaned
            ) || null;
          }

          // ── 3. No match → skip (not a recognised public league) ─────────
          if (!meta) return;

          const bucket = DATA.continents[meta.continent];
          if (!bucket) return;

          const seasonLbl = _seasonLabel(t.name);
          const displayName = seasonLbl
            ? meta.cleanName + ' ' + seasonLbl
            : meta.cleanName;

          const realLeague = {
            id:            t.id,
            name:          displayName,
            country:       meta.country,
            emoji:         meta.emoji,
            logo:          meta.logo,
            matches:       t._count?.matches ?? 0,
            color:         '#3CB82E',
            _realId:       t.id,
            canonicalName: meta.cleanName,   // used by toggleFollow (no year suffix)
            season:        t.season || null,
            status:        t.status || 'ONGOING',
            comingSoon:    false,
            registrationMode: t.registrationMode || 'OPEN',
            prizes:        t.prizes || null,
          };

          // Replace matching static placeholder (match by staticId), or prepend
          const idx = bucket.leagues.findIndex(l => l.id === meta.staticId);
          if (idx >= 0) {
            bucket.leagues[idx] = realLeague;
          } else {
            bucket.leagues.unshift(realLeague);
          }
        });

        // ── Update continent tab count pills ──────────────────────────────
        Object.entries(DATA.continents).forEach(([key, val]) => {
          const el = document.getElementById('count-' + key);
          if (!el) return;
          if (key === 'world') return; // keep "Special" label
          el.textContent = val.leagues.length + ' leagues';
        });
      }

      // Re-render current page with new data
      const cur = (typeof state !== 'undefined') ? state.currentPage : 'home';
      if (cur === 'home') { renderFixturesList(); renderMiniLeaderboard(); }
      if (cur === 'predictions') renderPredictions((typeof state !== 'undefined') ? state.predFilter : 'pending');
      if (cur === 'leaderboard') renderLeaderboardTable(DATA.leaderboard);
      if (cur === 'leagues') {
        const activeContinent = (typeof state !== 'undefined') ? state.currentContinent : 'europe';
        if (typeof renderLeagues === 'function') renderLeagues(activeContinent);
      }

    } catch (e) {
      console.warn('[Backend] Data hydration failed, using mock data:', e);
    }
  },

  // ─── AUTH ────────────────────────────────────────────────────────
  _updateAuthState() {
    document.body.setAttribute('data-logged-in', 'true');

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
    let tierColor = 'var(--green)';
    if (levelBadge) {
      const xp = this.user.xp || 0;
      const { letter, cls } = xp >= 50000 ? { letter:'L', cls:'legend'   }
                            : xp >= 20000 ? { letter:'P', cls:'platinum' }
                            : xp >= 10000 ? { letter:'G', cls:'gold'     }
                            : xp >= 3000  ? { letter:'S', cls:'silver'   }
                            :               { letter:'B', cls:'bronze'   };
      levelBadge.textContent = letter;
      levelBadge.className   = `level-badge-sm ${cls}`;
      
      const tierColors = {
        bronze: '#cd7f32',
        silver: '#909090',
        gold: '#ff9914',
        platinum: '#e0e0e0',
        legend: '#f21b3f'
      };
      tierColor = tierColors[cls] || 'var(--green)';
      if (xpEl) {
        xpEl.style.color = tierColor;
      }
    }

    // ── Avatar — gender-aware ─────────────────────────────────────────
    const avatarImg = document.querySelector('.sidebar-user .user-avatar-sm img');
    const mobileHeaderAvatar = document.getElementById('mobile-header-avatar');
    const mobileHeaderContainer = document.getElementById('mobile-header-avatar-container');
    
    const seed = encodeURIComponent(this.user.name);
    const isFemale = this.user.gender === 'female';
    const avatarUrl = isFemale
      ? `https://api.dicebear.com/7.x/lorelei/svg?seed=${seed}&backgroundColor=1e1e2e`
      : `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`;
    const finalAvatar = this.user.image || avatarUrl;

    if (avatarImg) {
      avatarImg.src = finalAvatar;
      avatarImg.style.borderColor = tierColor;
      avatarImg.style.boxShadow = `0 0 0 3px ${tierColor}33`;
    }
    
    if (mobileHeaderAvatar && mobileHeaderContainer) {
      mobileHeaderAvatar.src = finalAvatar;
      mobileHeaderAvatar.style.borderColor = tierColor;
      mobileHeaderContainer.style.display = 'flex';
    }

    // ── Profile page fields ───────────────────────────────────────────
    const profileName = document.querySelector('.profile-name');
    if (profileName) profileName.textContent = this.user.name;
    const profileXpLabel = document.querySelector('.xp-label-row span:last-child');
    if (profileXpLabel) profileXpLabel.textContent = `${(this.user.xp || 0).toLocaleString()} XP`;
    const xpFill = document.querySelector('.xp-fill');
    if (xpFill) {
      const xp = this.user.xp || 0;
      const TIERS = [
        { min: 0,     max: 2999   },
        { min: 3000,  max: 9999   },
        { min: 10000, max: 19999  },
        { min: 20000, max: 49999  },
        { min: 50000, max: Infinity }
      ];
      const tier = TIERS.find(t => xp >= t.min && xp <= t.max) || TIERS[0];
      const nextTier = TIERS[TIERS.indexOf(tier) + 1];
      const pct = nextTier ? Math.min(100, ((xp - tier.min) / (nextTier.min - tier.min)) * 100) : 100;
      xpFill.style.width = pct.toFixed(1) + '%';
    }

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

      // ── Real daily XP insight ──────────────────────────────────────
      const xpToday = data.xpToday ?? 0;
      const todayEl = document.getElementById('yrb-today-xp');
      if (todayEl) {
        if (xpToday > 0) {
          todayEl.style.color = '#3CB82E';
          todayEl.textContent = '↑' + xpToday.toLocaleString() + ' today';
        } else if (xpToday < 0) {
          todayEl.style.color = '#e74c3c';
          todayEl.textContent = '↓' + Math.abs(xpToday).toLocaleString() + ' today';
        } else {
          todayEl.style.color = 'rgba(255,255,255,0.4)';
          todayEl.textContent = '— today';
        }
      }

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
  // tournamentId = real DB cuid (present for hydrated leagues, null for static placeholders)
  async toggleLeagueFollow(canonicalLeagueName, action, tournamentId = null) {
    try {
      // 1. Update the user's preferredLeagues list (controls fixture filtering)
      const res = await fetch('/api/user/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ league: canonicalLeagueName, action }),
      });
      if (!res.ok) return false;
      const data = await res.json();
      // Update local cache
      this.preferredLeagues = data.preferredLeagues || [];

      // 2. For real DB leagues also create/delete a Registration row
      //    (drives leaderboard membership and "My Leagues" counts)
      if (tournamentId) {
        if (action === 'follow') {
          // Ignore errors — e.g. already registered (P2002)
          await fetch('/api/tournaments/' + tournamentId + '/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({}),
          }).catch(() => {});
        } else {
          await fetch('/api/tournaments/' + tournamentId + '/register', {
            method: 'DELETE',
          }).catch(() => {});
        }
      }

      // 3. Refresh Today's Fixtures to reflect the new preference
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

      const todayMatches = matchesRes.filter(m => {
        // Only upcoming matches for today
        if (localDateStr(m.matchDate) !== todayStr) return false;
        if (m.status && m.status !== 'UPCOMING') return false;
        // If user has joined specific leagues, filter to those only
        if (prefs.length > 0) {
          const tName = (m.tournament?.name || '').toLowerCase()
            .replace(/\s+\d{4}(\s+\[\d+\])?$/, '').replace(/\s+\[\d+\]$/, '').trim();
          const matchesPref = prefs.some(p => tName.includes(p.toLowerCase()) || p.toLowerCase().includes(tName));
          if (!matchesPref) return false;
        }
        return true;
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


// ═══════════════════════════════════════════════════════════════════
//  EDIT PROFILE v2 — Open / Close / Avatar / Save / Password
// ═══════════════════════════════════════════════════════════════════

let _epSelectedAvatarUrl = null;
let _epSelectedAvatarName = null;

function openEditProfile() {
  const modal = document.getElementById('edit-profile-modal');
  if (!modal) return;

  // Pre-fill name
  const nameInput = document.getElementById('ep-name-input');
  const profileNameEl = document.getElementById('profile-name');
  if (nameInput && profileNameEl) {
    const currentName = profileNameEl.textContent.trim();
    nameInput.value = (currentName === '—' || currentName === '-') ? '' : currentName;
    updateNameCounter();
  }

  // Reset avatar selection state
  _epSelectedAvatarUrl = null;
  _epSelectedAvatarName = null;
  document.querySelectorAll('.ep-av-btn').forEach(b => b.classList.remove('selected'));

  // Pre-select current avatar if it matches one of the grid options
  const currentAvatarImg = document.getElementById('profile-avatar-img');
  if (currentAvatarImg && currentAvatarImg.src) {
    const currentSrc = currentAvatarImg.src;
    document.querySelectorAll('.ep-av-btn').forEach(b => {
      if (b.dataset.url && currentSrc.includes(encodeURIComponent(b.dataset.url.split('seed=')[1]?.split('&')[0] || ''))) {
        b.classList.add('selected');
      }
    });
  }

  // Hide preview until something new is selected
  const preview = document.getElementById('ep-selected-preview');
  if (preview) preview.style.display = 'none';

  // Clear pw feedback
  const pwFb = document.getElementById('ep-pw-feedback');
  if (pwFb) { pwFb.style.display = 'none'; pwFb.textContent = ''; }

  // Reset pw button
  const pwBtn = document.getElementById('ep-pw-btn');
  if (pwBtn) { pwBtn.disabled = false; pwBtn.textContent = 'Change'; }

  // Show modal
  modal.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeEditProfile() {
  const modal = document.getElementById('edit-profile-modal');
  if (!modal) return;
  modal.classList.remove('open');
  document.body.style.overflow = '';
}

function updateNameCounter() {
  const input = document.getElementById('ep-name-input');
  const counter = document.getElementById('ep-name-counter');
  if (!input || !counter) return;
  const len = input.value.length;
  counter.textContent = len + '/40';
  counter.style.color = len > 35 ? '#ff9914' : 'rgba(255,255,255,0.25)';
}

function selectEditAvatar(btn) {
  document.querySelectorAll('.ep-av-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  _epSelectedAvatarUrl  = btn.dataset.url;
  _epSelectedAvatarName = btn.querySelector('span') ? btn.querySelector('span').textContent : '';

  // Show small preview strip
  const preview = document.getElementById('ep-selected-preview');
  const previewImg = document.getElementById('ep-preview-img');
  const previewName = document.getElementById('ep-preview-name');
  if (preview && previewImg) {
    previewImg.src = _epSelectedAvatarUrl;
    if (previewName) previewName.textContent = _epSelectedAvatarName;
    preview.style.display = 'flex';
  }
}

async function saveProfileChanges() {
  const nameInput = document.getElementById('ep-name-input');
  const saveBtn   = document.getElementById('ep-save-btn');
  const newName   = nameInput ? nameInput.value.trim() : '';

  if (!newName || newName.length < 2) {
    showEpToast('Name must be at least 2 characters', true);
    return;
  }

  saveBtn.disabled = true;
  saveBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="17" height="17" style="animation:spin 0.8s linear infinite"><path d="M21 12a9 9 0 1 1-6.22-8.56"/></svg> Saving…';

  try {
    const payload = { name: newName };
    if (_epSelectedAvatarUrl) payload.image = _epSelectedAvatarUrl;

    const res = await fetch('/api/user/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Failed to save');
    }

    // Update profile name
    const profileNameEl = document.getElementById('profile-name');
    if (profileNameEl) profileNameEl.textContent = newName;

    // Update sidebar name
    const sidebarName = document.querySelector('.user-name-sm');
    if (sidebarName) sidebarName.textContent = newName.split(' ')[0];
    
    // Update local state
    if (window.Backend && window.Backend.user) {
      window.Backend.user.name = newName;
      if (_epSelectedAvatarUrl) {
        window.Backend.user.image = _epSelectedAvatarUrl;
      }
    }

    // Update avatar everywhere
    if (_epSelectedAvatarUrl) {
      const ids = ['profile-avatar-img', 'mobile-header-avatar'];
      ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.src = _epSelectedAvatarUrl;
      });
      // Update sidebar avatar by ID (most reliable)
      const sidebarAvatarById = document.getElementById('sidebar-avatar-img');
      if (sidebarAvatarById) sidebarAvatarById.src = _epSelectedAvatarUrl;
      // Also update profile avatar
      const profileAvById = document.getElementById('profile-avatar-img');
      if (profileAvById) profileAvById.src = _epSelectedAvatarUrl;
    }

    closeEditProfile();
    showEpToast('✓ Profile updated!', false);
  } catch(err) {
    showEpToast(err.message || 'Error saving profile', true);
  } finally {
    saveBtn.disabled = false;
    saveBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="17" height="17"><polyline points="20 6 9 17 4 12"/></svg> Save Changes';
  }
}

async function requestPasswordChange() {
  const pwBtn = document.getElementById('ep-pw-btn');
  const pwFb  = document.getElementById('ep-pw-feedback');
  if (!pwBtn) return;

  pwBtn.disabled = true;
  pwBtn.textContent = 'Sending…';

  const email = Backend && Backend.user && Backend.user.email;
  if (!email) {
    showPwFeedback('Could not find your email. Please try again.', false);
    pwBtn.disabled = false; pwBtn.textContent = 'Change';
    return;
  }

  try {
    const res = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    if (res.ok) {
      showPwFeedback('✓ Reset link sent — check your inbox!', true);
      pwBtn.textContent = 'Sent ✓';
    } else {
      showPwFeedback('Something went wrong. Please try again.', false);
      pwBtn.disabled = false; pwBtn.textContent = 'Change';
    }
  } catch {
    showPwFeedback('Network error. Please try again.', false);
    pwBtn.disabled = false; pwBtn.textContent = 'Change';
  }
}

function showPwFeedback(msg, ok) {
  const el = document.getElementById('ep-pw-feedback');
  if (!el) return;
  el.textContent = msg;
  el.style.display = 'block';
  el.style.background = ok ? 'rgba(60,184,46,0.1)'  : 'rgba(231,76,60,0.1)';
  el.style.border     = ok ? '1px solid rgba(60,184,46,0.3)' : '1px solid rgba(231,76,60,0.3)';
  el.style.color      = ok ? '#6FE840' : '#e74c3c';
  el.style.borderRadius = '10px';
  el.style.padding    = '10px 14px';
}

function showEpToast(msg, isErr) {
  const old = document.getElementById('_epToast');
  if (old) old.remove();
  const t = document.createElement('div');
  t.id = '_epToast';
  t.className = 'ep-toast-msg' + (isErr ? ' err' : '');
  t.textContent = msg;
  document.body.appendChild(t);
  requestAnimationFrame(() => requestAnimationFrame(() => t.classList.add('show')));
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 350); }, 3000);
}
