/* ═══════════════════════════════════════════════════════════════
   MATCHKOO — REAL BACKEND CONNECTOR
   Replaces backend_sim.js — connects to Next.js API routes
   All data flows through kickoff-taupe.vercel.app APIs
═══════════════════════════════════════════════════════════════ */

const Backend = {
  user: null,

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
        };
        this._updateAuthState();
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
      const [matchesRes, predsRes, lbRes, tournamentsRes] = await Promise.all([
        fetch('/api/matches').then(r => r.ok ? r.json() : []),
        fetch('/api/predictions').then(r => r.ok ? r.json() : []),
        fetch('/api/leaderboard').then(r => r.ok ? r.json() : []),
        fetch('/api/tournaments').then(r => r.ok ? r.json() : []),
      ]);

      // ── Today's Fixtures from real matches ──────────────────────
      if (matchesRes.length > 0) {
        const today = new Date().toDateString();
        
        // Exact names of the active leagues to filter today's matches
        const ACTIVE_LEAGUES = ['english premier league', 'premier league', 'la liga', 'uefa champions league', 'egyptian premier league', 'fifa world cup'];
        
        const todayMatches = matchesRes.filter(m => {
          const md = new Date(m.matchDate);
          const tName = (m.tournament?.name || '').toLowerCase()
            .replace(/\s+\d{4}(\s+\[\d+\])?$/, '')
            .replace(/\s+\[\d+\]$/, '').trim();
          const isTargetLeague = ACTIVE_LEAGUES.includes(tName);
          
          return isTargetLeague && (md.toDateString() === today || m.status === 'UPCOMING');
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
          isYou: u.id === this.user?.id,
        }));

        // Update "Your Rank" banner
        const myRank = lbRes.findIndex(u => u.id === this.user?.id);
        if (myRank >= 0) {
          const yrRank = document.querySelector('.yrb-rank');
          const yrName = document.querySelector('.yrb-name');
          const yrXp   = document.querySelector('.yrb-xp');
          if (yrRank) yrRank.textContent = `#${myRank + 1}`;
          if (yrName) yrName.textContent = `You (${this.user.name?.split(' ')[0]})`;
          if (yrXp)   yrXp.textContent = `${(this.user.xp || 0).toLocaleString()} XP`;
        }
      }

      // ── Tournaments → Discover page leagues ─────────────────────
      // ONLY inject the 5 agreed active leagues. Everything else stays
      // as static coming-soon data from data.js.
      if (tournamentsRes.length > 0) {
        // These MUST match the CANONICAL_NAMES map in sync-fixtures/route.ts exactly
        const ACTIVE_EXACT = [
          { name: 'english premier league', continent: 'europe' },
          { name: 'la liga',                continent: 'europe' },
          { name: 'uefa champions league',  continent: 'europe' },
          { name: 'egyptian premier league', continent: 'africa' },
          { name: 'fifa world cup',          continent: 'world'  },
        ];

        tournamentsRes.forEach(t => {
          // Strip " 2025 [39]" or " [39]" or " 2025" from the end for matching
          const cleanName = (t.name || '').toLowerCase()
            .replace(/\s+\d{4}(\s+\[\d+\])?$/, '')
            .replace(/\s+\[\d+\]$/, '').trim();
          
          const match = ACTIVE_EXACT.find(a => cleanName === a.name);
          if (!match) return; // skip — not one of our 5 active leagues

          const bucket = DATA.continents[match.continent];
          if (!bucket) return;

          // Replace the matching static league entry with real DB data,
          // or prepend if not already present
          const existing = bucket.leagues.findIndex(
            l => {
                const staticName = (l.name || '').toLowerCase()
                  .replace(/\s+\d{4}(\s+\[\d+\])?$/, '')
                  .replace(/\s+\[\d+\]$/, '').trim();
                return staticName === match.name || staticName.includes(match.name);
            }
          );
          // Strip [leagueId] from the display name shown in the league card
          const displayName = (t.name || '').replace(/\s*\[\d+\]$/, '');
          const realLeague = {
            id: t.id,
            name: displayName,
            country: match.continent === 'africa' ? '🇪🇬' :
                     match.continent === 'world'  ? '🌍' :
                     cleanName.includes('premier')   ? '🏴󠁧󠁢󠁥󠁮󠁧󠁿' :
                     cleanName.includes('la liga')   ? '🇪🇸' : '🇪🇺',
            emoji: t.type === 'Cup' ? '🏆' : '⚽',
            matches: t._count?.matches || 0,
            color: '#3CB82E',
            _realId: t.id,
            comingSoon: false,
          };
          if (existing >= 0) {
            bucket.leagues[existing] = realLeague;
          } else {
            bucket.leagues.unshift(realLeague);
          }
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
    // Sidebar user info
    const nameEl = document.querySelector('.user-name-sm');
    const xpEl   = document.querySelector('.user-xp-sm');
    if (nameEl) nameEl.textContent = this.user.name.split(' ')[0];
    if (xpEl)   xpEl.textContent   = `${(this.user.xp || 0).toLocaleString()} XP`;

    // Avatar
    const avatarImg = document.querySelector('.sidebar-user .user-avatar-sm img');
    if (avatarImg) {
      avatarImg.src = this.user.image
        || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(this.user.name)}`;
    }

    // Profile page
    const profileName = document.querySelector('.profile-name');
    if (profileName) profileName.textContent = this.user.name;
    const profileXpLabel = document.querySelector('.xp-label-row span:last-child');
    if (profileXpLabel) profileXpLabel.textContent = `${(this.user.xp || 0).toLocaleString()} XP`;
    const xpFill = document.querySelector('.xp-fill');
    if (xpFill) xpFill.style.width = `${Math.min((this.user.xp / 20000) * 100, 100)}%`;

    // Hero stats strip XP total
    const statNums = document.querySelectorAll('.stat-num');
    if (statNums[0]) statNums[0].textContent = '2.4M'; // platform total
  },

  async logout() {
    try {
      // NextAuth CSRF-aware signout
      const csrfRes = await fetch('/api/auth/csrf');
      const { csrfToken } = await csrfRes.json();
      await fetch('/api/auth/signout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `csrfToken=${csrfToken}&callbackUrl=/`,
      });
    } catch (e) {
      console.warn('Signout error:', e);
    }
    window.location.href = '/';
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
