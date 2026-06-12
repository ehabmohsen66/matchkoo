"use client";
import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

// ─── Types ───────────────────────────────────────────────
type Tournament = { id: string; name: string; game: string; type: string; status: string; prizePool: string; prizes?: string; maxPlayers: number; startDate: string; registrationMode: string; inviteCode?: string; description: string; competition?: string; _count?: { registrations: number; matches: number } };
type Match = { id: string; tournamentId: string; homeTeam: string; awayTeam: string; matchDate: string; round: string; status: string; homeScore?: number; awayScore?: number; firstGoalScorer?: string; tournament: { name: string; type: string } };
type User = { id: string; name: string; email: string; role: string; xp: number; createdAt: string; _count: { registrations: number; predictions: number } };

// ─── Shared styles ────────────────────────────────────────
const card: React.CSSProperties = { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: "20px 22px", marginBottom: 14 };
const inputStyle: React.CSSProperties = { width: "100%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "9px 14px", color: "#fff", fontSize: "0.85rem", fontFamily: "inherit", boxSizing: "border-box" };
const btnGreen: React.CSSProperties = { padding: "9px 20px", borderRadius: 100, border: "none", background: "linear-gradient(135deg,#3CB82E,#6FE840)", color: "#000", fontWeight: 800, fontSize: "0.8rem", cursor: "pointer" };
const btnGhost: React.CSSProperties = { padding: "7px 16px", borderRadius: 100, border: "1px solid rgba(255,255,255,0.12)", background: "transparent", color: "rgba(255,255,255,0.6)", fontSize: "0.78rem", cursor: "pointer" };
const label: React.CSSProperties = { fontSize: "0.65rem", color: "rgba(255,255,255,0.4)", fontWeight: 700, letterSpacing: "0.08em", display: "block", marginBottom: 6 };
const sectionTitle: React.CSSProperties = { fontFamily: "'Russo One',sans-serif", fontSize: "1rem", marginBottom: 16, color: "#fff" };
const tag = (c: string): React.CSSProperties => ({ display: "inline-block", padding: "2px 10px", borderRadius: 100, fontSize: "0.65rem", fontWeight: 700, background: c === "ADMIN" ? "rgba(139,92,246,0.15)" : "rgba(60,184,46,0.12)", color: c === "ADMIN" ? "#A78BFA" : "#6FE840" });

// ─── Tab Button ───────────────────────────────────────────
function Tab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} style={{ padding: "10px 20px", fontSize: "0.82rem", fontWeight: 700, border: "none", borderBottom: active ? "2px solid #3CB82E" : "2px solid transparent", background: "transparent", color: active ? "#fff" : "rgba(255,255,255,0.35)", cursor: "pointer" }}>
      {children}
    </button>
  );
}

