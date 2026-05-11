"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

type Tournament = {
  id: string;
  name: string;
  game: string;
  description: string;
  status: string;
  prizePool: string;
  maxPlayers: number;
  startDate: string;
  userRegistered: boolean;
  _count?: { registrations: number };
};

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  UPCOMING: { label: "Upcoming", color: "bg-[#3CB82E]/15 text-[#6FE840]" },
  ONGOING:  { label: "Live",     color: "bg-yellow-500/15 text-yellow-400" },
  COMPLETED:{ label: "Ended",    color: "bg-white/10 text-white/40" },
};

export default function Discover() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"ALL" | "League" | "Cup">("ALL");
  const [joining, setJoining] = useState<string | null>(null);

  useEffect(() => { fetchTournaments(); }, []);

  const fetchTournaments = async () => {
    setLoading(true);
    const res = await fetch("/api/tournaments");
    if (res.ok) setTournaments(await res.json());
    setLoading(false);
  };

  const handleJoin = async (id: string) => {
    if (status !== "authenticated") { router.push("/login"); return; }
    setJoining(id);
    const res = await fetch(`/api/tournaments/${id}/register`, { method: "POST" });
    if (res.ok) {
      fetchTournaments();
    } else {
      const data = await res.json();
      alert(data.message || "Failed to join");
    }
    setJoining(null);
  };

  const visible = tournaments.filter(t =>
    filter === "ALL" ? true :
    filter === "Cup"   ? t.game.toLowerCase().includes("cup")    : true
  );

  return (
    <div
      className="min-h-screen"
      style={{ background: "#0A0E1A", color: "#fff", fontFamily: "'Chakra Petch', sans-serif" }}
    >
      {/* Header */}
      <div style={{ background: "rgba(255,255,255,0.03)", borderBottom: "1px solid rgba(255,255,255,0.07)", padding: "32px 24px 24px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.12em", color: "#3CB82E", marginBottom: 6, textTransform: "uppercase" }}>
            Discover
          </div>
          <h1 style={{ fontSize: "clamp(1.6rem, 3vw, 2.2rem)", fontWeight: 800, fontFamily: "'Russo One', sans-serif", margin: 0 }}>
            Leagues &amp; Cups
          </h1>
          <p style={{ color: "rgba(255,255,255,0.45)", fontSize: "0.88rem", marginTop: 6 }}>
            Browse leagues and cups across every continent
          </p>

          {/* Filter tabs */}
          <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
            {(["ALL", "League", "Cup"] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  padding: "6px 18px",
                  borderRadius: 100,
                  fontSize: "0.78rem",
                  fontWeight: 700,
                  border: "1px solid",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  borderColor: filter === f ? "#3CB82E" : "rgba(255,255,255,0.12)",
                  background: filter === f ? "rgba(60,184,46,0.12)" : "transparent",
                  color: filter === f ? "#6FE840" : "rgba(255,255,255,0.5)",
                }}
              >
                {f === "ALL" ? "All" : f + "s"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 24px" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: "80px 0", color: "rgba(255,255,255,0.3)", fontSize: "0.9rem" }}>
            Loading leagues &amp; cups…
          </div>
        ) : visible.length === 0 ? (
          <div style={{
            textAlign: "center", padding: "80px 0",
            border: "1px dashed rgba(255,255,255,0.1)", borderRadius: 16,
          }}>
            <div style={{ fontSize: "2rem", marginBottom: 12 }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" width="48" height="48" style={{ margin: "0 auto 8px" }}>
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 8v4l3 3"/>
              </svg>
            </div>
            <p style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.95rem" }}>
              No available {filter === "ALL" ? "leagues or cups" : filter.toLowerCase() + "s"} right now.
            </p>
            <p style={{ color: "rgba(255,255,255,0.2)", fontSize: "0.8rem", marginTop: 4 }}>
              Check back later — new competitions are added by admins regularly.
            </p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 20 }}>
            {visible.map(t => {
              const st = STATUS_LABEL[t.status] || { label: t.status, color: "bg-white/10 text-white/40" };
              const isFull = (t._count?.registrations ?? 0) >= t.maxPlayers;
              const spotsLeft = t.maxPlayers - (t._count?.registrations ?? 0);

              return (
                <div
                  key={t.id}
                  style={{
                    background: "rgba(255,255,255,0.035)",
                    border: t.userRegistered
                      ? "1px solid rgba(60,184,46,0.35)"
                      : "1px solid rgba(255,255,255,0.07)",
                    borderRadius: 16,
                    padding: "22px 22px 18px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 14,
                    position: "relative",
                    transition: "border-color 0.2s",
                  }}
                >
                  {/* Registered badge */}
                  {t.userRegistered && (
                    <div style={{
                      position: "absolute", top: 14, right: 14,
                      display: "flex", alignItems: "center", gap: 5,
                      background: "rgba(60,184,46,0.15)", borderRadius: 100,
                      padding: "3px 10px", fontSize: "0.68rem", fontWeight: 700,
                      color: "#6FE840", letterSpacing: "0.06em",
                    }}>
                      <svg viewBox="0 0 16 16" fill="currentColor" width="10" height="10">
                        <path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.75.75 0 0 1 1.06-1.06L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0z"/>
                      </svg>
                      Joined
                    </div>
                  )}

                  {/* Status + type */}
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <span style={{
                      fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.08em",
                      padding: "3px 10px", borderRadius: 100,
                      background: t.status === "UPCOMING" ? "rgba(60,184,46,0.12)" : t.status === "ONGOING" ? "rgba(234,179,8,0.12)" : "rgba(255,255,255,0.06)",
                      color: t.status === "UPCOMING" ? "#6FE840" : t.status === "ONGOING" ? "#FBBF24" : "rgba(255,255,255,0.3)",
                    }}>
                      {st.label}
                    </span>
                    <span style={{ fontSize: "0.68rem", fontWeight: 600, color: "rgba(255,255,255,0.35)" }}>
                      {t.game}
                    </span>
                  </div>

                  {/* Name */}
                  <div>
                    <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700, fontFamily: "'Russo One', sans-serif" }}>
                      {t.name}
                    </h3>
                    {t.description && (
                      <p style={{ margin: "6px 0 0", fontSize: "0.8rem", color: "rgba(255,255,255,0.4)", lineHeight: 1.5,
                        display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                        {t.description}
                      </p>
                    )}
                  </div>

                  {/* Stats row */}
                  <div style={{
                    display: "flex", justifyContent: "space-between",
                    borderTop: "1px solid rgba(255,255,255,0.07)", paddingTop: 14,
                  }}>
                    <div>
                      <div style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.3)", fontWeight: 700, letterSpacing: "0.08em", marginBottom: 2 }}>PRIZE POOL</div>
                      <div style={{ fontSize: "1rem", fontWeight: 800, color: "#6FE840" }}>{t.prizePool}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.3)", fontWeight: 700, letterSpacing: "0.08em", marginBottom: 2 }}>SPOTS</div>
                      <div style={{ fontSize: "1rem", fontWeight: 800, color: isFull ? "rgba(255,255,255,0.3)" : "#fff" }}>
                        {t._count?.registrations ?? 0}
                        <span style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.3)", fontWeight: 500 }}>/{t.maxPlayers}</span>
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.3)", fontWeight: 700, letterSpacing: "0.08em", marginBottom: 2 }}>STARTS</div>
                      <div style={{ fontSize: "0.8rem", fontWeight: 700 }}>
                        {new Date(t.startDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                      </div>
                    </div>
                  </div>

                  {/* CTA */}
                  {t.userRegistered ? (
                    <button
                      disabled
                      style={{
                        width: "100%", padding: "10px", borderRadius: 100,
                        border: "1px solid rgba(60,184,46,0.3)", background: "transparent",
                        color: "#6FE840", fontSize: "0.8rem", fontWeight: 700, cursor: "default",
                      }}
                    >
                      Already Joined
                    </button>
                  ) : (
                    <button
                      onClick={() => handleJoin(t.id)}
                      disabled={isFull || joining === t.id || t.status === "COMPLETED"}
                      style={{
                        width: "100%", padding: "10px", borderRadius: 100, border: "none",
                        background: isFull || t.status === "COMPLETED"
                          ? "rgba(255,255,255,0.06)"
                          : "linear-gradient(135deg, #3CB82E, #6FE840)",
                        color: isFull || t.status === "COMPLETED" ? "rgba(255,255,255,0.25)" : "#000",
                        fontSize: "0.8rem", fontWeight: 800, cursor: isFull || t.status === "COMPLETED" ? "default" : "pointer",
                        transition: "all 0.2s",
                      }}
                    >
                      {joining === t.id ? "Joining…" : isFull ? "Competition Full" : t.status === "COMPLETED" ? "Competition Ended" : "Join Competition"}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
