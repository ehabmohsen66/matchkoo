"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion, useMotionValue, useSpring } from "framer-motion";

// ─── Club logos ─────────────────────────────────────────────────────────────
const CLUB_LOGOS: { id: number; src: string; alt: string; pos: string }[] = [
  { id: 1,  src: "https://media.api-sports.io/football/teams/33.png",   alt: "Manchester United", pos: "top-[9%]    left-[5%]" },
  { id: 2,  src: "https://media.api-sports.io/football/teams/40.png",   alt: "Liverpool",          pos: "top-[16%]   right-[6%]" },
  { id: 3,  src: "https://media.api-sports.io/football/teams/50.png",   alt: "Manchester City",    pos: "top-[42%]   left-[3%]" },
  { id: 4,  src: "https://media.api-sports.io/football/teams/42.png",   alt: "Arsenal",            pos: "bottom-[22%] left-[6%]" },
  { id: 5,  src: "https://media.api-sports.io/football/teams/49.png",   alt: "Chelsea",            pos: "bottom-[8%]  left-[24%]" },
  { id: 6,  src: "https://media.api-sports.io/football/teams/47.png",   alt: "Tottenham",          pos: "bottom-[5%]  left-[4%]" },
  { id: 7,  src: "https://media.api-sports.io/football/teams/541.png",  alt: "Real Madrid",        pos: "top-[6%]    left-[28%]" },
  { id: 8,  src: "https://media.api-sports.io/football/teams/529.png",  alt: "Barcelona",          pos: "top-[6%]    right-[28%]" },
  { id: 9,  src: "https://media.api-sports.io/football/teams/530.png",  alt: "Atletico Madrid",    pos: "top-[40%]   right-[3%]" },
  { id: 10, src: "https://media.api-sports.io/football/teams/543.png",  alt: "Real Betis",         pos: "bottom-[22%] right-[6%]" },
  { id: 11, src: "https://media.api-sports.io/football/teams/532.png",  alt: "Sevilla",            pos: "bottom-[8%]  right-[24%]" },
  { id: 12, src: "https://media.api-sports.io/football/teams/536.png",  alt: "Valencia",           pos: "bottom-[5%]  right-[5%]" },
  { id: 13, src: "https://media.api-sports.io/football/teams/1577.png", alt: "Al Ahly",            pos: "top-[24%]   left-[13%]" },
  { id: 14, src: "https://media.api-sports.io/football/teams/1040.png", alt: "Zamalek",            pos: "top-[24%]   right-[13%]" },
  { id: 15, src: "https://media.api-sports.io/football/teams/1036.png", alt: "Pyramids FC",        pos: "top-[62%]   left-[10%]" },
  { id: 16, src: "https://media.api-sports.io/football/teams/1030.png", alt: "Ismaily",            pos: "top-[62%]   right-[10%]" },
];

