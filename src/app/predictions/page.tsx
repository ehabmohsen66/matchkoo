"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

type Match = {
  id: string;
  homeTeam: string;
  awayTeam: string;
  matchDate: string;
  round: string;
  status: string;
  homeScore: number | null;
  awayScore: number | null;
  tournament: { id: string; name: string; type: string };
  userPrediction: {
    homeScore: number;
    awayScore: number;
    firstGoalScorer?: string;
    confidence: number;
    isDouble: boolean;
    isShield: boolean;
    xpEarned?: number;
  } | null;
};

type GroupedMatches = Record<string, Record<string, Match[]>>;

const S = {
  page: { minHeight: "100vh", background: "#0A0E1A", color: "#fff", fontFamily: "'Chakra Petch', sans-serif" } as React.CSSProperties,
  header: { background: "rgba(255,255,255,0.03)", borderBottom: "1px solid rgba(255,255,255,0.07)", padding: "32px 24px 0" } as React.CSSProperties,
  inner: { maxWidth: 1100, margin: "0 auto" } as React.CSSProperties,
  tag: { fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.12em", color: "#3CB82E", marginBottom: 6, textTransform: "uppercase" } as React.CSSProperties,
  h1: { fontSize: "clamp(1.5rem,3vw,2rem)", fontWeight: 800, fontFamily: "'Russo One',sans-serif", margin: 0 } as React.CSSProperties,
  tabs: { display: "flex", gap: 0, marginTop: 20 } as React.CSSProperties,
};

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "10px 22px", fontSize: "0.8rem", fontWeight: 700, border: "none",
        borderBottom: active ? "2px solid #3CB82E" : "2px solid transparent",
        background: "transparent", color: active ? "#fff" : "rgba(255,255,255,0.35)",
        cursor: "pointer", transition: "all 0.2s",
      }}
    >{children}</button>
  );
}

function MatchCard({ match, onPredict }: { match: Match; onPredict: (m: Match) => void }) {
  const locked = new Date(match.matchDate) <= new Date() || match.status !== "UPCOMING";
  const p = match.userPrediction;
  const hasPrediction = !!p;

  return (
    <div style={{
      background: "rgba(255,255,255,0.04)", borderRadius: 14,
      border: hasPrediction ? "1px solid rgba(60,184,46,0.25)" : "1px solid rgba(255,255,255,0.07)",
      padding: 20, position: "relative",
    }}>
      {/* Tournament label */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <span style={{ fontSize: "0.65rem", fontWeight: 700, color: "#3CB82E", letterSpacing: "0.08em" }}>
          {match.tournament.type.toUpperCase()} · {match.tournament.name}
        </span>
        <div style={{ display: "flex", gap: 6 }}>
          {p?.isDouble && (
            <span style={{ background: "rgba(251,191,36,0.15)", color: "#FBBF24", fontSize: "0.65rem", fontWeight: 700, padding: "2px 8px", borderRadius: 100 }}>
              2× XP
            </span>
          )}
          {hasPrediction && (
            <span style={{ background: "rgba(60,184,46,0.12)", color: "#6FE840", fontSize: "0.65rem", fontWeight: 700, padding: "2px 8px", borderRadius: 100, display: "flex", alignItems: "center", gap: 4 }}>
              <svg viewBox="0 0 16 16" fill="currentColor" width="9" height="9"><path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.75.75 0 0 1 1.06-1.06L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0z"/></svg>
              Predicted
            </span>
          )}
        </div>
      </div>

      {/* Teams & score */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
        <div style={{ flex: 1, textAlign: "right", fontWeight: 700, fontSize: "0.95rem" }}>{match.homeTeam}</div>
        <div style={{ textAlign: "center", minWidth: 70 }}>
          {hasPrediction ? (
            <div style={{ fontSize: "1.2rem", fontWeight: 800, color: "#fff" }}>{p!.homeScore} – {p!.awayScore}</div>
          ) : (
            <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.25)", fontWeight: 600 }}>vs</div>
          )}
          <div style={{ fontSize: "0.6rem", color: "rgba(255,255,255,0.25)", marginTop: 2 }}>
            {new Date(match.matchDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
          </div>
        </div>
        <div style={{ flex: 1, fontWeight: 700, fontSize: "0.95rem" }}>{match.awayTeam}</div>
      </div>

      {/* Confidence bar */}
      {hasPrediction && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: "0.6rem", color: "rgba(255,255,255,0.3)", fontWeight: 700, marginBottom: 4 }}>
            CONFIDENCE {p!.confidence}%
          </div>
          <div style={{ height: 4, background: "rgba(255,255,255,0.08)", borderRadius: 100 }}>
            <div style={{ height: "100%", width: `${p!.confidence}%`, background: "linear-gradient(90deg,#3CB82E,#6FE840)", borderRadius: 100 }} />
          </div>
        </div>
      )}

      {/* Round info */}
      <div style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.25)", marginBottom: 12 }}>{match.round}</div>

      {/* CTA */}
      {!locked && (
        <button
          onClick={() => onPredict(match)}
          style={{
            width: "100%", padding: "9px", borderRadius: 100, border: "none",
            background: hasPrediction ? "rgba(255,255,255,0.06)" : "linear-gradient(135deg,#3CB82E,#6FE840)",
            color: hasPrediction ? "rgba(255,255,255,0.5)" : "#000",
            fontSize: "0.78rem", fontWeight: 800, cursor: "pointer",
          }}
        >
          {hasPrediction ? "Edit Prediction" : "Make Prediction"}
        </button>
      )}
      {locked && match.status === "COMPLETED" && p?.xpEarned != null && (
        <div style={{ textAlign: "center", fontSize: "0.8rem", fontWeight: 800, color: p.xpEarned < 0 ? "#F87171" : "#6FE840" }}>
          {p.xpEarned > 0 ? "+" : ""}{p.xpEarned} XP earned
        </div>
      )}
      {locked && match.status !== "COMPLETED" && (
        <div style={{ textAlign: "center", fontSize: "0.75rem", color: "rgba(255,255,255,0.25)", fontWeight: 600 }}>
          Predictions locked — match started
        </div>
      )}
    </div>
  );
}

