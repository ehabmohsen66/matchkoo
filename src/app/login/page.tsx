"use client";

import { useState, useEffect, Suspense } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();

  // Already logged in → redirect immediately
  useEffect(() => {
    if (status === "authenticated" && session?.user) {
      const cb = searchParams.get("callbackUrl");
      if (cb && cb.startsWith("/")) {
        router.replace(cb);
      } else if ((session.user as any).role === "ADMIN") {
        router.replace("/admin");
      } else {
        router.replace("/app");
      }
    }
  }, [session, status, router, searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await signIn("credentials", {
      redirect: false,
      email,
      password,
    });

    setLoading(false);

    if (res?.error) {
      setError("Invalid email or password. Please try again.");
    }
    // Redirect handled by useEffect above once session updates
  };

  if (status === "loading") {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0A0E1A", color: "#fff", fontFamily: "sans-serif" }}>
        Checking session…
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", background: "#0A0E1A", padding: "48px 16px", fontFamily: "'Chakra Petch', sans-serif" }}>
      <div style={{ maxWidth: 420, width: "100%", margin: "0 auto" }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <a href="/" style={{ textDecoration: "none" }}>
            <img src="/matchkoo-logo.png" alt="Matchkoo" style={{ height: 120, objectFit: "contain" }} onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
          </a>
          <h1 style={{ color: "#fff", fontSize: "1.6rem", fontFamily: "'Russo One', sans-serif", marginTop: 16, marginBottom: 4 }}>
            Sign In
          </h1>
          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.85rem" }}>Enter the arena</p>
        </div>

        {/* Card */}
        <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, padding: "32px 28px" }}>
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {error && (
              <div style={{ background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.3)", color: "#F87171", padding: "10px 16px", borderRadius: 10, fontSize: "0.84rem" }}>
                {error}
              </div>
            )}

            <div>
              <label style={{ display: "block", fontSize: "0.65rem", fontWeight: 700, color: "rgba(255,255,255,0.4)", letterSpacing: "0.08em", marginBottom: 8 }}>
                EMAIL ADDRESS
              </label>
              <input
                id="email" type="email" required autoComplete="email"
                value={email} onChange={e => setEmail(e.target.value)}
                style={{ width: "100%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "11px 14px", color: "#fff", fontSize: "0.9rem", fontFamily: "inherit", boxSizing: "border-box" }}
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.65rem", fontWeight: 700, color: "rgba(255,255,255,0.4)", letterSpacing: "0.08em", marginBottom: 8 }}>
                PASSWORD
              </label>
              <input
                id="password" type="password" required autoComplete="current-password"
                value={password} onChange={e => setPassword(e.target.value)}
                style={{ width: "100%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "11px 14px", color: "#fff", fontSize: "0.9rem", fontFamily: "inherit", boxSizing: "border-box" }}
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{ padding: "13px", borderRadius: 100, border: "none", background: loading ? "rgba(60,184,46,0.5)" : "linear-gradient(135deg,#3CB82E,#6FE840)", color: "#000", fontWeight: 800, fontSize: "0.95rem", cursor: loading ? "not-allowed" : "pointer", fontFamily: "inherit", marginTop: 4 }}
            >
              {loading ? "Signing in…" : "Sign In →"}
            </button>
          </form>

          <div style={{ marginTop: 20, textAlign: "center", fontSize: "0.84rem", color: "rgba(255,255,255,0.4)" }}>
            Don't have an account?{" "}
            <Link href="/register" style={{ color: "#6FE840", fontWeight: 700, textDecoration: "none" }}>
              Sign up
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
