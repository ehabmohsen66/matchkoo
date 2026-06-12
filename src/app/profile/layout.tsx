"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // If we're on the public profile route, use the SPA-like sidebar layout
  // (We use pure inline styles + standard classes to exactly match the look of the SPA)
  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#090D1A" }}>
      <style>{`
        .profile-sidebar { width: 240px; background: #0a0f18; border-right: 1px solid rgba(255,255,255,0.05); position: fixed; top: 0; bottom: 0; left: 0; display: flex; flex-direction: column; z-index: 100; box-shadow: 4px 0 20px rgba(0,0,0,0.4); }
        .profile-main { margin-left: 240px; flex: 1; padding: 24px; min-height: 100vh; background: transparent; }
        .mobile-bottom-nav { display: none; position: fixed; bottom: 0; left: 0; right: 0; height: 64px; background: rgba(10, 15, 24, 0.95); backdrop-filter: blur(10px); border-top: 1px solid rgba(255,255,255,0.05); z-index: 100; justify-content: space-around; align-items: center; }
        .nav-link { display: flex; align-items: center; gap: 12px; padding: 14px 20px; color: rgba(255,255,255,0.5); font-weight: 700; font-size: 0.95rem; text-decoration: none; border-left: 3px solid transparent; transition: 0.2s; }
        .nav-link:hover { background: rgba(255,255,255,0.03); color: #fff; }
        .nav-link svg { opacity: 0.7; }
        .nav-link:hover svg { opacity: 1; stroke: #6FE840; }
        .mobile-nav-item { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; color: rgba(255,255,255,0.4); text-decoration: none; font-size: 0.65rem; font-weight: 700; gap: 4px; transition: 0.2s; }
        .mobile-nav-item:hover { color: #6FE840; }
        .mobile-nav-item:hover svg { stroke: #6FE840; }
        @media (max-width: 768px) {
          .profile-sidebar { display: none; }
          .profile-main { margin-left: 0; padding: 16px; padding-bottom: 80px; }
          .mobile-bottom-nav { display: flex; }
        }
      `}</style>

      {/* Desktop Sidebar (hidden on mobile via CSS media query) */}
      <aside className="profile-sidebar">
        <div style={{ padding: "24px 16px", textAlign: "center", marginBottom: 10 }}>
          <Link href="/app" style={{ display: "block" }}>
            <img src="/matchkoo-logo.png" style={{ width: "100%", maxWidth: 160, margin: "0 auto", display: "block" }} alt="Matchkoo Logo" />
          </Link>
        </div>

        <nav style={{ display: "flex", flexDirection: "column", flex: 1, padding: "0 10px" }}>
          <Link href="/app" className="nav-link">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            Home
          </Link>
          <Link href="/app#leagues" className="nav-link">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            Leagues & Cups
          </Link>
          <Link href="/app#predictions" className="nav-link">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            Predictions
          </Link>
          <Link href="/app#leaderboard" className="nav-link">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22">
              <line x1="18" y1="20" x2="18" y2="10" />
              <line x1="12" y1="20" x2="12" y2="4" />
              <line x1="6" y1="20" x2="6" y2="14" />
            </svg>
            Leaderboard
          </Link>
          <Link href="/app#vote" className="nav-link">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
            Vote Your Team
          </Link>
          <Link href="/app#minileague" className="nav-link">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            Mini Leagues
          </Link>
          <Link href="/app#profile" className="nav-link">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            My Dashboard
          </Link>
        </nav>

        {/* Back to App Link at Bottom */}
        <div style={{ padding: "20px" }}>
          <Link href="/app" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "12px", background: "rgba(60,184,46,0.1)", border: "1px solid rgba(60,184,46,0.3)", borderRadius: 12, color: "#6FE840", fontWeight: 700, fontSize: "0.85rem", textDecoration: "none", transition: "0.2s" }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            Back to App
          </Link>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="profile-main">
        {/* We can optionally wrap the children in a max-width container if needed, but the profile page already manages its own layout max-widths */}
        {children}
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="mobile-bottom-nav">
        <Link href="/app" className="mobile-nav-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
          Home
        </Link>
        <Link href="/app#leaderboard" className="mobile-nav-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22">
            <line x1="18" y1="20" x2="18" y2="10" />
            <line x1="12" y1="20" x2="12" y2="4" />
            <line x1="6" y1="20" x2="6" y2="14" />
          </svg>
          Ranks
        </Link>
        <Link href="/app#vote" className="mobile-nav-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
          Vote
        </Link>
      </nav>
    </div>
  );
}
