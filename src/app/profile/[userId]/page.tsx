"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";

// ── Types ─────────────────────────────────────────────────────────────────────

type CompletedPrediction = {
  id: string;
  homeScore: number;
  awayScore: number;
  firstGoalScorer: string | null;
  xpEarned: number | null;
  isDouble: boolean;
  isShield: boolean;
  btts: boolean | null;
  totalGoals: number | null;
  match: {
    homeTeam: string;
    awayTeam: string;
    homeLogo: string | null;
    awayLogo: string | null;
    homeScore: number | null;
    awayScore: number | null;
    matchDate: string;
    round: string;
    tournament: { id: string; name: string; type: string };
  };
};

type PublicProfile = {
  id: string;
  name: string | null;
  image: string | null;
  country: string | null;
  xp: number;
  streak: number;
  bestStreak: number;
  predictionCount: number;
  correctCount: number;
  createdAt: string;
  completedPredictions: CompletedPrediction[];
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const COUNTRY_FLAGS: Record<string, string> = {
  EG: "🇪🇬", GB: "🇬🇧", US: "🇺🇸", SA: "🇸🇦", AE: "🇦🇪", FR: "🇫🇷",
  DE: "🇩🇪", ES: "🇪🇸", IT: "🇮🇹", BR: "🇧🇷", AR: "🇦🇷", MA: "🇲🇦",
  DZ: "🇩🇿", TN: "🇹🇳", NG: "🇳🇬", GH: "🇬🇭",
};

function countryFlag(code: string | null) {
  return code ? (COUNTRY_FLAGS[code.toUpperCase()] ?? "🌍") : "🌍";
}

function xpBreakdownLabel(pred: CompletedPrediction): { label: string; color: string } {
  const { xpEarned, homeScore, awayScore, match } = pred;
  if (xpEarned == null || xpEarned === 0) return { label: "No points", color: "rgba(255,255,255,0.3)" };
  if (xpEarned < 0) return { label: "Wrong Prediction", color: "#F87171" };

  const exactScore = homeScore === match.homeScore && awayScore === match.awayScore;
  if (exactScore) return { label: "Exact score ✨", color: "#FBBF24" };

  const actualResult =
    match.homeScore != null && match.awayScore != null
      ? match.homeScore > match.awayScore ? "H" : match.awayScore > match.homeScore ? "A" : "D"
      : null;
  const predResult = homeScore > awayScore ? "H" : awayScore > homeScore ? "A" : "D";
  if (actualResult && predResult === actualResult) return { label: "Result Correct", color: "#6FE840" };

  return { label: "Points earned", color: "#6FE840" };
}

function memberSince(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-GB", { month: "long", year: "numeric" });
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function PublicProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams<{ userId: string }>();
  const userId = params.userId;

  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all"); // "all" | tournamentId

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (!userId || status !== "authenticated") return;
    setLoading(true);
    fetch(`/api/users/${userId}/profile`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((data) => { setProfile(data); setLoading(false); })
      .catch((code) => {
        setError(code === 404 ? "User not found." : "Failed to load profile.");
        setLoading(false);
      });
  }, [userId, status]);

  const isMe = session?.user?.id === userId;

  // Tournaments this user has predictions in
  const tournaments = profile
    ? Array.from(
        new Map(
          profile.completedPredictions.map((p) => [
            p.match.tournament.id,
            p.match.tournament,
          ])
        ).values()
      )
    : [];

  const filteredPredictions =
    filter === "all"
      ? profile?.completedPredictions ?? []
      : (profile?.completedPredictions ?? []).filter(
          (p) => p.match.tournament.id === filter
        );

  const accuracy =
    profile && profile.predictionCount > 0
      ? Math.round((profile.correctCount / profile.predictionCount) * 100)
      : 0;

  // ── Render ──────────────────────────────────────────────────────────────────

  if (loading || status === "loading") {
    return (
      <div style={{ minHeight: "100vh", background: "#0A0E1A", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: 40, height: 40, border: "3px solid rgba(60,184,46,0.3)", borderTopColor: "#6FE840", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 16px" }} />
          <div style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.85rem", fontFamily: "'Chakra Petch', sans-serif" }}>Loading profile…</div>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: "100vh", background: "#0A0E1A", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, fontFamily: "'Chakra Petch', sans-serif" }}>
        <div style={{ fontSize: "3rem" }}>😕</div>
        <div style={{ color: "rgba(255,255,255,0.5)" }}>{error}</div>
        <Link href="/leaderboard" style={{ color: "#6FE840", textDecoration: "none", fontSize: "0.85rem", fontWeight: 700 }}>← Back to Leaderboard</Link>
      </div>
    );
  }

  if (!profile) return null;

  const totalXpFromCompleted = filteredPredictions.reduce((s, p) => s + (p.xpEarned ?? 0), 0);

  return (
    <div style={{ minHeight: "100vh", background: "#0A0E1A", color: "#fff", fontFamily: "'Chakra Petch', sans-serif", paddingBottom: 80 }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .pred-card { animation: fadeUp 0.35s ease both; }
        .pred-card:hover { border-color: rgba(60,184,46,0.3) !important; background: rgba(255,255,255,0.06) !important; }
        .stat-card { transition: transform 0.2s, box-shadow 0.2s; }
        .stat-card:hover { transform: translateY(-2px); box-shadow: 0 8px 32px rgba(60,184,46,0.12); }
      `}</style>

      {/* ── Back nav ── */}
      <div style={{ background: "rgba(255,255,255,0.02)", borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "14px 24px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <Link href="/leaderboard" style={{ color: "rgba(255,255,255,0.4)", textDecoration: "none", fontSize: "0.8rem", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 6, transition: "color 0.2s" }}>
            <span>←</span> Leaderboard
          </Link>
        </div>
      </div>

      {/* ── Hero header ── */}
      <div style={{ background: "linear-gradient(180deg, rgba(60,184,46,0.07) 0%, transparent 100%)", borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "40px 24px 36px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", display: "flex", alignItems: "flex-start", gap: 24, flexWrap: "wrap" }}>
          {/* Avatar */}
          <div style={{ position: "relative", flexShrink: 0 }}>
            <div style={{
              width: 88, height: 88, borderRadius: "50%",
              background: "linear-gradient(135deg, rgba(60,184,46,0.3), rgba(60,184,46,0.1))",
              border: "3px solid rgba(60,184,46,0.4)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "2rem", fontWeight: 700, color: "#6FE840",
              overflow: "hidden",
            }}>
              {profile.image
                ? <img src={profile.image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : (profile.name?.[0]?.toUpperCase() ?? "?")}
            </div>
            {/* Country flag badge */}
            <div style={{
              position: "absolute", bottom: 0, right: 0,
              background: "#0A0E1A", border: "2px solid rgba(255,255,255,0.1)",
              borderRadius: "50%", width: 28, height: 28,
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.9rem",
            }}>
              {countryFlag(profile.country)}
            </div>
          </div>

          {/* Name + meta */}
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 4 }}>
              <h1 style={{ margin: 0, fontSize: "clamp(1.4rem, 3vw, 1.9rem)", fontWeight: 800, fontFamily: "'Russo One', sans-serif" }}>
                {profile.name ?? "Anonymous"}
              </h1>
              {isMe && (
                <span style={{ fontSize: "0.65rem", fontWeight: 700, color: "#6FE840", background: "rgba(60,184,46,0.15)", border: "1px solid rgba(60,184,46,0.3)", padding: "3px 10px", borderRadius: 100, letterSpacing: "0.08em" }}>
                  YOU
                </span>
              )}
            </div>
            <div style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.35)", marginBottom: 12 }}>
              Member since {memberSince(profile.createdAt)}
            </div>

            {/* XP + streak badges */}
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <div style={{ background: "rgba(60,184,46,0.12)", border: "1px solid rgba(60,184,46,0.25)", borderRadius: 100, padding: "5px 14px", fontSize: "0.8rem", fontWeight: 800, color: "#6FE840", display: "flex", alignItems: "center", gap: 6 }}>
                ⚡ {profile.xp.toLocaleString()} XP
              </div>
              <div style={{ background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.25)", borderRadius: 100, padding: "5px 14px", fontSize: "0.8rem", fontWeight: 700, color: "#FBBF24", display: "flex", alignItems: "center", gap: 6 }}>
                🔥 {profile.streak} streak
              </div>
              {profile.bestStreak > 0 && (
                <div style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 100, padding: "5px 14px", fontSize: "0.8rem", fontWeight: 600, color: "rgba(255,255,255,0.45)", display: "flex", alignItems: "center", gap: 6 }}>
                  🏆 Best: {profile.bestStreak}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "32px 24px 0" }}>

        {/* ── Stats grid ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 40 }}>
          {[
            { label: "Total XP", value: profile.xp.toLocaleString(), icon: "⚡", color: "#6FE840" },
            { label: "Predictions", value: profile.predictionCount, icon: "📋", color: "#fff" },
            { label: "Correct", value: profile.correctCount, icon: "✅", color: "#6FE840" },
            { label: "Accuracy", value: `${accuracy}%`, icon: "🎯", color: accuracy >= 60 ? "#6FE840" : accuracy >= 40 ? "#FBBF24" : "rgba(255,255,255,0.5)" },
            { label: "Streak", value: profile.streak, icon: "🔥", color: "#FBBF24" },
            { label: "Best Streak", value: profile.bestStreak, icon: "🏆", color: "#FBBF24" },
          ].map((stat) => (
            <div key={stat.label} className="stat-card" style={{
              background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: 14, padding: "16px 18px",
            }}>
              <div style={{ fontSize: "1.1rem", marginBottom: 4 }}>{stat.icon}</div>
              <div style={{ fontSize: "1.4rem", fontWeight: 800, color: stat.color, fontFamily: "'Russo One', sans-serif", lineHeight: 1 }}>
                {stat.value}
              </div>
              <div style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.3)", fontWeight: 700, letterSpacing: "0.08em", marginTop: 4, textTransform: "uppercase" }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        {/* ── Predictions section ── */}
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, fontFamily: "'Russo One', sans-serif" }}>
                Completed Predictions
              </h2>
              <div style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.3)", marginTop: 3 }}>
                {filteredPredictions.length} prediction{filteredPredictions.length !== 1 ? "s" : ""} · {totalXpFromCompleted.toLocaleString()} XP earned
              </div>
            </div>

            {/* Tournament filter */}
            {tournaments.length > 1 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                <button
                  onClick={() => setFilter("all")}
                  style={{ padding: "5px 14px", borderRadius: 100, fontSize: "0.72rem", fontWeight: 700, border: "1px solid", cursor: "pointer", transition: "all 0.2s", borderColor: filter === "all" ? "#3CB82E" : "rgba(255,255,255,0.12)", background: filter === "all" ? "rgba(60,184,46,0.12)" : "transparent", color: filter === "all" ? "#6FE840" : "rgba(255,255,255,0.4)" }}
                >
                  All
                </button>
                {tournaments.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setFilter(t.id)}
                    style={{ padding: "5px 14px", borderRadius: 100, fontSize: "0.72rem", fontWeight: 700, border: "1px solid", cursor: "pointer", transition: "all 0.2s", borderColor: filter === t.id ? "#3CB82E" : "rgba(255,255,255,0.12)", background: filter === t.id ? "rgba(60,184,46,0.12)" : "transparent", color: filter === t.id ? "#6FE840" : "rgba(255,255,255,0.4)" }}
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {filteredPredictions.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 24px", border: "1px dashed rgba(255,255,255,0.08)", borderRadius: 16 }}>
              <div style={{ fontSize: "2.5rem", marginBottom: 12 }}>📭</div>
              <p style={{ color: "rgba(255,255,255,0.25)", fontSize: "0.9rem", margin: 0 }}>
                No completed predictions yet.
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {filteredPredictions.map((pred, idx) => {
                const { label: bpLabel, color: bpColor } = xpBreakdownLabel(pred);
                const won = (pred.xpEarned ?? 0) > 0;
                const exactScore = pred.homeScore === pred.match.homeScore && pred.awayScore === pred.match.awayScore;

                return (
                  <div
                    key={pred.id}
                    className="pred-card"
                    style={{
                      background: "rgba(255,255,255,0.035)",
                      border: `1px solid ${won ? "rgba(60,184,46,0.12)" : "rgba(255,255,255,0.06)"}`,
                      borderRadius: 14,
                      padding: "16px 20px",
                      animationDelay: `${idx * 0.04}s`,
                      transition: "border-color 0.2s, background 0.2s",
                    }}
                  >
                    {/* Row 1: tournament + date */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 6 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: "0.65rem", fontWeight: 700, padding: "2px 8px", borderRadius: 100, background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.4)", letterSpacing: "0.06em" }}>
                          {pred.match.tournament.type.toUpperCase()}
                        </span>
                        <span style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.5)", fontWeight: 600 }}>
                          {pred.match.tournament.name}
                        </span>
                        <span style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.25)" }}>
                          · {pred.match.round}
                        </span>
                      </div>
                      <span style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.3)" }}>
                        {new Date(pred.match.matchDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                      </span>
                    </div>

                    {/* Row 2: match teams + scores */}
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                      {/* Home team */}
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, justifyContent: "flex-end" }}>
                        <span style={{ fontSize: "0.88rem", fontWeight: 700, textAlign: "right" }}>{pred.match.homeTeam}</span>
                        {pred.match.homeLogo && (
                          <img src={pred.match.homeLogo} alt="" style={{ width: 24, height: 24, objectFit: "contain" }} />
                        )}
                      </div>

                      {/* Score comparison */}
                      <div style={{ textAlign: "center", flexShrink: 0 }}>
                        {/* Actual score */}
                        <div style={{ fontSize: "1.1rem", fontWeight: 800, fontFamily: "'Russo One', sans-serif", color: "#fff", letterSpacing: "0.05em" }}>
                          {pred.match.homeScore ?? "?"} – {pred.match.awayScore ?? "?"}
                        </div>
                        <div style={{ fontSize: "0.58rem", color: "rgba(255,255,255,0.25)", letterSpacing: "0.08em", marginBottom: 3 }}>ACTUAL</div>
                        {/* Predicted score */}
                        <div style={{
                          fontSize: "0.82rem", fontWeight: 700, letterSpacing: "0.04em",
                          color: exactScore ? "#FBBF24" : won ? "#6FE840" : "rgba(255,255,255,0.4)",
                          background: exactScore ? "rgba(251,191,36,0.1)" : won ? "rgba(60,184,46,0.1)" : "rgba(255,255,255,0.04)",
                          border: `1px solid ${exactScore ? "rgba(251,191,36,0.25)" : won ? "rgba(60,184,46,0.2)" : "rgba(255,255,255,0.08)"}`,
                          borderRadius: 6, padding: "2px 8px",
                        }}>
                          {pred.homeScore} – {pred.awayScore}
                        </div>
                        <div style={{ fontSize: "0.58rem", color: "rgba(255,255,255,0.25)", letterSpacing: "0.08em", marginTop: 3 }}>PREDICTED</div>
                      </div>

                      {/* Away team */}
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
                        {pred.match.awayLogo && (
                          <img src={pred.match.awayLogo} alt="" style={{ width: 24, height: 24, objectFit: "contain" }} />
                        )}
                        <span style={{ fontSize: "0.88rem", fontWeight: 700 }}>{pred.match.awayTeam}</span>
                      </div>
                    </div>

                    {/* Row 3: XP breakdown + badges */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8, paddingTop: 10, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                        {/* Outcome icon */}
                        <span style={{ fontSize: "0.85rem" }}>{won ? (exactScore ? "🌟" : "✅") : "❌"}</span>
                        <span style={{ fontSize: "0.75rem", fontWeight: 600, color: bpColor }}>{bpLabel}</span>

                        {/* Joker badge */}
                        {pred.isDouble && (
                          <span style={{ fontSize: "0.62rem", fontWeight: 700, padding: "2px 8px", borderRadius: 100, background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.3)", color: "#A78BFA", letterSpacing: "0.06em" }}>
                            🃏 JOKER 2×
                          </span>
                        )}
                        {/* Shield badge */}
                        {pred.isShield && (
                          <span style={{ fontSize: "0.62rem", fontWeight: 700, padding: "2px 8px", borderRadius: 100, background: "rgba(59,130,246,0.12)", border: "1px solid rgba(59,130,246,0.3)", color: "#60A5FA", letterSpacing: "0.06em" }}>
                            🛡️ SHIELD
                          </span>
                        )}
                        {/* First scorer */}
                        {pred.firstGoalScorer && (
                          <span style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.3)", fontStyle: "italic" }}>
                            ⚽ {pred.firstGoalScorer}
                          </span>
                        )}
                      </div>

                      {/* XP pill */}
                      <div style={{
                        fontSize: "0.85rem", fontWeight: 800,
                        color: won ? "#6FE840" : (pred.xpEarned ?? 0) < 0 ? "#F87171" : "rgba(255,255,255,0.25)",
                        background: won ? "rgba(60,184,46,0.1)" : (pred.xpEarned ?? 0) < 0 ? "rgba(248,113,113,0.1)" : "rgba(255,255,255,0.04)",
                        border: `1px solid ${ won ? "rgba(60,184,46,0.25)" : (pred.xpEarned ?? 0) < 0 ? "rgba(248,113,113,0.25)" : "rgba(255,255,255,0.08)"}`,
                        borderRadius: 100, padding: "4px 12px",
                        fontFamily: "'Russo One', sans-serif",
                      }}>
                        {won ? `+${pred.xpEarned}` : (pred.xpEarned ?? 0) < 0 ? `${pred.xpEarned}` : "0"} XP
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
