"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion, useMotionValue, useSpring } from "framer-motion";

// ─── Club logos ────────────────────────────────────────────────────────────────
const CLUB_LOGOS: { id: number; src: string; alt: string; pos: string }[] = [
  { id: 1,  src: "https://media.api-sports.io/football/teams/33.png",   alt: "Manchester United", pos: "top-[9%]    left-[5%]" },
  { id: 2,  src: "https://media.api-sports.io/football/teams/40.png",   alt: "Liverpool",          pos: "top-[14%]   right-[7%]" },
  { id: 3,  src: "https://media.api-sports.io/football/teams/50.png",   alt: "Manchester City",    pos: "top-[40%]   left-[3%]" },
  { id: 4,  src: "https://media.api-sports.io/football/teams/42.png",   alt: "Arsenal",            pos: "bottom-[24%] left-[7%]" },
  { id: 5,  src: "https://media.api-sports.io/football/teams/49.png",   alt: "Chelsea",            pos: "bottom-[8%]  left-[24%]" },
  { id: 6,  src: "https://media.api-sports.io/football/teams/47.png",   alt: "Tottenham",          pos: "bottom-[5%]  left-[4%]" },
  { id: 7,  src: "https://media.api-sports.io/football/teams/541.png",  alt: "Real Madrid",        pos: "top-[7%]    left-[27%]" },
  { id: 8,  src: "https://media.api-sports.io/football/teams/529.png",  alt: "Barcelona",          pos: "top-[7%]    right-[27%]" },
  { id: 9,  src: "https://media.api-sports.io/football/teams/530.png",  alt: "Atletico Madrid",    pos: "top-[38%]   right-[3%]" },
  { id: 10, src: "https://media.api-sports.io/football/teams/543.png",  alt: "Real Betis",         pos: "bottom-[24%] right-[7%]" },
  { id: 11, src: "https://media.api-sports.io/football/teams/532.png",  alt: "Sevilla",            pos: "bottom-[8%]  right-[24%]" },
  { id: 12, src: "https://media.api-sports.io/football/teams/536.png",  alt: "Valencia",           pos: "bottom-[5%]  right-[5%]" },
  { id: 13, src: "https://media.api-sports.io/football/teams/1577.png", alt: "Al Ahly",            pos: "top-[22%]   left-[13%]" },
  { id: 14, src: "https://media.api-sports.io/football/teams/1040.png", alt: "Zamalek",            pos: "top-[22%]   right-[13%]" },
  { id: 15, src: "https://media.api-sports.io/football/teams/1036.png", alt: "Pyramids FC",        pos: "top-[60%]   left-[10%]" },
  { id: 16, src: "https://media.api-sports.io/football/teams/1030.png", alt: "Ismaily",            pos: "top-[60%]   right-[10%]" },
];

