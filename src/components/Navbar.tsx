"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import MatchkooLogo from "@/components/MatchkooLogo";

export default function Navbar() {
  const { data: session, status } = useSession();
  const pathname = usePathname();

  // Landing pages have their own custom pill nav
  if (pathname === "/" || pathname === "/ar") return null;

  // The full app lives at /app — don't show this navbar there either
  if (pathname === "/app" || pathname.startsWith("/profile")) return null;

  // Auth pages are fully immersive — no navbar
  if (pathname === "/login" || pathname === "/register") return null;

  return (
    <nav style={{ background: "#090D1A", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", height: 58 }}>

          {/* Left: logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
            <Link href="/" style={{ marginRight: 28, display: "flex", alignItems: "center" }}>
              <MatchkooLogo height={38} />
            </Link>

            {/* All nav goes to /app — the full HTML system */}
            <a href="/app" style={{ color: "rgba(255,255,255,0.6)", textDecoration: "none", fontSize: "0.85rem", fontWeight: 600, marginRight: 20, padding: "4px 12px", borderRadius: 8, transition: "all 0.2s" }}>
              Leagues & Cups
            </a>
            {status === "authenticated" && (<>
              <a href="/app#predictions" style={{ color: "rgba(255,255,255,0.6)", textDecoration: "none", fontSize: "0.85rem", fontWeight: 600, marginRight: 20, padding: "4px 12px", borderRadius: 8, transition: "all 0.2s" }}>
                Predictions
              </a>
              <a href="/app#leaderboard" style={{ color: "rgba(255,255,255,0.6)", textDecoration: "none", fontSize: "0.85rem", fontWeight: 600, marginRight: 20, padding: "4px 12px", borderRadius: 8, transition: "all 0.2s" }}>
                Leaderboard
              </a>
              <a href="/app#profile" style={{ color: "rgba(255,255,255,0.6)", textDecoration: "none", fontSize: "0.85rem", fontWeight: 600, marginRight: 20, padding: "4px 12px", borderRadius: 8, transition: "all 0.2s" }}>
                My Dashboard
              </a>
              {(session?.user as any)?.role === "ADMIN" && (
                <Link href="/admin" style={{ color: "#6FE840", textDecoration: "none", fontSize: "0.85rem", fontWeight: 700, padding: "4px 12px", borderRadius: 8 }}>
                  Admin
                </Link>
              )}
            </>)}
          </div>

          {/* Right: auth actions */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {status === "authenticated" ? (<>
              <a href="/app" style={{ fontSize: "0.8rem", textDecoration: "none", padding: "6px 18px", borderRadius: 100, background: "linear-gradient(135deg,#3CB82E,#6FE840)", color: "#000", fontWeight: 800 }}>
                Open App
              </a>
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                style={{ padding: "6px 16px", borderRadius: 100, border: "1px solid rgba(255,255,255,0.12)", background: "transparent", color: "rgba(255,255,255,0.55)", fontSize: "0.78rem", fontWeight: 600, cursor: "pointer" }}
              >
                Sign out
              </button>
            </>) : status === "unauthenticated" ? (<>
              <Link href="/login" style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.5)", textDecoration: "none", fontWeight: 600 }}>
                Sign In
              </Link>
              <Link href="/register" style={{ padding: "6px 18px", borderRadius: 100, background: "linear-gradient(135deg,#3CB82E,#6FE840)", color: "#000", fontSize: "0.78rem", fontWeight: 800, textDecoration: "none" }}>
                Play Free
              </Link>
            </>) : null}
          </div>

        </div>
      </div>
    </nav>
  );
}
