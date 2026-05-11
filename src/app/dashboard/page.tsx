import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function Dashboard() {
  const session = await getServerSession(authOptions);

  if (!session) redirect("/login");
  if (session?.user?.role === "ADMIN") redirect("/admin");

  const registrations = await prisma.registration.findMany({
    where: { userId: session.user.id },
    include: { tournament: true },
    orderBy: { createdAt: "desc" },
  });

  // Split into upcoming vs completed
  const now = new Date();
  const upcoming = registrations.filter(r =>
    r.tournament.status === "UPCOMING" || r.tournament.status === "ONGOING"
  );
  const past = registrations.filter(r => r.tournament.status === "COMPLETED");

  const statusStyle: Record<string, { bg: string; color: string; label: string }> = {
    UPCOMING: { bg: "rgba(60,184,46,0.12)", color: "#6FE840", label: "Upcoming" },
    ONGOING:  { bg: "rgba(251,191,36,0.12)", color: "#FBBF24", label: "Live" },
    COMPLETED:{ bg: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.35)", label: "Ended" },
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0A0E1A",
        color: "#fff",
        fontFamily: "'Chakra Petch', sans-serif",
        paddingBottom: 60,
      }}
    >
      {/* Page header */}
      <div style={{ background: "rgba(255,255,255,0.03)", borderBottom: "1px solid rgba(255,255,255,0.07)", padding: "32px 24px 24px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.12em", color: "#3CB82E", marginBottom: 6, textTransform: "uppercase" }}>
            My Dashboard
          </div>
          <h1 style={{ fontSize: "clamp(1.5rem, 3vw, 2rem)", fontWeight: 800, fontFamily: "'Russo One', sans-serif", margin: 0 }}>
            Welcome back, {session.user?.name?.split(" ")[0]}!
          </h1>
          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.85rem", marginTop: 6 }}>
            Track your competitions, predictions, and leaderboard position.
          </p>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px" }}>

        {/* Quick Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14, marginBottom: 40 }}>
          {[
            { label: "Competitions Joined", value: registrations.length, color: "#6FE840" },
            { label: "Upcoming", value: upcoming.length, color: "#FBBF24" },
            { label: "Completed", value: past.length, color: "rgba(255,255,255,0.35)" },
          ].map(s => (
            <div key={s.label} style={{
              background: "rgba(255,255,255,0.04)", borderRadius: 14,
              border: "1px solid rgba(255,255,255,0.07)", padding: "18px 20px",
            }}>
              <div style={{ fontSize: "1.8rem", fontWeight: 800, color: s.color, fontFamily: "'Russo One', sans-serif" }}>
                {s.value}
              </div>
              <div style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.35)", fontWeight: 600, letterSpacing: "0.06em", marginTop: 2 }}>
                {s.label.toUpperCase()}
              </div>
            </div>
          ))}
          <Link href="/tournaments" style={{
            background: "rgba(60,184,46,0.08)", borderRadius: 14,
            border: "1px solid rgba(60,184,46,0.2)", padding: "18px 20px",
            textDecoration: "none", display: "flex", flexDirection: "column", justifyContent: "center",
          }}>
            <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "#6FE840", fontFamily: "'Russo One', sans-serif" }}>+</div>
            <div style={{ fontSize: "0.72rem", color: "#3CB82E", fontWeight: 700, letterSpacing: "0.06em", marginTop: 2 }}>
              BROWSE LEAGUES &amp; CUPS
            </div>
          </Link>
        </div>

        {/* Upcoming section */}
        <section style={{ marginBottom: 40 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, fontFamily: "'Russo One', sans-serif" }}>
              Upcoming
            </h2>
            {upcoming.length > 0 && (
              <span style={{
                background: "rgba(60,184,46,0.12)", color: "#6FE840",
                borderRadius: 100, padding: "2px 10px", fontSize: "0.72rem", fontWeight: 700,
              }}>{upcoming.length}</span>
            )}
          </div>

          {upcoming.length === 0 ? (
            <div style={{
              textAlign: "center", padding: "40px 24px",
              border: "1px dashed rgba(255,255,255,0.08)", borderRadius: 14,
            }}>
              <p style={{ color: "rgba(255,255,255,0.25)", fontSize: "0.88rem", margin: 0 }}>
                No upcoming competitions.{" "}
                <Link href="/tournaments" style={{ color: "#3CB82E", textDecoration: "none", fontWeight: 700 }}>
                  Browse Leagues &amp; Cups
                </Link>
              </p>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
              {upcoming.map(reg => {
                const st = statusStyle[reg.tournament.status];
                return (
                  <div key={reg.id} style={{
                    background: "rgba(255,255,255,0.04)", borderRadius: 14,
                    border: "1px solid rgba(60,184,46,0.18)", padding: "20px",
                    position: "relative",
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                      <h3 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700, fontFamily: "'Russo One', sans-serif", flex: 1, paddingRight: 12 }}>
                        {reg.tournament.name}
                      </h3>
                      <span style={{
                        background: st.bg, color: st.color,
                        padding: "3px 10px", borderRadius: 100,
                        fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.06em", whiteSpace: "nowrap",
                      }}>{st.label}</span>
                    </div>
                    <div style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.4)", marginBottom: 14 }}>
                      {reg.tournament.game} &nbsp;·&nbsp;
                      {new Date(reg.tournament.startDate).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid rgba(255,255,255,0.07)", paddingTop: 12 }}>
                      <div>
                        <div style={{ fontSize: "0.6rem", color: "rgba(255,255,255,0.25)", fontWeight: 700, letterSpacing: "0.08em" }}>PRIZE POOL</div>
                        <div style={{ fontSize: "0.9rem", fontWeight: 800, color: "#6FE840" }}>{reg.tournament.prizePool}</div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: "0.6rem", color: "rgba(255,255,255,0.25)", fontWeight: 700, letterSpacing: "0.08em" }}>STATUS</div>
                        <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "rgba(255,255,255,0.6)", textTransform: "capitalize" }}>
                          {reg.status.toLowerCase()}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Past competitions */}
        {past.length > 0 && (
          <section>
            <h2 style={{ margin: "0 0 16px", fontSize: "1rem", fontWeight: 700, fontFamily: "'Russo One', sans-serif", color: "rgba(255,255,255,0.4)" }}>
              Past Competitions
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
              {past.map(reg => (
                <div key={reg.id} style={{
                  background: "rgba(255,255,255,0.025)", borderRadius: 14,
                  border: "1px solid rgba(255,255,255,0.06)", padding: "20px", opacity: 0.7,
                }}>
                  <h3 style={{ margin: "0 0 4px", fontSize: "0.9rem", fontWeight: 700 }}>{reg.tournament.name}</h3>
                  <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.35)" }}>
                    {reg.tournament.game} · Ended {new Date(reg.tournament.startDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                  </div>
                  <div style={{ marginTop: 10, fontSize: "0.75rem", color: "rgba(255,255,255,0.25)", fontWeight: 600 }}>
                    Prize pool: {reg.tournament.prizePool}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