function PredictModal({ match, onClose, onSave }: { match: Match; onClose: () => void; onSave: () => void }) {
  const p = match.userPrediction;
  const [home, setHome] = useState(p?.homeScore ?? 0);
  const [away, setAway] = useState(p?.awayScore ?? 0);
  const [fgs, setFgs] = useState(p?.firstGoalScorer ?? "");
  const [conf, setConf] = useState(p?.confidence ?? 50);
  const [isDouble, setIsDouble] = useState(p?.isDouble ?? false);
  const [isShield, setIsShield] = useState(p?.isShield ?? false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const save = async () => {
    setSaving(true); setError("");
    const res = await fetch("/api/predictions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ matchId: match.id, homeScore: home, awayScore: away, firstGoalScorer: fgs, confidence: conf, isDouble, isShield }),
    });
    if (res.ok) { onSave(); onClose(); }
    else { const d = await res.json(); setError(d.message || "Failed to save"); }
    setSaving(false);
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "#0F1628", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 20, width: "100%", maxWidth: 420, padding: 28 }}>
        <div style={{ fontSize: "0.65rem", fontWeight: 700, color: "#3CB82E", letterSpacing: "0.1em", marginBottom: 6 }}>MAKE PREDICTION</div>
        <h3 style={{ margin: "0 0 20px", fontFamily: "'Russo One',sans-serif", fontSize: "1.05rem" }}>
          {match.homeTeam} vs {match.awayTeam}
        </h3>

        {/* Score picker */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
          <div style={{ flex: 1, textAlign: "center" }}>
            <div style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.3)", fontWeight: 700, marginBottom: 8 }}>{match.homeTeam}</div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
              <button onClick={() => setHome(Math.max(0, home - 1))} style={scoreBtnStyle}>−</button>
              <span style={{ fontSize: "1.8rem", fontWeight: 800, minWidth: 40, textAlign: "center" }}>{home}</span>
              <button onClick={() => setHome(home + 1)} style={scoreBtnStyle}>+</button>
            </div>
          </div>
          <div style={{ color: "rgba(255,255,255,0.2)", fontWeight: 700 }}>–</div>
          <div style={{ flex: 1, textAlign: "center" }}>
            <div style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.3)", fontWeight: 700, marginBottom: 8 }}>{match.awayTeam}</div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
              <button onClick={() => setAway(Math.max(0, away - 1))} style={scoreBtnStyle}>−</button>
              <span style={{ fontSize: "1.8rem", fontWeight: 800, minWidth: 40, textAlign: "center" }}>{away}</span>
              <button onClick={() => setAway(away + 1)} style={scoreBtnStyle}>+</button>
            </div>
          </div>
        </div>

        {/* First goalscorer */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.4)", fontWeight: 700, letterSpacing: "0.08em", display: "block", marginBottom: 6 }}>
            FIRST GOALSCORER (optional)
          </label>
          <input
            value={fgs} onChange={e => setFgs(e.target.value)} placeholder="Player name..."
            style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "9px 14px", color: "#fff", fontSize: "0.85rem", fontFamily: "inherit", boxSizing: "border-box" }}
          />
        </div>

        {/* Confidence */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <label style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.4)", fontWeight: 700, letterSpacing: "0.08em" }}>CONFIDENCE</label>
            <span style={{ fontSize: "0.75rem", fontWeight: 800, color: "#6FE840" }}>{conf}%</span>
          </div>
          <input type="range" min={50} max={100} value={conf} onChange={e => setConf(Number(e.target.value))}
            style={{ width: "100%", accentColor: "#3CB82E" }} />
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.6rem", color: "rgba(255,255,255,0.2)", marginTop: 2 }}>
            <span>50% (×1.0)</span><span>75% (×1.5)</span><span>100% (×2.0)</span>
          </div>
        </div>

        {/* Double XP */}
        <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", marginBottom: 20, padding: "12px 14px", background: "rgba(251,191,36,0.06)", borderRadius: 10, border: "1px solid rgba(251,191,36,0.15)" }}>
          <input type="checkbox" checked={isDouble} onChange={e => setIsDouble(e.target.checked)} style={{ accentColor: "#FBBF24", width: 16, height: 16 }} />
          <div>
            <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "#FBBF24" }}>Double XP Joker</div>
            <div style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.3)" }}>Use one per round to double your XP on this match</div>
          </div>
        </label>

        {error && <div style={{ color: "#F87171", fontSize: "0.78rem", marginBottom: 12 }}>{error}</div>}

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: "10px", borderRadius: 100, border: "1px solid rgba(255,255,255,0.1)", background: "transparent", color: "rgba(255,255,255,0.5)", fontSize: "0.8rem", fontWeight: 700, cursor: "pointer" }}>
            Cancel
          </button>
          <button onClick={save} disabled={saving} style={{ flex: 2, padding: "10px", borderRadius: 100, border: "none", background: "linear-gradient(135deg,#3CB82E,#6FE840)", color: "#000", fontSize: "0.8rem", fontWeight: 800, cursor: "pointer" }}>
            {saving ? "Saving…" : "Save Prediction"}
          </button>
        </div>
      </div>
    </div>
  );
}

