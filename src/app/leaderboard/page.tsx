"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Row = { rank: number; userId: string; name: string; image: string | null; xp: number; isMe: boolean };
type Tournament = { id: string; name: string; type: string };

const medalColor = (rank: number) =>
  rank === 1 ? "#FFD700" : rank === 2 ? "#C0C0C0" : rank === 3 ? "#CD7F32" : "rgba(255,255,255,0.2)";

export default function Leaderboard() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [scope, setScope] = useState<"overall" | string>("overall");
  const [rows, setRows] = useState<Row[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [myRow, setMyRow] = useState<Row | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  // Load user's registered tournaments for scope selector
  useEffect(() => {
    fetch("/api/tournaments").then(r => r.ok ? r.json() : []).then(data => {
      setTournaments(data.filter((t: any) => t.userRegistered));
    });
  }, []);

  useEffect(() => {
    setLoading(true);
    const url = scope === "overall" ? "/api/leaderboard" : `/api/leaderboard?tournamentId=${scope}`;
    fetch(url).then(r => r.ok ? r.json() : []).then(data => {
      setRows(data);
      setMyRow(data.find((r: Row) => r.isMe) ?? null);
      setLoading(false);
    });
  }, [scope]);

  return (
    <div style={{ minHeight: "100vh", background: "#0A0E1A", color: "#fff", fontFamily: "'Chakra Petch', sans-serif" }}>
      {/* Header */}
      <div style={{ background: "rgba(255,255,255,0.03)", borderBottom: "1px solid rgba(255,255,255,0.07)", padding: "32px 24px 24px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <div style={{ fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.12em", color: "#3CB82E", marginBottom: 6, textTransform: "uppercase" }}>Leaderboard</div>
          <h1 style={{ fontSize: "clamp(1.5rem,3vw,2rem)", fontWeight: 800, fontFamily: "'Russo One',sans-serif", margin: 0 }}>Rankings</h1>
          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.85rem", marginTop: 6 }}>Your rank in every league, cup, and all-time.</p>

          {/* Scope selector */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 20 }}>
            <button
              onClick={() => setScope("overall")}
              style={{ padding: "6px 18px", borderRadius: 100, fontSize: "0.78rem", fontWeight: 700, border: "1px solid", cursor: "pointer", transition: "all 0.2s", borderColor: scope === "overall" ? "#3CB82E" : "rgba(255,255,255,0.12)", background: scope === "overall" ? "rgba(60,184,46,0.12)" : "transparent", color: scope === "overall" ? "#6FE840" : "rgba(255,255,255,0.4)" }}
            >
              All-time
            </button>
            {tournaments.map(t => (
              <button
                key={t.id}
                onClick={() => setScope(t.id)}
                style={{ padding: "6px 18px", borderRadius: 100, fontSize: "0.78rem", fontWeight: 700, border: "1px solid", cursor: "pointer", transition: "all 0.2s", borderColor: scope === t.id ? "#3CB82E" : "rgba(255,255,255,0.12)", background: scope === t.id ? "rgba(60,184,46,0.12)" : "transparent", color: scope === t.id ? "#6FE840" : "rgba(255,255,255,0.4)" }}
              >
                {t.type}: {t.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "32px 24px" }}>
        {/* My rank callout */}
        {myRow && (
          <div style={{ background: "rgba(60,184,46,0.08)", border: "1px solid rgba(60,184,46,0.2)", borderRadius: 14, padding: "16px 20px", marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#6FE840" }}>Your Position</div>
            <div style={{ display: "flex", gap: 24 }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "1.4rem", fontWeight: 800, fontFamily: "'Russo One',sans-serif" }}>#{myRow.rank}</div>
                <div style={{ fontSize: "0.6rem", color: "rgba(255,255,255,0.3)", letterSpacing: "0.08em" }}>RANK</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "#6FE840", fontFamily: "'Russo One',sans-serif" }}>{myRow.xp.toLocaleString()}</div>
                <div style={{ fontSize: "0.6rem", color: "rgba(255,255,255,0.3)", letterSpacing: "0.08em" }}>XP</div>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: "rgba(255,255,255,0.25)" }}>Loading rankings…</div>
        ) : rows.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 24px", border: "1px dashed rgba(255,255,255,0.08)", borderRadius: 16 }}>
            <p style={{ color: "rgba(255,255,255,0.25)", fontSize: "0.9rem" }}>No rankings yet — be the first to predict!</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {rows.map(row => (
              <div
                key={row.userId}
                style={{
                  background: row.isMe ? "rgba(60,184,46,0.06)" : "rgba(255,255,255,0.03)",
                  border: row.isMe ? "1px solid rgba(60,184,46,0.2)" : "1px solid rgba(255,255,255,0.06)",
                  borderRadius: 12, padding: "14px 18px",
                  display: "flex", alignItems: "center", gap: 14,
                }}
              >
                {/* Rank */}
                <div style={{ width: 36, textAlign: "center", fontSize: row.rank <= 3 ? "1.1rem" : "0.9rem", fontWeight: 800, color: medalColor(row.rank), fontFamily: "'Russo One',sans-serif", flexShrink: 0 }}>
                  {row.rank <= 3 ? ["🥇", "🥈", "🥉"][row.rank - 1] : `#${row.rank}`}
                </div>

                {/* Avatar */}
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(60,184,46,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.85rem", fontWeight: 700, color: "#6FE840", flexShrink: 0, overflow: "hidden" }}>
                  {row.image ? <img src={row.image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : (row.name?.[0] ?? "?")}
                </div>

                {/* Name */}
                <div style={{ flex: 1, fontWeight: row.isMe ? 700 : 500, fontSize: "0.88rem" }}>
                  {row.name} {row.isMe && <span style={{ fontSize: "0.65rem", color: "#6FE840", fontWeight: 700, marginLeft: 4 }}>(you)</span>}
                </div>

                {/* XP */}
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "0.95rem", fontWeight: 800, color: row.isMe ? "#6FE840" : "#fff" }}>
                    {row.xp.toLocaleString()}
                  </div>
                  <div style={{ fontSize: "0.6rem", color: "rgba(255,255,255,0.25)", letterSpacing: "0.06em" }}>XP</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
