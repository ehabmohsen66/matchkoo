import { Section, Text, Heading, Button } from "@react-email/components";
import * as React from "react";
import BaseLayout from "./BaseLayout";

interface LevelUpEmailProps {
  name: string;
  newLevel: string;
  newTotalXp: number;
  nextLevel?: string;
  nextLevelXp?: number;
}

const LEVEL_META: Record<string, { color: string; icon: string; bg: string; border: string; desc: string }> = {
  Silver:   { color: "#C0C0C0", icon: "🥈", bg: "#0D0D0D", border: "#404040", desc: "You're climbing fast. The top 20% of predictors are Silver." },
  Gold:     { color: "#FFD700", icon: "🥇", bg: "#0D0B00", border: "#4D3A00", desc: "Gold tier. You're in the top 10% of all Matchkoo players." },
  Platinum: { color: "#00E5FF", icon: "💎", bg: "#000D10", border: "#004D5C", desc: "Platinum. Elite territory. Less than 5% of players reach this level." },
  Legend:   { color: "#C77DFF", icon: "👑", bg: "#0A000F", border: "#4A0080", desc: "LEGEND. The pinnacle of Matchkoo. You are among the very best on the platform." },
};

export default function LevelUpEmail({
  name,
  newLevel,
  newTotalXp,
  nextLevel,
  nextLevelXp,
}: LevelUpEmailProps) {
  const meta = LEVEL_META[newLevel] ?? { color: "#7CE900", icon: "⭐", bg: "#0A0F08", border: "#244B16", desc: "You've levelled up on Matchkoo!" };

  return (
    <BaseLayout previewText={`${meta.icon} You've reached ${newLevel} on Matchkoo!`}>
      {/* Hero */}
      <Section style={{ ...hero, background: `linear-gradient(135deg,#080808 0%,${meta.bg.replace("#","").length === 6 ? meta.bg : "#111"} 50%,#080808 100%)` }}>
        <div style={{ ...badge, color: meta.color, backgroundColor: meta.color + "22" }}>
          {meta.icon} LEVEL UP
        </div>
        <Heading style={heroTitle}>Welcome to {newLevel}, {name}.</Heading>
        <Text style={{ ...heroSubtitle, color: "#C8C8C8" }}>{meta.desc}</Text>
      </Section>

      {/* Level card */}
      <Section style={px}>
        <Section style={{ ...levelCard, border: `1px solid ${meta.border}`, backgroundColor: meta.bg + "80" }}>
          <div style={{ ...levelBadge, color: meta.color }}>{meta.icon}</div>
          <div style={{ ...levelName, color: meta.color }}>{newLevel.toUpperCase()}</div>
          <div style={xpRow}>
            <span style={xpLabel}>Current XP</span>
            <span style={{ ...xpValue, color: meta.color }}>{newTotalXp.toLocaleString()} XP</span>
          </div>

          {nextLevel && nextLevelXp && (
            <>
              <div style={divider} />
              <div style={xpRow}>
                <span style={xpLabel}>Next rank: {nextLevel}</span>
                <span style={xpLabel}>{nextLevelXp.toLocaleString()} XP needed</span>
              </div>
              <div style={progressBg}>
                <div style={{
                  ...progressFill,
                  width: `${Math.min(100, Math.round((newTotalXp / nextLevelXp) * 100))}%`,
                  backgroundColor: meta.color,
                }} />
              </div>
            </>
          )}
        </Section>
      </Section>

      {/* Body */}
      <Section style={pxBody}>
        <Heading style={bodyTitle}>The grind is paying off.</Heading>
        <Text style={bodyText}>
          Every correct prediction, every streak, every spin has brought you here.
          Keep predicting, keep earning, and keep climbing.
          {!nextLevel ? " You've reached the top. Now defend it." : ""}
        </Text>
      </Section>

      {/* CTA */}
      <Section style={pxCTA}>
        <Button style={{ ...ctaButton, backgroundColor: meta.color, color: "#06060A" }} href="https://matchkoo.com/app">
          Keep Climbing →
        </Button>
      </Section>
    </BaseLayout>
  );
}

LevelUpEmail.PreviewProps = {
  name: "Ihab",
  newLevel: "Gold",
  newTotalXp: 10200,
  nextLevel: "Platinum",
  nextLevelXp: 20000,
};

// ─── Styles ──────────────────────────────────────────────────────────────────
const px: React.CSSProperties = { padding: "22px 34px 8px 34px" };
const pxBody: React.CSSProperties = { padding: "22px 34px 8px 34px", fontFamily: "Arial, Helvetica, sans-serif" };
const pxCTA: React.CSSProperties = { padding: "24px 34px 32px 34px" };

const hero: React.CSSProperties = {
  padding: "24px 34px 12px 34px",
  fontFamily: "Arial, Helvetica, sans-serif",
};

const badge: React.CSSProperties = {
  display: "inline-block", padding: "8px 12px", borderRadius: "999px",
  fontSize: "12px", fontWeight: "700", letterSpacing: ".3px",
};

const heroTitle: React.CSSProperties = {
  margin: "18px 0 10px 0", fontSize: "40px", lineHeight: "44px",
  letterSpacing: "-1px", color: "#FFFFFF", fontWeight: "900",
};

const heroSubtitle: React.CSSProperties = {
  margin: 0, fontSize: "16px", lineHeight: "25px",
};

const levelCard: React.CSSProperties = {
  borderRadius: "22px", padding: "28px 24px",
  fontFamily: "Arial, Helvetica, sans-serif", textAlign: "center",
};

const levelBadge: React.CSSProperties = {
  fontSize: "56px", lineHeight: "1", marginBottom: "8px",
};

const levelName: React.CSSProperties = {
  fontSize: "28px", fontWeight: "900", letterSpacing: "2px",
  marginBottom: "20px",
};

const xpRow: React.CSSProperties = {
  display: "flex", justifyContent: "space-between",
  alignItems: "center", marginBottom: "8px",
};

const xpLabel: React.CSSProperties = {
  fontSize: "12px", color: "#888", fontWeight: "600",
};

const xpValue: React.CSSProperties = {
  fontSize: "14px", fontWeight: "800",
};

const progressBg: React.CSSProperties = {
  height: "6px", backgroundColor: "#222", borderRadius: "999px",
  overflow: "hidden", marginTop: "6px",
};

const progressFill: React.CSSProperties = {
  height: "100%", borderRadius: "999px",
};

const divider: React.CSSProperties = {
  height: "1px", backgroundColor: "#222", margin: "16px 0",
};

const bodyTitle: React.CSSProperties = {
  margin: "0 0 10px 0", fontSize: "24px", lineHeight: "30px",
  color: "#FFFFFF", fontWeight: "900",
};

const bodyText: React.CSSProperties = {
  margin: 0, fontSize: "15px", lineHeight: "24px", color: "#C9C9C9",
};

const ctaButton: React.CSSProperties = {
  display: "inline-block", padding: "15px 26px",
  fontFamily: "Arial, Helvetica, sans-serif", fontSize: "15px",
  lineHeight: "20px", fontWeight: "900",
  textDecoration: "none", borderRadius: "999px",
};
