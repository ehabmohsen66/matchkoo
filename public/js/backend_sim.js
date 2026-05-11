/* ═══════════════════════════════════════════════════════════════
   KICKOFF — BACKEND SIMULATOR & AUTHENTICATION
   Prepares the architecture for Supabase/Firebase Integration
═══════════════════════════════════════════════════════════════ */

const Backend = {
  // Current user state
  user: null,

  // ─── AUTHENTICATION ──────────────────────────────────────────────
  async loginWithGoogle() {
    console.log('[Backend] Initiating Google OAuth...');
    return new Promise((resolve) => {
      setTimeout(() => {
        // Mock successful login
        this.user = {
          id: 'usr_' + Math.random().toString(36).substr(2, 9),
          email: 'player@kickoff.com',
          name: 'Ihab Mohamed',
          role: 'user', // Change to 'admin' to test admin dashboard access
          created_at: new Date().toISOString()
        };
        
        // Let's force an admin for testing since you requested it! 
        // In a real DB, this is determined by a role column in Supabase.
        const isAdminTest = true; 
        if (isAdminTest) {
          this.user.role = 'admin';
        }

        this._updateAuthState();
        resolve({ user: this.user, error: null });
      }, 800);
    });
  },

  async logout() {
    this.user = null;
    this._updateAuthState();
    console.log('[Backend] User logged out.');
  },

  _updateAuthState() {
    // Modify DOM based on role
    if (this.user && this.user.role === 'admin') {
      document.body.setAttribute('data-role', 'admin');
    } else {
      document.body.removeAttribute('data-role');
    }
  },

  // ─── DATABASE FUNCTIONS (MOCKS) ──────────────────────────────────
  async getLeaderboard(scope = 'global', limit = 50) {
    console.log(`[Backend] Fetching ${scope} leaderboard...`);
    // Placeholder: returning the mock data from data.js
    return new Promise((resolve) => setTimeout(() => resolve(DATA.leaderboard), 300));
  },

  async submitPrediction(matchId, payload) {
    console.log(`[Backend] Submitting prediction for match ${matchId}:`, payload);
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ success: true, message: 'Prediction saved successfully!' });
      }, 500);
    });
  },

  async resolveMatch(matchId, finalScore) {
    if (!this.user || this.user.role !== 'admin') {
      console.error('[Backend] Unauthorized access. Admin role required.');
      return { error: 'Unauthorized' };
    }
    console.log(`[Backend] Admin resolving match ${matchId} with score ${finalScore}`);
    
    // In Production: This would trigger a Supabase Database Function (RPC) 
    // to calculate XP for all users who predicted this match.
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ success: true, xpDistributed: Math.floor(Math.random() * 5000) });
      }, 1000);
    });
  }
};
