"use client";
import { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (res.ok) setSent(true);
      else {
        const d = await res.json();
        setError(d.message ?? "Something went wrong");
      }
    } catch {
      setError("Network error — please try again");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={page}>
      {/* Back to login */}
      <Link href="/login" style={backBtn}>← Back to Sign In</Link>

      <div style={card}>
        {/* Logo */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/matchkoo-logo.png" alt="Matchkoo" style={logo}
          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />

        {sent ? (
          <>
            <div style={iconWrap}>✉️</div>
            <h1 style={h1}>Check your inbox</h1>
            <p style={sub}>
              If an account with <strong>{email}</strong> exists, you&apos;ll receive a
              password reset link within a few minutes.
            </p>
            <Link href="/login" style={ctaBtn}>Back to Sign In →</Link>
          </>
        ) : (
          <>
            <h1 style={h1}>Forgot Password?</h1>
            <p style={sub}>Enter your email and we&apos;ll send you a reset link.</p>

            <form onSubmit={handleSubmit} style={{ width: "100%" }}>
              {error && <div style={errorBox}>{error}</div>}

              <div style={fieldWrap}>
                <label style={label}>EMAIL ADDRESS</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  style={input}
                />
              </div>

              <button type="submit" disabled={loading} style={submitBtn}>
                {loading ? "Sending…" : "Send Reset Link →"}
              </button>
            </form>

            <p style={footer}>
              Remember your password?{" "}
              <Link href="/login" style={footerLink}>Sign in</Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const GREEN = "#29BF12";
const DARK  = "#0A0E1A";

const page: React.CSSProperties = {
  minHeight: "100vh",
  background: DARK,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "24px 16px",
  position: "relative",
};

const backBtn: React.CSSProperties = {
  position: "fixed",
  top: 20,
  left: 20,
  display: "flex",
  alignItems: "center",
  gap: 6,
  padding: "8px 16px",
  borderRadius: 100,
  background: "rgba(255,255,255,0.08)",
  backdropFilter: "blur(12px)",
  border: "1px solid rgba(255,255,255,0.12)",
  color: "rgba(255,255,255,0.7)",
  fontSize: "0.88rem",
  fontWeight: 600,
  textDecoration: "none",
  zIndex: 10,
  transition: "all 0.2s",
};

const card: React.CSSProperties = {
  width: "100%",
  maxWidth: 420,
  background: "rgba(255,255,255,0.05)",
  backdropFilter: "blur(20px)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 24,
  padding: "40px 36px",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 0,
};

const logo: React.CSSProperties = {
  height: 90,
  objectFit: "contain",
  marginBottom: 24,
  filter: "drop-shadow(0 0 22px rgba(111,232,64,0.4))",
};

const iconWrap: React.CSSProperties = {
  fontSize: 48,
  marginBottom: 16,
};

const h1: React.CSSProperties = {
  color: "#fff",
  fontSize: "2rem",
  fontFamily: "'Russo One', sans-serif",
  margin: "0 0 8px",
  textAlign: "center",
};

const sub: React.CSSProperties = {
  color: "rgba(255,255,255,0.5)",
  fontSize: "1rem",
  textAlign: "center",
  margin: "0 0 28px",
  lineHeight: 1.5,
};

const fieldWrap: React.CSSProperties = { marginBottom: 20, width: "100%" };

const label: React.CSSProperties = {
  display: "block",
  fontSize: "0.82rem",
  fontWeight: 700,
  color: "rgba(255,255,255,0.4)",
  letterSpacing: "0.08em",
  marginBottom: 6,
};

const input: React.CSSProperties = {
  width: "100%",
  background: "rgba(255,255,255,0.07)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 12,
  color: "#fff",
  fontSize: "1rem",
  padding: "13px 16px",
  outline: "none",
  boxSizing: "border-box",
  fontFamily: "inherit",
};

const submitBtn: React.CSSProperties = {
  width: "100%",
  padding: "15px",
  borderRadius: 100,
  border: "none",
  background: `linear-gradient(135deg, #3CB82E, ${GREEN})`,
  color: "#000",
  fontWeight: 800,
  fontSize: "1.1rem",
  cursor: "pointer",
  fontFamily: "inherit",
  marginBottom: 20,
};

const errorBox: React.CSSProperties = {
  background: "rgba(242,27,63,0.12)",
  border: "1px solid rgba(242,27,63,0.3)",
  borderRadius: 10,
  color: "#F87171",
  padding: "10px 16px",
  fontSize: "0.95rem",
  marginBottom: 16,
  width: "100%",
};

const ctaBtn: React.CSSProperties = {
  display: "block",
  width: "100%",
  padding: "15px",
  borderRadius: 100,
  background: `linear-gradient(135deg, #3CB82E, ${GREEN})`,
  color: "#000",
  fontWeight: 800,
  fontSize: "1.1rem",
  textAlign: "center",
  textDecoration: "none",
  marginTop: 8,
};

const footer: React.CSSProperties = {
  color: "rgba(255,255,255,0.4)",
  fontSize: "0.95rem",
  textAlign: "center",
};

const footerLink: React.CSSProperties = {
  color: GREEN,
  fontWeight: 700,
  textDecoration: "none",
};