const scoreBtnStyle: React.CSSProperties = {
  width: 32, height: 32, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(255,255,255,0.05)", color: "#fff", fontSize: "1rem", cursor: "pointer",
  display: "flex", alignItems: "center", justifyContent: "center",
};

export default function Predictions() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeMatch, setActiveMatch] = useState<Match | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  const fetchMatches = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/matches`);
    if (res.ok) setMatches(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { fetchMatches(); }, [fetchMatches]);

  // Group: upcoming = not yet started; past = started/completed
  const now = new Date();
  const filtered = matches.filter(m =>
    tab === "upcoming"
      ? (m.status === "UPCOMING" || m.status === "LIVE")
      : m.status === "COMPLETED"
  );

  // Group by tournament type (League / Cup), then by round
  const grouped: GroupedMatches = {};
  filtered.forEach(m => {
    const typeKey = `${m.tournament.type}: ${m.tournament.name}`;
    if (!grouped[typeKey]) grouped[typeKey] = {};
    if (!grouped[typeKey][m.round]) grouped[typeKey][m.round] = [];
    grouped[typeKey][m.round].push(m);
  });

  return (
    <div style={S.page}>
      {/* Header */}
      <div style={S.header}>
        <div style={S.inner}>
          <div style={S.tag}>Predictions</div>
          <h1 style={S.h1}>My Predictions</h1>
          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.85rem", marginTop: 6 }}>
            Track your picks across leagues and cups
          </p>
          <div style={S.tabs}>
            <TabBtn active={tab === "upcoming"} onClick={() => setTab("upcoming")}>Upcoming</TabBtn>
            <TabBtn active={tab === "past"} onClick={() => setTab("past")}>Past</TabBtn>
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: "80px 0", color: "rgba(255,255,255,0.25)" }}>Loading matches…</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 24px", border: "1px dashed rgba(255,255,255,0.08)", borderRadius: 16 }}>
            <p style={{ color: "rgba(255,255,255,0.25)", fontSize: "0.9rem" }}>
              {tab === "upcoming" ? "No upcoming matches to predict." : "No past predictions yet."}
            </p>
          </div>
        ) : (
          Object.entries(grouped).map(([groupKey, rounds]) => (
            <div key={groupKey} style={{ marginBottom: 40 }}>
              {/* Group header */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                <div style={{ height: 1, flex: 1, background: "rgba(255,255,255,0.07)" }} />
                <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "#3CB82E", letterSpacing: "0.1em", whiteSpace: "nowrap" }}>
                  {groupKey.toUpperCase()}
                </span>
                <div style={{ height: 1, flex: 1, background: "rgba(255,255,255,0.07)" }} />
              </div>

              {Object.entries(rounds).map(([round, roundMatches]) => (
                <div key={round} style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: "0.68rem", fontWeight: 700, color: "rgba(255,255,255,0.3)", letterSpacing: "0.08em", marginBottom: 12 }}>
                    {round.toUpperCase()}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 14 }}>
                    {roundMatches.map(m => (
                      <MatchCard key={m.id} match={m} onPredict={setActiveMatch} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ))
        )}
      </div>

      {activeMatch && (
        <PredictModal
          match={activeMatch}
          onClose={() => setActiveMatch(null)}
          onSave={fetchMatches}
        />
      )}
    </div>
  );
}
