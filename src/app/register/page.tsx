"use client";

import { useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";

function RegisterForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      if (res.ok) {
        const signInRes = await signIn("credentials", {
          redirect: false,
          email,
          password,
        });
        if (signInRes?.error) {
          router.push("/login");
        } else {
          router.push("/app");
          router.refresh();
        }
      } else {
        const data = await res.json();
        setError(data.message || "Registration failed");
      }
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", background: "#0A0E1A", padding: "48px 16px", fontFamily: "'Chakra Petch', sans-serif" }}>
      <div style={{ maxWidth: 420, width: "100%", margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <a href="/" style={{ textDecoration: "none" }}>
            <img src="/matchkoo-logo.png" alt="Matchkoo" style={{ height: 120, objectFit: "contain" }} onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
          </a>
          <h1 style={{ color: "#fff", fontSize: "1.6rem", fontFamily: "'Russo One', sans-serif", marginTop: 16, marginBottom: 4 }}>
            Create Account
          </h1>
          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.85rem" }}>Join the arena — it's free</p>
        </div>

        <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, padding: "32px 28px" }}>
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {error && (
              <div style={{ background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.3)", color: "#F87171", padding: "10px 16px", borderRadius: 10, fontSize: "0.84rem" }}>
                {error}
              </div>
            )}

            {[
              { id: "name", label: "FULL NAME", type: "text", value: name, onChange: setName, placeholder: "Ihab Mohamed", autoComplete: "name" },
              { id: "email", label: "EMAIL ADDRESS", type: "email", value: email, onChange: setEmail, placeholder: "you@example.com", autoComplete: "email" },
              { id: "password", label: "PASSWORD", type: "password", value: password, onChange: setPassword, placeholder: "••••••••", autoComplete: "new-password" },
            ].map(f => (
              <div key={f.id}>
                <label style={{ display: "block", fontSize: "0.65rem", fontWeight: 700, color: "rgba(255,255,255,0.4)", letterSpacing: "0.08em", marginBottom: 8 }}>
                  {f.label}
                </label>
                <input
                  id={f.id} type={f.type} required autoComplete={f.autoComplete}
                  value={f.value} onChange={e => f.onChange(e.target.value)}
                  placeholder={f.placeholder}
                  style={{ width: "100%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "11px 14px", color: "#fff", fontSize: "0.9rem", fontFamily: "inherit", boxSizing: "border-box" }}
                />
              </div>
            ))}

            <button
              type="submit" disabled={loading}
              style={{ padding: "13px", borderRadius: 100, border: "none", background: loading ? "rgba(60,184,46,0.5)" : "linear-gradient(135deg,#3CB82E,#6FE840)", color: "#000", fontWeight: 800, fontSize: "0.95rem", cursor: loading ? "not-allowed" : "pointer", fontFamily: "inherit", marginTop: 4 }}
            >
              {loading ? "Creating account…" : "Create Account →"}
            </button>
          </form>

          <div style={{ marginTop: 20, textAlign: "center", fontSize: "0.84rem", color: "rgba(255,255,255,0.4)" }}>
            Already have an account?{" "}
            <Link href="/login" style={{ color: "#6FE840", fontWeight: 700, textDecoration: "none" }}>Sign in</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  );
}