// ─── Tournaments Tab ──────────────────────────────────────
function TournamentsTab() {
  const [list, setList] = useState<Tournament[]>([]);
  const [form, setForm] = useState({ name: "", game: "Football", type: "League", description: "", prizePool: "", prizes: "", maxPlayers: 100, startDate: "", registrationMode: "OPEN", inviteCode: "" });
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<Tournament | null>(null);

  const load = useCallback(async () => {
    const r = await fetch("/api/tournaments"); if (r.ok) setList(await r.json());
  }, []);

  useEffect(() => { load(); }, [load]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    const r = await fetch("/api/tournaments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, maxPlayers: Number(form.maxPlayers) }) });
    if (r.ok) { load(); setForm({ name: "", game: "Football", type: "League", description: "", prizePool: "", prizes: "", maxPlayers: 100, startDate: "", registrationMode: "OPEN", inviteCode: "" }); }
    setSaving(false);
  };

  const patch = async (id: string, data: Partial<Tournament>) => {
    await fetch(`/api/admin/tournaments/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    load();
  };

  const del = async (id: string) => {
    if (!confirm("Delete this tournament?")) return;
    await fetch(`/api/admin/tournaments/${id}`, { method: "DELETE" }); load();
  };

  const F = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1.6fr", gap: 24 }}>
      {/* Create form */}
      <div>
        <h3 style={sectionTitle}>{editing ? "Edit Competition" : "Create Competition"}</h3>
        <form onSubmit={create} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div><label style={label}>NAME</label><input required style={inputStyle} value={form.name} onChange={e => F("name", e.target.value)} /></div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div><label style={label}>TYPE</label>
              <select style={inputStyle} value={form.type} onChange={e => F("type", e.target.value)}>
                <option>League</option><option>Cup</option>
              </select>
            </div>
            <div><label style={label}>GAME / SPORT</label><input style={inputStyle} value={form.game} onChange={e => F("game", e.target.value)} /></div>
          </div>
          <div><label style={label}>DESCRIPTION</label><textarea style={{ ...inputStyle, minHeight: 60 }} value={form.description} onChange={e => F("description", e.target.value)} /></div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div><label style={label}>PRIZE POOL</label><input style={inputStyle} value={form.prizePool} onChange={e => F("prizePool", e.target.value)} placeholder="e.g. $5,000" /></div>
            <div><label style={label}>MAX PLAYERS</label><input type="number" style={inputStyle} value={form.maxPlayers} onChange={e => F("maxPlayers", e.target.value)} /></div>
          </div>
          <div><label style={label}>PRIZES DETAIL (shown to users)</label><textarea style={{ ...inputStyle, minHeight: 60 }} placeholder="1st: $2,000 trophy&#10;2nd: $1,000&#10;3rd: $500" value={form.prizes} onChange={e => F("prizes", e.target.value)} /></div>
          <div><label style={label}>START DATE</label><input required type="datetime-local" style={inputStyle} value={form.startDate} onChange={e => F("startDate", e.target.value)} /></div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div><label style={label}>REGISTRATION</label>
              <select style={inputStyle} value={form.registrationMode} onChange={e => F("registrationMode", e.target.value)}>
                <option value="OPEN">Open</option><option value="INVITE_ONLY">Invite Only</option>
              </select>
            </div>
            {form.registrationMode === "INVITE_ONLY" && (
              <div><label style={label}>INVITE CODE</label><input style={inputStyle} value={form.inviteCode} onChange={e => F("inviteCode", e.target.value)} placeholder="e.g. MK2025" /></div>
            )}
          </div>
          <button type="submit" style={{ ...btnGreen, marginTop: 4 }} disabled={saving}>{saving ? "Creating…" : "Create Competition"}</button>
        </form>
      </div>

      {/* List */}
      <div>
        <h3 style={sectionTitle}>All Competitions ({list.length})</h3>
        <div style={{ maxHeight: 600, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
          {list.map(t => (
            <div key={t.id} style={card}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: "0.9rem" }}>{t.name}</div>
                  <div style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.4)", marginTop: 3 }}>
                    {t.type} · {t.game} · {t._count?.registrations ?? 0} joined · {t._count?.matches ?? 0} matches
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  {/* Status cycle */}
                  <select value={t.status} onChange={e => patch(t.id, { status: e.target.value })}
                    style={{ ...btnGhost, paddingRight: 6, fontSize: "0.72rem" }}>
                    <option value="UPCOMING">Upcoming</option><option value="ONGOING">Ongoing</option><option value="COMPLETED">Completed</option>
                  </select>
                  <button onClick={() => del(t.id)} style={{ ...btnGhost, color: "#F87171", borderColor: "rgba(248,113,113,0.25)" }}>Del</button>
                </div>
              </div>
              {/* Competition slug selector */}
              <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.35)", fontWeight: 700, letterSpacing: "0.08em", flexShrink: 0 }}>COMPETITION SLUG</span>
                <select
                  value={t.competition || "premier_league"}
                  onChange={e => patch(t.id, { competition: e.target.value })}
                  style={{ ...btnGhost, fontSize: "0.72rem", paddingRight: 6, color: "#08BDBD", borderColor: "rgba(8,189,189,0.3)", flex: 1 }}
                >
                  <option value="premier_league">🏴󠁧󠁢󠁥󠁮󠁧󠁿 premier_league</option>
                  <option value="la_liga">🇪🇸 la_liga</option>
                  <option value="champions_league">⭐ champions_league</option>
                  <option value="europa_league">🟠 europa_league</option>
                  <option value="egyptian_premier_league">🇪🇬 egyptian_premier_league</option>
                  <option value="world_cup">🌍 world_cup</option>
                  <option value="serie_a">🇮🇹 serie_a</option>
                  <option value="bundesliga">🇩🇪 bundesliga</option>
                  <option value="ligue_1">🇫🇷 ligue_1</option>
                  <option value="saudi_league">🇸🇦 saudi_league</option>
                  <option value="mls">🇺🇸 mls</option>
                </select>
              </div>
              <div style={{ marginTop: 8, fontSize: "0.72rem", color: "rgba(255,255,255,0.35)" }}>
                Prize: <b style={{ color: "#6FE840" }}>{t.prizePool}</b> · {t.registrationMode} · Starts {new Date(t.startDate).toLocaleDateString("en-GB")}
              </div>
              {t.prizes && <div style={{ marginTop: 6, fontSize: "0.7rem", color: "rgba(255,255,255,0.3)", whiteSpace: "pre-line" }}>{t.prizes}</div>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Sync Fixtures Tab ───────────────────────────────────
function SyncTab() {
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState("");
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    fetch("/api/admin/sync-fixtures").then(r => r.ok ? r.json() : null).then(setStatus);
  }, []);

  const sync = async (mode: string, leagueId?: number) => {
    setLoading(mode); setResult(null);
    const body: any = { mode };
    if (leagueId) body.leagueId = leagueId;
    const r = await fetch("/api/admin/sync-fixtures", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await r.json();
    setResult(data); setLoading("");
    fetch("/api/admin/sync-fixtures").then(r => r.ok ? r.json() : null).then(setStatus);
  };

  const POPULAR_LEAGUES = [
    { id: 39, name: "Premier League", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
    { id: 140, name: "La Liga", flag: "🇪🇸" },
    { id: 135, name: "Serie A", flag: "🇮🇹" },
    { id: 78, name: "Bundesliga", flag: "🇩🇪" },
    { id: 61, name: "Ligue 1", flag: "🇫🇷" },
    { id: 2, name: "Champions League", flag: "⭐" },
    { id: 3, name: "Europa League", flag: "🟠" },
    { id: 12, name: "CAF Champions League", flag: "🌍" },
    { id: 20, name: "CAF Confederation Cup", flag: "🌍" },
    { id: 233, name: "Egyptian Premier", flag: "🇪🇬" },
    { id: 307, name: "Saudi Pro League", flag: "🇸🇦" },
    { id: 253, name: "MLS", flag: "🇺🇸" },
  ];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: 24 }}>
      <div>
        <h3 style={sectionTitle}>📡 Sync Real Fixtures</h3>
        <div style={{ ...card, display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.4)", marginBottom: 4 }}>QUICK SYNC</div>
          <button style={btnGreen} disabled={!!loading} onClick={() => sync("today")}>
            {loading === "today" ? "Syncing..." : "⚡ Sync Today"}
          </button>
          <button style={{ ...btnGhost, textAlign: "left" }} disabled={!!loading} onClick={() => sync("week")}>
            {loading === "week" ? "Syncing..." : "📅 Sync Next 7 Days"}
          </button>
          <button style={{ ...btnGhost, textAlign: "left" }} disabled={!!loading} onClick={() => sync("month")}>
            {loading === "month" ? "Syncing..." : "🗓️ Sync Next 30 Days"}
          </button>
          <button style={{ ...btnGhost, textAlign: "left", borderColor: "rgba(255,153,20,0.3)", color: "#ff9914" }} disabled={!!loading} onClick={() => sync("update-live")}>
            {loading === "update-live" ? "Updating..." : "🔴 Update Live Scores"}
          </button>
        </div>

        <h3 style={{ ...sectionTitle, marginTop: 20 }}>Sync by League</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {POPULAR_LEAGUES.map(l => (
            <button key={l.id} style={{ ...btnGhost, textAlign: "left" }} disabled={!!loading}
              onClick={() => sync("league", l.id)}>
              {loading === `league-${l.id}` ? "Syncing..." : `${l.flag} ${l.name}`}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 style={sectionTitle}>📊 DB Status</h3>
        {status && (
          <div style={card}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {[
                { label: "Total Matches", value: status.total, color: "#fff" },
                { label: "Upcoming", value: status.upcoming, color: "#6FE840" },
                { label: "Live", value: status.live, color: "#ff4444" },
                { label: "Completed", value: status.completed, color: "rgba(255,255,255,0.4)" },
              ].map(s => (
                <div key={s.label} style={{ background: "rgba(255,255,255,0.03)", borderRadius: 10, padding: "14px 16px" }}>
                  <div style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.4)", marginBottom: 4 }}>{s.label}</div>
                  <div style={{ fontSize: "1.4rem", fontWeight: 800, color: s.color }}>{s.value}</div>
                </div>
              ))}
            </div>
            {status.lastSync && (
              <div style={{ marginTop: 12, fontSize: "0.72rem", color: "rgba(255,255,255,0.3)" }}>
                Last sync: {new Date(status.lastSync).toLocaleString("en-GB")}
              </div>
            )}
          </div>
        )}

        {result && (
          <div style={{ ...card, borderColor: result.error ? "rgba(255,68,68,0.3)" : "rgba(60,184,46,0.3)", marginTop: 16 }}>
            <div style={{ fontWeight: 700, color: result.error ? "#ff4444" : "#6FE840", marginBottom: 8 }}>
              {result.error ? `❌ Error: ${result.error}` : "✅ Sync Complete"}
            </div>
            {!result.error && (
              <div style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.6)", lineHeight: 1.8 }}>
                <div>📥 Fetched: <b style={{ color: "#fff" }}>{result.total}</b> fixtures</div>
                <div>✨ Created: <b style={{ color: "#6FE840" }}>{result.created}</b> new</div>
                <div>🔄 Updated: <b style={{ color: "#ff9914" }}>{result.updated}</b></div>
                <div>⏩ Skipped: <b style={{ color: "rgba(255,255,255,0.4)" }}>{result.skipped}</b></div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Matches Tab ──────────────────────────────────────────
function MatchesTab() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [selT, setSelT] = useState("");
  const [form, setForm] = useState({ homeTeam: "", awayTeam: "", matchDate: "", round: "Round 1" });
  const [saving, setSaving] = useState(false);
  const [resultId, setResultId] = useState<string | null>(null);
  const [result, setResult] = useState({ homeScore: 0, awayScore: 0, firstGoalScorer: "" });

  useEffect(() => { fetch("/api/tournaments").then(r => r.ok ? r.json() : []).then(setTournaments); }, []);
  useEffect(() => {
    if (!selT) return;
    fetch(`/api/matches?tournamentId=${selT}`).then(r => r.ok ? r.json() : []).then(setMatches);
  }, [selT]);

  const createMatch = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    await fetch("/api/matches", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, tournamentId: selT }) });
    fetch(`/api/matches?tournamentId=${selT}`).then(r => r.ok ? r.json() : []).then(setMatches);
    setForm({ homeTeam: "", awayTeam: "", matchDate: "", round: "Round 1" });
    setSaving(false);
  };

  const setMatchResult = async (id: string) => {
    await fetch(`/api/admin/matches/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...result, status: "COMPLETED" }) });
    fetch(`/api/matches?tournamentId=${selT}`).then(r => r.ok ? r.json() : []).then(setMatches);
    setResultId(null);
  };

  const delMatch = async (id: string) => {
    await fetch(`/api/admin/matches/${id}`, { method: "DELETE" });
    setMatches(ms => ms.filter(m => m.id !== id));
  };

  const F = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1.6fr", gap: 24 }}>
      <div>
        <h3 style={sectionTitle}>Add Match</h3>
        <div style={{ marginBottom: 14 }}>
          <label style={label}>SELECT COMPETITION</label>
          <select style={inputStyle} value={selT} onChange={e => setSelT(e.target.value)}>
            <option value="">-- Choose --</option>
            {tournaments.map(t => <option key={t.id} value={t.id}>{t.type}: {t.name}</option>)}
          </select>
        </div>
        {selT && (
          <form onSubmit={createMatch} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div><label style={label}>HOME TEAM</label><input required style={inputStyle} value={form.homeTeam} onChange={e => F("homeTeam", e.target.value)} /></div>
              <div><label style={label}>AWAY TEAM</label><input required style={inputStyle} value={form.awayTeam} onChange={e => F("awayTeam", e.target.value)} /></div>
            </div>
            <div><label style={label}>MATCH DATE</label><input required type="datetime-local" style={inputStyle} value={form.matchDate} onChange={e => F("matchDate", e.target.value)} /></div>
            <div><label style={label}>ROUND</label><input style={inputStyle} value={form.round} onChange={e => F("round", e.target.value)} placeholder="Round 1, Quarter-final…" /></div>
            <button type="submit" style={btnGreen} disabled={saving}>{saving ? "Adding…" : "Add Match"}</button>
          </form>
        )}
      </div>

      <div>
        <h3 style={sectionTitle}>Matches {selT ? `(${matches.length})` : "— select a competition"}</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: 560, overflowY: "auto" }}>
          {matches.map(m => (
            <div key={m.id} style={{ ...card, marginBottom: 0 }}>
              {resultId === m.id ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ fontWeight: 700, fontSize: "0.85rem", marginBottom: 4 }}>Set Result: {m.homeTeam} vs {m.awayTeam}</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <div><label style={label}>{m.homeTeam} SCORE</label><input type="number" min={0} style={inputStyle} value={result.homeScore} onChange={e => setResult(r => ({ ...r, homeScore: Number(e.target.value) }))} /></div>
                    <div><label style={label}>{m.awayTeam} SCORE</label><input type="number" min={0} style={inputStyle} value={result.awayScore} onChange={e => setResult(r => ({ ...r, awayScore: Number(e.target.value) }))} /></div>
                  </div>
                  <div><label style={label}>FIRST GOALSCORER</label><input style={inputStyle} value={result.firstGoalScorer} onChange={e => setResult(r => ({ ...r, firstGoalScorer: e.target.value }))} /></div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => setMatchResult(m.id)} style={btnGreen}>Save & Award XP</button>
                    <button onClick={() => setResultId(null)} style={btnGhost}>Cancel</button>
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: "0.85rem" }}>{m.homeTeam} vs {m.awayTeam}</div>
                    <div style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.35)", marginTop: 3 }}>
                      {m.round} · {new Date(m.matchDate).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      {m.status === "COMPLETED" && <span style={{ color: "#6FE840", marginLeft: 8 }}>{m.homeScore}–{m.awayScore}</span>}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    {m.status !== "COMPLETED" && (
                      <button onClick={() => { setResultId(m.id); setResult({ homeScore: 0, awayScore: 0, firstGoalScorer: "" }); }} style={btnGhost}>Set Result</button>
                    )}
                    <button onClick={() => delMatch(m.id)} style={{ ...btnGhost, color: "#F87171", borderColor: "rgba(248,113,113,0.2)" }}>Del</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Users Tab ────────────────────────────────────────────
function UsersTab() {
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    const r = await fetch("/api/admin/users"); if (r.ok) setUsers(await r.json());
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggleRole = async (u: User) => {
    const newRole = u.role === "ADMIN" ? "USER" : "ADMIN";
    if (!confirm(`Set ${u.name} to ${newRole}?`)) return;
    await fetch("/api/admin/users", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: u.id, role: newRole }) });
    load();
  };

  const filtered = users.filter(u => u.name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h3 style={{ ...sectionTitle, marginBottom: 0 }}>Users ({users.length})</h3>
        <input style={{ ...inputStyle, width: 240 }} placeholder="Search by name or email…" value={search} onChange={e => setSearch(e.target.value)} />
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
              {["Name", "Email", "Role", "XP", "Competitions", "Predictions", "Joined", "Action"].map(h => (
                <th key={h} style={{ textAlign: "left", padding: "8px 12px", fontSize: "0.65rem", fontWeight: 700, color: "rgba(255,255,255,0.35)", letterSpacing: "0.08em" }}>{h.toUpperCase()}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(u => (
              <tr key={u.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                <td style={{ padding: "10px 12px", fontWeight: 600 }}>{u.name}</td>
                <td style={{ padding: "10px 12px", color: "rgba(255,255,255,0.5)" }}>{u.email}</td>
                <td style={{ padding: "10px 12px" }}><span style={tag(u.role)}>{u.role}</span></td>
                <td style={{ padding: "10px 12px", color: "#6FE840", fontWeight: 700 }}>{u.xp.toLocaleString()}</td>
                <td style={{ padding: "10px 12px", color: "rgba(255,255,255,0.5)" }}>{u._count.registrations}</td>
                <td style={{ padding: "10px 12px", color: "rgba(255,255,255,0.5)" }}>{u._count.predictions}</td>
                <td style={{ padding: "10px 12px", color: "rgba(255,255,255,0.35)", fontSize: "0.75rem" }}>{new Date(u.createdAt).toLocaleDateString("en-GB")}</td>
                <td style={{ padding: "10px 12px" }}>
                  <button onClick={() => toggleRole(u)} style={{ ...btnGhost, fontSize: "0.72rem", padding: "5px 12px" }}>
                    {u.role === "ADMIN" ? "Demote" : "Make Admin"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Club Requests Tab ───────────────────────────────────
type ClubRequestRow = { id: string; clubName: string; leagueHint: string; continent: string; userId: string | null; status: string; createdAt: string };

function ClubRequestsTab() {
  const [rows, setRows] = useState<ClubRequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("PENDING");

  const load = useCallback(async () => {
    setLoading(true);
    const r = await fetch("/api/clubs/request");
    if (r.ok) setRows(await r.json());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const updateStatus = async (id: string, status: string) => {
    await fetch("/api/clubs/request", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    setRows(prev => prev.map(r => r.id === id ? { ...r, status } : r));
  };

  const statusColor = (s: string) => s === "ADDED" ? "#6FE840" : s === "REJECTED" ? "#F87171" : "#FBBF24";
  const filtered = rows.filter(r => filter === "ALL" || r.status === filter);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h3 style={{ ...sectionTitle, marginBottom: 0 }}>Club Requests ({rows.length})</h3>
        <div style={{ display: "flex", gap: 6 }}>
          {["ALL", "PENDING", "ADDED", "REJECTED"].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              style={{ ...btnGhost, fontSize: "0.72rem", padding: "5px 12px",
                borderColor: filter === f ? "rgba(60,184,46,0.4)" : undefined,
                color: filter === f ? "#6FE840" : undefined }}>
              {f}
            </button>
          ))}
          <button onClick={load} style={{ ...btnGhost, fontSize: "0.72rem", padding: "5px 12px" }}>↻ Refresh</button>
        </div>
      </div>

      {loading ? (
        <div style={{ color: "rgba(255,255,255,0.35)", padding: 32, textAlign: "center" }}>Loading…</div>
      ) : filtered.length === 0 ? (
        <div style={{ color: "rgba(255,255,255,0.3)", padding: 32, textAlign: "center" }}>No requests with status "{filter}".</div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                {["Club Name", "League / Country", "Continent", "Status", "Submitted", "Action"].map(h => (
                  <th key={h} style={{ textAlign: "left", padding: "8px 12px", fontSize: "0.65rem", fontWeight: 700, color: "rgba(255,255,255,0.35)", letterSpacing: "0.08em" }}>{h.toUpperCase()}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                  <td style={{ padding: "10px 12px", fontWeight: 700, color: "#fff" }}>{r.clubName}</td>
                  <td style={{ padding: "10px 12px", color: "rgba(255,255,255,0.5)" }}>{r.leagueHint || "—"}</td>
                  <td style={{ padding: "10px 12px", color: "rgba(255,255,255,0.4)", fontSize: "0.75rem", textTransform: "capitalize" }}>{r.continent || "—"}</td>
                  <td style={{ padding: "10px 12px" }}>
                    <span style={{ display: "inline-block", padding: "2px 10px", borderRadius: 100, fontSize: "0.65rem", fontWeight: 700, background: "rgba(255,255,255,0.06)", color: statusColor(r.status) }}>
                      {r.status}
                    </span>
                  </td>
                  <td style={{ padding: "10px 12px", color: "rgba(255,255,255,0.35)", fontSize: "0.75rem" }}>
                    {new Date(r.createdAt).toLocaleDateString("en-GB")}
                  </td>
                  <td style={{ padding: "10px 12px" }}>
                    <select value={r.status} onChange={e => updateStatus(r.id, e.target.value)}
                      style={{ ...btnGhost, fontSize: "0.72rem", paddingRight: 6 }}>
                      <option value="PENDING">Pending</option>
                      <option value="ADDED">Added ✓</option>
                      <option value="REJECTED">Rejected ✗</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── SA PSL Logos Review Tab ─────────────────────────────
function SaLogosTab() {
  const [teams, setTeams] = useState<{ id: number; name: string; logo: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const load = async () => {
    setLoading(true); setError(""); setTeams([]);
    try {
      const r = await fetch("/api/admin/sa-logos");
      const data = await r.json();
      if (!r.ok) { setError(data.error || "API error"); }
      else { setTeams(data.teams || []); }
    } catch (e: any) {
      setError(e.message || "Network error");
    }
    setLoading(false);
  };

  const jsSnippet = teams.length > 0
    ? `  // ── South African PSL ─────────────────────────────────────────────────\n` +
      teams.map(t => `  '${t.name}': '${t.logo}',`).join("\n")
    : "";

  const copySnippet = () => {
    navigator.clipboard.writeText(jsSnippet).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h3 style={sectionTitle}>🇿🇦 South African PSL Club Logos (api-football.com)</h3>
        <button style={btnGreen} onClick={load} disabled={loading}>
          {loading ? "Fetching…" : "Fetch from API"}
        </button>
      </div>

      {error && (
        <div style={{ ...card, borderColor: "rgba(248,113,113,0.3)", color: "#F87171", marginBottom: 20 }}>
          ❌ {error}
        </div>
      )}

      {teams.length > 0 && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 14, marginBottom: 24 }}>
            {teams.map(t => (
              <div key={t.id} style={{ ...card, textAlign: "center", padding: "16px 12px", marginBottom: 0 }}>
                <img
                  src={t.logo}
                  alt={t.name}
                  style={{ width: 64, height: 64, objectFit: "contain", marginBottom: 10 }}
                  onError={e => { (e.target as HTMLImageElement).style.opacity = "0.2"; }}
                />
                <div style={{ fontWeight: 700, fontSize: "0.8rem", lineHeight: 1.3 }}>{t.name}</div>
                <div style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.3)", marginTop: 4 }}>ID: {t.id}</div>
              </div>
            ))}
          </div>

          <div style={card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "rgba(255,255,255,0.5)", letterSpacing: "0.08em" }}>
                READY-TO-PASTE SNIPPET FOR app.js → STATIC_LOGO_MAP
              </div>
              <button style={btnGreen} onClick={copySnippet}>
                {copied ? "✅ Copied!" : "Copy Snippet"}
              </button>
            </div>
            <pre style={{ background: "rgba(0,0,0,0.4)", borderRadius: 10, padding: "14px 16px", fontSize: "0.72rem", color: "#6FE840", overflowX: "auto", whiteSpace: "pre-wrap", lineHeight: 1.7 }}>
              {jsSnippet}
            </pre>
          </div>
        </>
      )}

      {!loading && teams.length === 0 && !error && (
        <div style={{ color: "rgba(255,255,255,0.3)", padding: 48, textAlign: "center" }}>
          Click "Fetch from API" to load all PSL clubs and their official logos from api-football.com.
        </div>
      )}
    </div>
  );
}

// ─── Stats Overview ───────────────────────────────────────
function StatsTab() {
  const [stats, setStats] = useState<any>(null);
  useEffect(() => {
    Promise.all([fetch("/api/tournaments").then(r => r.json()), fetch("/api/admin/users").then(r => r.json())])
      .then(([ts, us]) => setStats({ tournaments: ts.length, users: us.length, totalXP: us.reduce((s: number, u: User) => s + u.xp, 0), upcoming: ts.filter((t: Tournament) => t.status === "UPCOMING").length }));
  }, []);

  const metrics = stats ? [
    { label: "Total Competitions", value: stats.tournaments, color: "#6FE840" },
    { label: "Upcoming", value: stats.upcoming, color: "#FBBF24" },
    { label: "Registered Users", value: stats.users, color: "#818CF8" },
    { label: "Total XP Awarded", value: stats.totalXP.toLocaleString(), color: "#F472B6" },
  ] : [];

  return (
    <div>
      <h3 style={sectionTitle}>Platform Overview</h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 30 }}>
        {metrics.map(m => (
          <div key={m.label} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: "20px 22px" }}>
            <div style={{ fontSize: "1.8rem", fontWeight: 800, color: m.color, fontFamily: "'Russo One',sans-serif" }}>{m.value}</div>
            <div style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.35)", fontWeight: 600, letterSpacing: "0.06em", marginTop: 4 }}>{m.label.toUpperCase()}</div>
          </div>
        ))}
      </div>
      <p style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.85rem" }}>Use the tabs above to manage competitions, matches, results, and users.</p>
    </div>
  );
}

// ─── Main Admin Page ──────────────────────────────────────
export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [tab, setTab] = useState<"overview" | "competitions" | "matches" | "sync" | "users" | "club-requests" | "sa-logos">("overview");

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    else if (session && session.user?.role !== "ADMIN") router.push("/dashboard");
  }, [session, status, router]);

  if (status === "loading" || !session) return <div style={{ color: "#fff", padding: 40, background: "#0A0E1A", minHeight: "100vh" }}>Loading…</div>;

  return (
    <div style={{ minHeight: "100vh", background: "#0A0E1A", color: "#fff", fontFamily: "'Chakra Petch',sans-serif" }}>
      {/* Header */}
      <div style={{ background: "rgba(255,255,255,0.03)", borderBottom: "1px solid rgba(255,255,255,0.07)", padding: "24px 24px 0" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "#3CB82E", letterSpacing: "0.12em", marginBottom: 4 }}>MATCHKOO</div>
              <h1 style={{ fontFamily: "'Russo One',sans-serif", fontSize: "1.6rem", margin: 0 }}>Admin Panel</h1>
            </div>
            <span style={{ background: "rgba(139,92,246,0.12)", color: "#A78BFA", padding: "4px 14px", borderRadius: 100, fontSize: "0.72rem", fontWeight: 700 }}>
              {session.user?.name} · ADMIN
            </span>
          </div>
          <div style={{ display: "flex" }}>
            <Tab active={tab === "overview"} onClick={() => setTab("overview")}>Overview</Tab>
            <Tab active={tab === "competitions"} onClick={() => setTab("competitions")}>Competitions</Tab>
            <Tab active={tab === "matches"} onClick={() => setTab("matches")}>Matches &amp; Results</Tab>
            <Tab active={tab === "sync"} onClick={() => setTab("sync")}>📡 Sync Fixtures</Tab>
            <Tab active={tab === "users"} onClick={() => setTab("users")}>Users</Tab>
            <Tab active={tab === "club-requests"} onClick={() => setTab("club-requests")}>🔍 Club Requests</Tab>
            <Tab active={tab === "sa-logos"} onClick={() => setTab("sa-logos")}>🇿🇦 SA Logos</Tab>
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 24px" }}>
        {tab === "overview"      && <StatsTab />}
        {tab === "competitions"  && <TournamentsTab />}
        {tab === "matches"       && <MatchesTab />}
        {tab === "sync"          && <SyncTab />}
        {tab === "users"         && <UsersTab />}
        {tab === "club-requests" && <ClubRequestsTab />}
        {tab === "sa-logos"      && <SaLogosTab />}
      </div>
    </div>
  );
}
