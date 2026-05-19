"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

// ─── The 5 whitelisted leagues ────────────────────────────────────────────────
const LEAGUES = [
  { id: "epl",   name: "English Premier League", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", color: "#3D1A78", accent: "#9B5DE5" },
  { id: "laliga",name: "La Liga",                flag: "🇪🇸",       color: "#B5002A", accent: "#FF3D68" },
  { id: "ucl",   name: "UEFA Champions League",  flag: "🏆",        color: "#0A1E6E", accent: "#4B6EF5" },
  { id: "epl233",name: "Egyptian Premier League",flag: "🇪🇬",       color: "#8B1A1A", accent: "#E53935" },
  { id: "wc",    name: "FIFA World Cup",         flag: "🌍",        color: "#065143", accent: "#3CB82E" },
];

// ─── Club logos: hidden on mobile ────────────────────────────────────────────
const CLUB_LOGOS = [
  { id:1,  src:"https://media.api-sports.io/football/teams/33.png",   pos:"top-[9%]    left-[5%]" },
  { id:2,  src:"https://media.api-sports.io/football/teams/40.png",   pos:"top-[16%]   right-[6%]" },
  { id:3,  src:"https://media.api-sports.io/football/teams/50.png",   pos:"top-[42%]   left-[3%]" },
  { id:4,  src:"https://media.api-sports.io/football/teams/42.png",   pos:"bottom-[22%] left-[6%]" },
  { id:5,  src:"https://media.api-sports.io/football/teams/49.png",   pos:"bottom-[8%]  left-[24%]" },
  { id:6,  src:"https://media.api-sports.io/football/teams/47.png",   pos:"bottom-[5%]  left-[4%]" },
  { id:7,  src:"https://media.api-sports.io/football/teams/541.png",  pos:"top-[6%]    left-[28%]" },
  { id:8,  src:"https://media.api-sports.io/football/teams/529.png",  pos:"top-[6%]    right-[28%]" },
  { id:9,  src:"https://media.api-sports.io/football/teams/530.png",  pos:"top-[40%]   right-[3%]" },
  { id:10, src:"https://media.api-sports.io/football/teams/543.png",  pos:"bottom-[22%] right-[6%]" },
  { id:11, src:"https://media.api-sports.io/football/teams/532.png",  pos:"bottom-[8%]  right-[24%]" },
  { id:12, src:"https://media.api-sports.io/football/teams/536.png",  pos:"bottom-[5%]  right-[5%]" },
  { id:13, src:"https://media.api-sports.io/football/teams/1577.png", pos:"top-[24%]   left-[13%]" },
  { id:14, src:"https://media.api-sports.io/football/teams/1040.png", pos:"top-[24%]   right-[13%]" },
  { id:15, src:"https://media.api-sports.io/football/teams/1036.png", pos:"top-[62%]   left-[10%]" },
  { id:16, src:"https://media.api-sports.io/football/teams/1030.png", pos:"top-[62%]   right-[10%]" },
];

function FloatingBadges() {
  return (
    <>
      {CLUB_LOGOS.map((logo, i) => (
        <motion.div
          key={logo.id}
          initial={{ opacity: 0, scale: 0.4 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: i * 0.05, duration: 0.6, ease: [0.22,1,0.36,1] }}
          className={`absolute ${logo.pos} hidden sm:block`}
        >
          <motion.div
            style={{ width:60, height:60, borderRadius:16, background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)", backdropFilter:"blur(12px)", display:"flex", alignItems:"center", justifyContent:"center", padding:9 }}
            animate={{ y:[0,-8,0,8,0], x:[0,5,0,-5,0], rotate:[0,3,0,-3,0] }}
            transition={{ duration: 5 + (i % 5), repeat:Infinity, repeatType:"mirror", ease:"easeInOut" }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logo.src} alt="" style={{ width:"100%", height:"100%", objectFit:"contain" }} onError={(e)=>{ (e.target as HTMLImageElement).style.opacity="0.15"; }} />
          </motion.div>
        </motion.div>
      ))}
    </>
  );
}

// ─── Main form ────────────────────────────────────────────────────────────────
function RegisterForm() {
  const [step, setStep] = useState<1|2>(1);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const referrerId = searchParams.get("ref") ?? "";

  const toggleLeague = (leagueName: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(leagueName) ? next.delete(leagueName) : next.add(leagueName);
      return next;
    });
  };

  // Step 1 → validate → go to step 2
  const handleStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    setStep(2);
  };

  // Step 2 → submit to API
  const handleSubmit = async () => {
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name, email, password,
          referrerId: referrerId || undefined,
          preferredLeagues: Array.from(selected),
        }),
      });
      if (res.ok) {
        router.push(`/verify-email?email=${encodeURIComponent(email)}`);
      } else {
        const data = await res.json();
        setError(data.message || "Registration failed");
        setStep(1);
      }
    } catch {
      setError("An unexpected error occurred");
      setStep(1);
    } finally {
      setLoading(false);
    }
  };

  const pageStyle: React.CSSProperties = {
    minHeight:"100vh", position:"relative", display:"flex", flexDirection:"column",
    justifyContent:"center", alignItems:"center", background:"#0A0E1A",
    padding:"60px 16px", fontFamily:"'Chakra Petch', sans-serif", overflow:"hidden",
  };

  return (
    <div style={pageStyle}>
      {/* Glow */}
      <div style={{ position:"absolute", inset:0, background:"radial-gradient(ellipse 55% 45% at 50% 50%, rgba(60,184,46,0.07) 0%, transparent 70%)", pointerEvents:"none" }} />

      {/* Home button */}
      <a href="/" style={{ position:"absolute", top:20, left:20, zIndex:50, display:"flex", alignItems:"center", gap:6, padding:"7px 16px", borderRadius:100, background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.1)", color:"rgba(255,255,255,0.7)", fontSize:"0.8rem", fontWeight:600, textDecoration:"none", backdropFilter:"blur(10px)", fontFamily:"'Chakra Petch', sans-serif" }}
        onMouseEnter={e=>{ const a = e.currentTarget; a.style.background="rgba(111,232,64,0.12)"; a.style.color="#6FE840"; }}
        onMouseLeave={e=>{ const a = e.currentTarget; a.style.background="rgba(255,255,255,0.06)"; a.style.color="rgba(255,255,255,0.7)"; }}
      >← Home</a>

      <FloatingBadges />

      <motion.div
        initial={{ opacity:0, y:24 }} animate={{ opacity:1, y:0 }}
        transition={{ duration:0.6, ease:[0.22,1,0.36,1] }}
        style={{ maxWidth:420, width:"100%", position:"relative", zIndex:10 }}
      >
        {/* Header */}
        <div style={{ textAlign:"center", marginBottom:24 }}>
          <motion.a href="/" initial={{ opacity:0, scale:0.85 }} animate={{ opacity:1, scale:1 }} transition={{ duration:0.6 }} style={{ display:"inline-block", marginBottom:16, textDecoration:"none" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/matchkoo-logo.png" alt="Matchkoo" style={{ height:72, objectFit:"contain", display:"block", margin:"0 auto", filter:"drop-shadow(0 0 18px rgba(111,232,64,0.38))" }} onError={e=>{ (e.target as HTMLImageElement).style.display="none"; }} />
          </motion.a>

          <AnimatePresence mode="wait">
            {step === 1 ? (
              <motion.div key="h1" initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-8 }}>
                <h1 style={{ color:"#fff", fontSize:"1.9rem", fontFamily:"'Russo One', sans-serif", margin:"0 0 6px", lineHeight:1.2 }}>Create Account</h1>
                <p style={{ color:"rgba(255,255,255,0.45)", fontSize:"0.9rem", margin:0 }}>Join the arena — it&apos;s free</p>
              </motion.div>
            ) : (
              <motion.div key="h2" initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-8 }}>
                <h1 style={{ color:"#fff", fontSize:"1.9rem", fontFamily:"'Russo One', sans-serif", margin:"0 0 6px", lineHeight:1.2 }}>Your Leagues</h1>
                <p style={{ color:"rgba(255,255,255,0.45)", fontSize:"0.9rem", margin:0 }}>Pick what you want to follow</p>
              </motion.div>
            )}
          </AnimatePresence>

          {referrerId && (
            <div style={{ display:"inline-flex", alignItems:"center", gap:6, background:"rgba(111,232,64,0.1)", border:"1px solid rgba(111,232,64,0.25)", borderRadius:100, padding:"5px 14px", marginTop:12, color:"#6FE840", fontSize:"0.78rem", fontWeight:700 }}>
              🎉 Invited · +200 XP on registration
            </div>
          )}

          {/* Step indicator */}
          <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:8, marginTop:16 }}>
            {[1,2].map(s => (
              <div key={s} style={{ width: s === step ? 28 : 8, height:8, borderRadius:100, background: s <= step ? "#6FE840" : "rgba(255,255,255,0.15)", transition:"all 0.3s ease" }} />
            ))}
          </div>
        </div>

        {/* Cards */}
        <AnimatePresence mode="wait">
          {step === 1 ? (
            <motion.div key="step1" initial={{ opacity:0, x:-20 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:-20 }} transition={{ duration:0.35, ease:[0.22,1,0.36,1] }}
              style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:20, padding:"28px 32px 32px", backdropFilter:"blur(20px)" }}
            >
              <form onSubmit={handleStep1} style={{ display:"flex", flexDirection:"column", gap:16 }}>
                {error && <div style={{ background:"rgba(248,113,113,0.1)", border:"1px solid rgba(248,113,113,0.3)", color:"#F87171", padding:"10px 16px", borderRadius:10, fontSize:"0.9rem" }}>{error}</div>}

                {[
                  { id:"name",     label:"FULL NAME",     type:"text",     value:name,     set:setName,     placeholder:"Ihab Mohamed",   ac:"name" },
                  { id:"email",    label:"EMAIL ADDRESS", type:"email",    value:email,    set:setEmail,    placeholder:"you@example.com", ac:"email" },
                  { id:"password", label:"PASSWORD",      type:"password", value:password, set:setPassword, placeholder:"••••••••",       ac:"new-password" },
                ].map(f => (
                  <div key={f.id}>
                    <label htmlFor={f.id} style={{ display:"block", fontSize:"0.78rem", fontWeight:700, color:"rgba(255,255,255,0.38)", letterSpacing:"0.09em", marginBottom:7 }}>{f.label}</label>
                    <input id={f.id} type={f.type} required autoComplete={f.ac} value={f.value}
                      onChange={e => f.set(e.target.value)} placeholder={f.placeholder}
                      style={{ width:"100%", background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:10, padding:"12px 14px", color:"#fff", fontSize:"0.92rem", fontFamily:"inherit", boxSizing:"border-box", outline:"none", transition:"border-color 0.2s" }}
                      onFocus={e=>{ e.target.style.borderColor="rgba(111,232,64,0.5)"; }}
                      onBlur={e=>{ e.target.style.borderColor="rgba(255,255,255,0.1)"; }}
                    />
                  </div>
                ))}

                <p style={{ margin:"-4px 0 0", fontSize:"0.76rem", color:"rgba(255,255,255,0.28)" }}>Use at least 8 characters.</p>

                <button type="submit" style={{ padding:"13px", marginTop:4, borderRadius:100, border:"none", background:"linear-gradient(135deg,#3CB82E,#6FE840)", color:"#000", fontWeight:800, fontSize:"1rem", cursor:"pointer", fontFamily:"inherit", letterSpacing:"0.02em", transition:"transform 0.15s, box-shadow 0.15s" }}
                  onMouseEnter={e=>{ (e.currentTarget).style.transform="translateY(-1px)"; (e.currentTarget).style.boxShadow="0 6px 24px rgba(111,232,64,0.35)"; }}
                  onMouseLeave={e=>{ (e.currentTarget).style.transform=""; (e.currentTarget).style.boxShadow=""; }}
                >Continue →</button>
              </form>

              <div style={{ marginTop:22, textAlign:"center", fontSize:"0.9rem", color:"rgba(255,255,255,0.38)" }}>
                Already have an account?{" "}<Link href="/login" style={{ color:"#6FE840", fontWeight:700, textDecoration:"none" }}>Sign in</Link>
              </div>
            </motion.div>
          ) : (
            <motion.div key="step2" initial={{ opacity:0, x:20 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:20 }} transition={{ duration:0.35, ease:[0.22,1,0.36,1] }}
              style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:20, padding:"28px 32px 32px", backdropFilter:"blur(20px)" }}
            >
              <p style={{ color:"rgba(255,255,255,0.45)", fontSize:"0.85rem", margin:"0 0 18px", textAlign:"center" }}>
                Your <strong style={{ color:"#fff" }}>Today&apos;s Fixtures</strong> tab will show matches from the leagues you pick.
              </p>

              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                {LEAGUES.map((lg, i) => {
                  const isOn = selected.has(lg.name);
                  return (
                    <motion.button
                      key={lg.id}
                      initial={{ opacity:0, y:12 }}
                      animate={{ opacity:1, y:0 }}
                      transition={{ delay: i * 0.06 }}
                      onClick={() => toggleLeague(lg.name)}
                      style={{
                        display:"flex", alignItems:"center", gap:14,
                        padding:"14px 18px", borderRadius:14, border:"none", cursor:"pointer",
                        background: isOn ? `${lg.color}CC` : "rgba(255,255,255,0.04)",
                        outline: isOn ? `2px solid ${lg.accent}` : "1px solid rgba(255,255,255,0.08)",
                        transition:"all 0.2s ease", textAlign:"left",
                      }}
                    >
                      <span style={{ fontSize:"1.5rem", lineHeight:1 }}>{lg.flag}</span>
                      <span style={{ flex:1, color:"#fff", fontWeight:700, fontSize:"0.95rem", fontFamily:"'Chakra Petch', sans-serif" }}>{lg.name}</span>
                      <div style={{ width:22, height:22, borderRadius:"50%", border:`2px solid ${isOn ? lg.accent : "rgba(255,255,255,0.2)"}`, background: isOn ? lg.accent : "transparent", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, transition:"all 0.2s" }}>
                        {isOn && <span style={{ color:"#000", fontSize:"0.7rem", fontWeight:900 }}>✓</span>}
                      </div>
                    </motion.button>
                  );
                })}
              </div>

              <div style={{ display:"flex", flexDirection:"column", gap:10, marginTop:20 }}>
                <button onClick={handleSubmit} disabled={loading}
                  style={{ width:"100%", padding:"14px", borderRadius:100, border:"none", background: loading ? "rgba(60,184,46,0.5)" : "linear-gradient(135deg,#3CB82E,#6FE840)", color:"#000", fontWeight:800, fontSize:"0.95rem", cursor: loading ? "not-allowed" : "pointer", fontFamily:"inherit", letterSpacing:"0.02em", transition:"transform 0.15s, box-shadow 0.15s", whiteSpace:"nowrap" }}
                  onMouseEnter={e=>{ if(!loading){ (e.currentTarget).style.transform="translateY(-1px)"; (e.currentTarget).style.boxShadow="0 6px 24px rgba(111,232,64,0.35)"; }}}
                  onMouseLeave={e=>{ (e.currentTarget).style.transform=""; (e.currentTarget).style.boxShadow=""; }}
                >
                  {loading ? "Creating account…" : selected.size === 0 ? "Skip & Create Account →" : `Create Account (${selected.size} league${selected.size>1?"s":""}) →`}
                </button>
                <button onClick={() => setStep(1)} style={{ width:"100%", padding:"11px", borderRadius:100, border:"1px solid rgba(255,255,255,0.12)", background:"transparent", color:"rgba(255,255,255,0.5)", fontWeight:600, fontSize:"0.85rem", cursor:"pointer", fontFamily:"inherit" }}>← Back</button>
              </div>

              {error && <div style={{ marginTop:12, background:"rgba(248,113,113,0.1)", border:"1px solid rgba(248,113,113,0.3)", color:"#F87171", padding:"10px 16px", borderRadius:10, fontSize:"0.9rem" }}>{error}</div>}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
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
