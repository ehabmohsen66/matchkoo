"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "your email";
  const [resent, setResent] = useState(false);
  const [resending, setResending] = useState(false);

  const handleResend = async () => {
    setResending(true);
    try {
      await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setResent(true);
    } catch {
      // silent
    } finally {
      setResending(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-start",
        background: "#0A0E1A",
        padding: "12vh 16px 48px",
        fontFamily: "'Chakra Petch', sans-serif",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Glow */}
      <div style={{
        position: "absolute", inset: 0,
        background: "radial-gradient(ellipse 55% 45% at 50% 50%, rgba(60,184,46,0.07) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      {/* Home button */}
      <a href="/" style={{
        position: "absolute", top: 20, left: 20, zIndex: 50,
        display: "flex", alignItems: "center", gap: 6,
        padding: "7px 16px", borderRadius: 100,
        background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
        color: "rgba(255,255,255,0.7)", fontSize: "0.8rem", fontWeight: 600,
        textDecoration: "none", backdropFilter: "blur(10px)",
      }}>
        ← Home
      </a>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        style={{ maxWidth: 480, width: "100%", position: "relative", zIndex: 10, textAlign: "center" }}
      >

        {/* Envelope icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          style={{
            width: 88, height: 88, borderRadius: "50%", margin: "0 auto 28px",
            background: "rgba(60,184,46,0.12)", border: "2px solid rgba(60,184,46,0.3)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "2.4rem",
          }}
        >
          ✉️
        </motion.div>

        <h1 style={{ color: "#fff", fontSize: "2rem", fontFamily: "'Russo One', sans-serif", marginBottom: 12 }}>
          Check your inbox!
        </h1>
        <p style={{ color: "rgba(255,255,255,0.55)", fontSize: "1rem", lineHeight: 1.7, marginBottom: 8 }}>
          We&apos;ve sent a verification link to:
        </p>
        <div style={{
          display: "inline-block", background: "rgba(111,232,64,0.1)",
          border: "1px solid rgba(111,232,64,0.25)", borderRadius: 8,
          padding: "8px 18px", color: "#6FE840", fontWeight: 700,
          fontSize: "0.95rem", marginBottom: 28, wordBreak: "break-all",
        }}>
          {email}
        </div>

        <div style={{
          background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 16, padding: "24px 28px", marginBottom: 24, textAlign: "left",
        }}>
          <p style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.9rem", lineHeight: 1.8, margin: 0 }}>
            📬 <strong style={{ color: "#fff" }}>Click the link in the email</strong> to activate your account.<br />
            ⏱️ The link expires in <strong style={{ color: "#fff" }}>24 hours</strong>.<br />
            📁 Check your <strong style={{ color: "#fff" }}>spam folder</strong> if you don&apos;t see it.
          </p>
        </div>

        {/* Resend */}
        {!resent ? (
          <p style={{ color: "rgba(255,255,255,0.35)", fontSize: "0.88rem" }}>
            Didn&apos;t receive it?{" "}
            <button
              onClick={handleResend}
              disabled={resending}
              style={{
                background: "none", border: "none", color: "#6FE840",
                fontWeight: 700, fontSize: "0.88rem", cursor: resending ? "not-allowed" : "pointer",
                fontFamily: "inherit", textDecoration: "underline", padding: 0,
              }}
            >
              {resending ? "Sending…" : "Resend email"}
            </button>
          </p>
        ) : (
          <p style={{ color: "#6FE840", fontSize: "0.88rem", fontWeight: 700 }}>
            ✅ A new verification email has been sent!
          </p>
        )}

        <div style={{ marginTop: 28 }}>
          <a href="/login" style={{
            color: "rgba(255,255,255,0.4)", fontSize: "0.85rem",
            textDecoration: "none", fontWeight: 500,
          }}>
            Already verified? <span style={{ color: "#6FE840", fontWeight: 700 }}>Sign in →</span>
          </a>
        </div>
      </motion.div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailContent />
    </Suspense>
  );
}
