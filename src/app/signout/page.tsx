"use client";

import { signOut } from "next-auth/react";
import { useEffect } from "react";

/**
 * /signout — Dedicated sign-out page.
 * Navigating here triggers NextAuth's signOut() immediately,
 * then redirects to the home page. Much more reliable than
 * manually posting to /api/auth/signout from static HTML.
 */
export default function SignOutPage() {
  useEffect(() => {
    signOut({ callbackUrl: "/" });
  }, []);

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0A0E1A",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "'Chakra Petch', sans-serif",
      color: "rgba(255,255,255,0.6)",
      gap: 16,
    }}>
      {/* Spinner */}
      <div style={{
        width: 40, height: 40, borderRadius: "50%",
        border: "3px solid rgba(111,232,64,0.15)",
        borderTopColor: "#6FE840",
        animation: "spin 0.8s linear infinite",
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <p style={{ margin: 0, fontSize: "0.95rem" }}>Signing out…</p>
    </div>
  );
}