function FloatingLogo({
  logo,
  index,
  mouseX,
  mouseY,
}: {
  logo: (typeof CLUB_LOGOS)[0];
  index: number;
  mouseX: React.MutableRefObject<number>;
  mouseY: React.MutableRefObject<number>;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 300, damping: 20 });
  const springY = useSpring(y, { stiffness: 300, damping: 20 });

  useEffect(() => {
    const handleMouseMove = () => {
      if (!ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dist = Math.sqrt(
        Math.pow(mouseX.current - cx, 2) + Math.pow(mouseY.current - cy, 2)
      );
      if (dist < 160) {
        const angle = Math.atan2(mouseY.current - cy, mouseX.current - cx);
        const force = (1 - dist / 160) * 55;
        x.set(-Math.cos(angle) * force);
        y.set(-Math.sin(angle) * force);
      } else {
        x.set(0);
        y.set(0);
      }
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [x, y, mouseX, mouseY]);

  const dur = 5 + (index % 5);

  return (
    <motion.div
      ref={ref}
      style={{ x: springX, y: springY }}
      initial={{ opacity: 0, scale: 0.4 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.07, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      // Hide on small screens to prevent overlap with form
      className={`absolute ${logo.pos} hidden sm:block`}
    >
      <motion.div
        style={{
          width: 60,
          height: 60,
          borderRadius: 16,
          background: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(255,255,255,0.1)",
          backdropFilter: "blur(12px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 9,
          boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
        }}
        animate={{
          y: [0, -8, 0, 8, 0],
          x: [0, 6, 0, -6, 0],
          rotate: [0, 4, 0, -4, 0],
        }}
        transition={{
          duration: dur,
          repeat: Infinity,
          repeatType: "mirror",
          ease: "easeInOut",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logo.src}
          alt={logo.alt}
          style={{ width: "100%", height: "100%", objectFit: "contain" }}
          onError={(e) => {
            (e.target as HTMLImageElement).style.opacity = "0.15";
          }}
        />
      </motion.div>
    </motion.div>
  );
}

// ─── Login form ───────────────────────────────────────────────────────────────
function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const justVerified = searchParams.get("verified") === "1";
  const justReset    = searchParams.get("reset") === "1";

  const mouseX = useRef(0);
  const mouseY = useRef(0);

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

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    mouseX.current = e.clientX;
    mouseY.current = e.clientY;
  };

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
      if (res.error === "EMAIL_NOT_VERIFIED") {
        setError("Please verify your email first. Check your inbox for the verification link.");
      } else {
        setError("Invalid email or password. Please try again.");
      }
    }
  };

  if (status === "loading") {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0A0E1A",
          color: "rgba(255,255,255,0.4)",
          fontFamily: "'Chakra Petch', sans-serif",
          fontSize: "0.9rem",
        }}
      >
        Checking session…
      </div>
    );
  }

  return (
    <div
      onMouseMove={handleMouseMove}
      style={{
        minHeight: "100vh",
        position: "relative",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        background: "#0A0E1A",
        padding: "60px 16px",
        fontFamily: "'Chakra Petch', sans-serif",
        overflow: "hidden",
      }}
    >
      {/* Radial glow */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse 55% 45% at 50% 50%, rgba(60,184,46,0.07) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      {/* ← Home button */}
      <a
        href="/"
        style={{
          position: "absolute",
          top: 20,
          left: 20,
          zIndex: 50,
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "7px 16px",
          borderRadius: 100,
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.1)",
          color: "rgba(255,255,255,0.7)",
          fontSize: "0.8rem",
          fontWeight: 600,
          textDecoration: "none",
          backdropFilter: "blur(10px)",
          transition: "background 0.2s, color 0.2s, border-color 0.2s",
          fontFamily: "'Chakra Petch', sans-serif",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLAnchorElement).style.background = "rgba(111,232,64,0.12)";
          (e.currentTarget as HTMLAnchorElement).style.color = "#6FE840";
          (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(111,232,64,0.3)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLAnchorElement).style.background = "rgba(255,255,255,0.06)";
          (e.currentTarget as HTMLAnchorElement).style.color = "rgba(255,255,255,0.7)";
          (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(255,255,255,0.1)";
        }}
      >
        ← Home
      </a>

      {/* Floating club logos — hidden on mobile (sm:block) */}
      {CLUB_LOGOS.map((logo, i) => (
        <FloatingLogo
          key={logo.id}
          logo={logo}
          index={i}
          mouseX={mouseX}
          mouseY={mouseY}
        />
      ))}

      {/* Form card */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        style={{
          maxWidth: 420,
          width: "100%",
          position: "relative",
          zIndex: 10,
        }}
      >
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          {/* Logo — tighter, proportional */}
          <motion.a
            href="/"
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            style={{
              display: "inline-block",
              marginBottom: 16,
              cursor: "pointer",
              textDecoration: "none",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/matchkoo-logo.png"
              alt="Matchkoo"
              style={{
                height: 72,           // was 150px — reduced to a balanced size
                objectFit: "contain",
                display: "block",
                margin: "0 auto",
                filter: "drop-shadow(0 0 18px rgba(111,232,64,0.38)) drop-shadow(0 0 6px rgba(111,232,64,0.22))",
              }}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          </motion.a>

          <h1
            style={{
              color: "#fff",
              fontSize: "1.9rem",       // was 2.4rem — tighter, still prominent
              fontFamily: "'Russo One', sans-serif",
              margin: "0 0 6px 0",
              letterSpacing: "0.01em",
              lineHeight: 1.2,
            }}
          >
            Sign In
          </h1>
          <p style={{ color: "rgba(255,255,255,0.45)", fontSize: "0.9rem", margin: 0 }}>
            Enter the arena
          </p>

          {/* Status banners */}
          {justVerified && (
            <div style={{ background: "rgba(41,191,18,0.12)", border: "1px solid rgba(41,191,18,0.3)", borderRadius: 10, color: "#6FE840", padding: "11px 16px", fontSize: "0.9rem", marginTop: 14, textAlign: "center", fontWeight: 700 }}>
              ✅ Email verified! You can now sign in.
            </div>
          )}
          {justReset && (
            <div style={{ background: "rgba(41,191,18,0.12)", border: "1px solid rgba(41,191,18,0.3)", borderRadius: 10, color: "#6FE840", padding: "11px 16px", fontSize: "0.9rem", marginTop: 14, textAlign: "center", fontWeight: 700 }}>
              🔑 Password updated! Sign in with your new password.
            </div>
          )}
        </div>

        {/* Card */}
        <div
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 20,
            padding: "28px 32px 32px",   // was 32px 36px — more even, mobile friendly
            backdropFilter: "blur(20px)",
          }}
        >
          <form
            onSubmit={handleSubmit}
            style={{ display: "flex", flexDirection: "column", gap: 16 }}
          >
            {error && (
              <div
                style={{
                  background: "rgba(248,113,113,0.1)",
                  border: "1px solid rgba(248,113,113,0.3)",
                  color: "#F87171",
                  padding: "10px 16px",
                  borderRadius: 10,
                  fontSize: "0.9rem",
                }}
              >
                {error}
              </div>
            )}

            {[
              { id: "email",    label: "EMAIL ADDRESS", type: "email",    value: email,    onChange: setEmail,    placeholder: "you@example.com", autoComplete: "email" },
              { id: "password", label: "PASSWORD",      type: "password", value: password, onChange: setPassword, placeholder: "••••••••",        autoComplete: "current-password" },
            ].map((f) => (
              <div key={f.id}>
                <label
                  htmlFor={f.id}
                  style={{
                    display: "block",
                    fontSize: "0.78rem",
                    fontWeight: 700,
                    color: "rgba(255,255,255,0.38)",
                    letterSpacing: "0.09em",
                    marginBottom: 7,
                  }}
                >
                  {f.label}
                </label>
                <input
                  id={f.id}
                  type={f.type}
                  required
                  autoComplete={f.autoComplete}
                  value={f.value}
                  onChange={(e) => f.onChange(e.target.value)}
                  placeholder={f.placeholder}
                  style={{
                    width: "100%",
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 10,
                    padding: "12px 14px",   // was 11px — slightly more breathing room
                    color: "#fff",
                    fontSize: "0.92rem",
                    fontFamily: "inherit",
                    boxSizing: "border-box",
                    outline: "none",
                    transition: "border-color 0.2s",
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "rgba(111,232,64,0.5)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "rgba(255,255,255,0.1)";
                  }}
                />
              </div>
            ))}

            {/* Forgot password — consistent spacing, no negative margin hack */}
            <div style={{ textAlign: "right", marginTop: -4 }}>
              <Link
                href="/forgot-password"
                style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.85rem", textDecoration: "none", fontWeight: 600 }}
              >
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                padding: "13px",
                borderRadius: 100,
                border: "none",
                background: loading
                  ? "rgba(60,184,46,0.5)"
                  : "linear-gradient(135deg,#3CB82E,#6FE840)",
                color: "#000",
                fontWeight: 800,
                fontSize: "1rem",          // was 1.1rem — proportional to the form
                cursor: loading ? "not-allowed" : "pointer",
                fontFamily: "inherit",
                transition: "transform 0.15s, box-shadow 0.15s",
                letterSpacing: "0.02em",
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-1px)";
                  (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 6px 24px rgba(111,232,64,0.35)";
                }
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)";
                (e.currentTarget as HTMLButtonElement).style.boxShadow = "none";
              }}
            >
              {loading ? "Signing in…" : "Sign In →"}
            </button>
          </form>

          <div
            style={{
              marginTop: 22,
              textAlign: "center",
              fontSize: "0.9rem",
              color: "rgba(255,255,255,0.38)",
            }}
          >
            Don&apos;t have an account?{" "}
            <Link
              href="/register"
              style={{ color: "#6FE840", fontWeight: 700, textDecoration: "none" }}
            >
              Sign up
            </Link>
          </div>
        </div>
      </motion.div>
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