function FloatingLogo({
  logo, index, mouseX, mouseY,
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
      const dist = Math.sqrt(Math.pow(mouseX.current - cx, 2) + Math.pow(mouseY.current - cy, 2));
      if (dist < 160) {
        const angle = Math.atan2(mouseY.current - cy, mouseX.current - cx);
        const force = (1 - dist / 160) * 55;
        x.set(-Math.cos(angle) * force);
        y.set(-Math.sin(angle) * force);
      } else {
        x.set(0); y.set(0);
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
      className={`absolute ${logo.pos}`}
    >
      <motion.div
        style={{
          width: 68, height: 68, borderRadius: 20,
          background: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(255,255,255,0.1)",
          backdropFilter: "blur(12px)",
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: 10, boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
        }}
        animate={{ y: [0, -8, 0, 8, 0], x: [0, 6, 0, -6, 0], rotate: [0, 4, 0, -4, 0] }}
        transition={{ duration: dur, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logo.src} alt={logo.alt}
          style={{ width: "100%", height: "100%", objectFit: "contain" }}
          onError={(e) => { (e.target as HTMLImageElement).style.opacity = "0.15"; }}
        />
      </motion.div>
    </motion.div>
  );
}

// ─── Arabic Register Form ──────────────────────────────────────────────────────
function RegisterFormAr() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const referrerId = searchParams.get("ref") ?? "";

  const mouseX = useRef(0);
  const mouseY = useRef(0);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    mouseX.current = e.clientX;
    mouseY.current = e.clientY;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, referrerId: referrerId || undefined }),
      });

      if (res.ok) {
        router.push(`/verify-email?email=${encodeURIComponent(email)}`);
      } else {
        const data = await res.json();
        setError(data.message || "فشل التسجيل. حاول مرة أخرى.");
      }
    } catch {
      setError("حدث خطأ غير متوقع. حاول مرة أخرى.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      dir="rtl"
      onMouseMove={handleMouseMove}
      style={{
        minHeight: "100vh", position: "relative",
        display: "flex", flexDirection: "column", justifyContent: "center",
        background: "#0A0E1A", padding: "48px 16px",
        fontFamily: "'Tajawal', sans-serif", overflow: "hidden",
      }}
    >
      {/* Radial glow */}
      <div style={{
        position: "absolute", inset: 0,
        background: "radial-gradient(ellipse 55% 45% at 50% 50%, rgba(60,184,46,0.07) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      {/* Home button (RTL: right side) */}
      <a
        href="/ar"
        style={{
          position: "absolute", top: 20, right: 20, zIndex: 50,
          display: "flex", alignItems: "center", gap: 6,
          padding: "7px 16px", borderRadius: 100,
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.1)",
          color: "rgba(255,255,255,0.7)", fontSize: "0.9rem",
          fontWeight: 600, textDecoration: "none",
          backdropFilter: "blur(10px)",
          transition: "background 0.2s, color 0.2s, border-color 0.2s",
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
        الرئيسية →
      </a>

      {/* Floating logos */}
      {CLUB_LOGOS.map((logo, i) => (
        <FloatingLogo key={logo.id} logo={logo} index={i} mouseX={mouseX} mouseY={mouseY} />
      ))}

      {/* Form card */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        style={{ maxWidth: 440, width: "100%", margin: "0 auto", position: "relative", zIndex: 10 }}
      >
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <motion.a
            href="/ar"
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            style={{ display: "inline-block", marginBottom: 10, cursor: "pointer", textDecoration: "none" }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/matchkoo-logo.png" alt="ماتشكو"
              style={{ height: 150, objectFit: "contain", display: "block",
                filter: "drop-shadow(0 0 22px rgba(111,232,64,0.4)) drop-shadow(0 0 8px rgba(111,232,64,0.25))" }}
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
          </motion.a>

          <h1 style={{
            color: "#fff", fontSize: "2.4rem",
            fontFamily: "'Tajawal', sans-serif", fontWeight: 900,
            marginBottom: 6,
          }}>
            إنشاء حساب
          </h1>
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "1rem" }}>
            انضم إلى الملعب — مجاناً للأبد
          </p>
        </div>

        {/* Glass card */}
        <div style={{
          background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 20, padding: "32px 36px", backdropFilter: "blur(20px)",
        }}>
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {error && (
              <div style={{
                background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.3)",
                color: "#F87171", padding: "10px 16px", borderRadius: 10, fontSize: "1rem",
              }}>
                {error}
              </div>
            )}

            {[
              { id: "name",     label: "الاسم الكامل",      type: "text",     value: name,     onChange: setName,     placeholder: "محمد أحمد",       autoComplete: "name",         ltr: false },
              { id: "email",    label: "البريد الإلكتروني",  type: "email",    value: email,    onChange: setEmail,    placeholder: "you@example.com",  autoComplete: "email",        ltr: true  },
              { id: "password", label: "كلمة المرور",        type: "password", value: password, onChange: setPassword, placeholder: "••••••••",         autoComplete: "new-password", ltr: true  },
            ].map((f) => (
              <div key={f.id}>
                <label style={{
                  display: "block", fontSize: "0.88rem", fontWeight: 700,
                  color: "rgba(255,255,255,0.5)", marginBottom: 8,
                }}>
                  {f.label}
                </label>
                <input
                  id={f.id} type={f.type} required
                  autoComplete={f.autoComplete}
                  value={f.value}
                  onChange={(e) => f.onChange(e.target.value)}
                  placeholder={f.placeholder}
                  dir={f.ltr ? "ltr" : "rtl"}
                  style={{
                    width: "100%", background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10,
                    padding: "11px 14px", color: "#fff", fontSize: "0.95rem",
                    fontFamily: "inherit", boxSizing: "border-box", outline: "none",
                    transition: "border-color 0.2s",
                    textAlign: f.ltr ? "left" : "right",
                  }}
                  onFocus={(e) => { e.target.style.borderColor = "rgba(111,232,64,0.5)"; }}
                  onBlur={(e) => { e.target.style.borderColor = "rgba(255,255,255,0.1)"; }}
                />
              </div>
            ))}

            <button
              type="submit"
              disabled={loading}
              style={{
                padding: "13px", borderRadius: 100, border: "none",
                background: loading ? "rgba(60,184,46,0.5)" : "linear-gradient(135deg,#3CB82E,#6FE840)",
                color: "#000", fontWeight: 800, fontSize: "1.1rem",
                cursor: loading ? "not-allowed" : "pointer",
                fontFamily: "inherit", marginTop: 4,
                transition: "transform 0.15s, box-shadow 0.15s",
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
              {loading ? "جارٍ إنشاء الحساب…" : "← إنشاء الحساب"}
            </button>
          </form>

          <div style={{ marginTop: 20, textAlign: "center", fontSize: "0.95rem", color: "rgba(255,255,255,0.4)" }}>
            لديك حساب بالفعل؟{" "}
            <Link href="/ar/login" style={{ color: "#6FE840", fontWeight: 700, textDecoration: "none" }}>
              تسجيل الدخول
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default function RegisterPageAr() {
  return (
    <Suspense>
      <RegisterFormAr />
    </Suspense>
  );
}
