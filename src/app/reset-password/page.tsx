"use client";
import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

function ResetPasswordForm() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) { setError("Passwords don't match"); return; }
    if (password.length < 8)  { setError("Password must be at least 8 characters"); return; }
    setLoading(true); setError("");

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const d = await res.json();
      if (res.ok) { setDone(true); setTimeout(() => router.push("/login?reset=1"), 2500); }
      else setError(d.message ?? "Something went wrong");
    } catch {
      setError("Network error — please try again");
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div style={card}>
        <div style={iconWrap}>⚠️</div>
        <h1 style={h1}>Invalid Link</h1>
        <p style={sub}>This reset link is missing or invalid.</p>
        <Link href="/forgot-password" style={ctaBtn}>Request a New Link →</Link>
      </div>
    );
  }

  return (
    <div style={card}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/matchkoo-logo.png" alt="Matchkoo" style={logo}
        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />

      {done ? (
        <>
          <div style={iconWrap}>✅</div>
          <h1 style={h1}>Password Updated!</h1>
          <p style={sub}>Redirecting you to sign in…</p>
        </>
      ) : (
        <>
          <h1 style={h1}>New Password</h1>
          <p style={sub}>Choose a strong password for your account.</p>

          <form onSubmit={handleSubmit} style={{ width: "100%" }}>
            {error && <div style={errorBox}>{error}</div>}

            <div style={fieldWrap}>
              <label style={label}>NEW PASSWORD</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 8 characters" required style={input} />
            </div>

            <div style={fieldWrap}>
              <label style={label}>CONFIRM PASSWORD</label>
              <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)}
                placeholder="Repeat your password" required style={input} />
            </div>

            <button type="submit" disabled={loading} style={submitBtn}>
              {loading ? "Updating…" : "Set New Password →"}
            </button>
          </form>
        </>
      )}
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div style={page}>
      <Link href="/login" style={backBtn}>← Back to Sign In</Link>
      <Suspense fallback={<div style={{ color: "#fff" }}>Loading…</div>}>
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const GREEN = "#29BF12";
const DARK  = "#0A0E1A";

const page: React.CSSProperties = { minHeight: "100vh", background: DARK, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px 16px", position: "relative" };
const backBtn: React.CSSProperties = { position: "fixed", top: 20, left: 20, display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 100, background: "rgba(255,255,255,0.08)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.7)", fontSize: "0.88rem", fontWeight: 600, textDecoration: "none", zIndex: 10 };
const card: React.CSSProperties = { width: "100%", maxWidth: 420, background: "rgba(255,255,255,0.05)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 24, padding: "40px 36px", display: "flex", flexDirection: "column", alignItems: "center" };
const logo: React.CSSProperties = { height: 90, objectFit: "contain", marginBottom: 24, filter: "drop-shadow(0 0 22px rgba(111,232,64,0.4))" };
const iconWrap: React.CSSProperties = { fontSize: 48, marginBottom: 16 };
const h1: React.CSSProperties = { color: "#fff", fontSize: "2rem", fontFamily: "'Russo One', sans-serif", margin: "0 0 8px", textAlign: "center" };
const sub: React.CSSProperties = { color: "rgba(255,255,255,0.5)", fontSize: "1rem", textAlign: "center", margin: "0 0 28px", lineHeight: 1.5 };
const fieldWrap: React.CSSProperties = { marginBottom: 20, width: "100%" };
const label: React.CSSProperties = { display: "block", fontSize: "0.82rem", fontWeight: 700, color: "rgba(255,255,255,0.4)", letterSpacing: "0.08em", marginBottom: 6 };
const input: React.CSSProperties = { width: "100%", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, color: "#fff", fontSize: "1rem", padding: "13px 16px", outline: "none", boxSizing: "border-box", fontFamily: "inherit" };
const submitBtn: React.CSSProperties = { width: "100%", padding: "15px", borderRadius: 100, border: "none", background: `linear-gradient(135deg, #3CB82E, ${GREEN})`, color: "#000", fontWeight: 800, fontSize: "1.1rem", cursor: "pointer", fontFamily: "inherit", marginBottom: 20 };
const errorBox: React.CSSProperties = { background: "rgba(242,27,63,0.12)", border: "1px solid rgba(242,27,63,0.3)", borderRadius: 10, color: "#F87171", padding: "10px 16px", fontSize: "0.95rem", marginBottom: 16, width: "100%" };
const ctaBtn: React.CSSProperties = { display: "block", width: "100%", padding: "15px", borderRadius: 100, background: `linear-gradient(135deg, #3CB82E, ${GREEN})`, color: "#000", fontWeight: 800, fontSize: "1.1rem", textAlign: "center", textDecoration: "none" };
