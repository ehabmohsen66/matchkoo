import { Section, Text, Heading, Row, Column, Button } from "@react-email/components";
import * as React from "react";
import BaseLayout from "./BaseLayout";

interface StreakMilestoneEmailProps {
  name: string;
  streak: number;
  bonusXp: number;
  newTotalXp: number;
}

export default function StreakMilestoneEmail({
  name,
  streak,
  bonusXp,
  newTotalXp,
}: StreakMilestoneEmailProps) {
  const milestoneLabel =
    streak >= 10 ? "LEGENDARY STREAK 🔥🔥🔥" :
    streak >= 5  ? "HOT STREAK 🔥🔥" :
                   "ON A STREAK 🔥";

  const flameCount = streak >= 10 ? "🔥🔥🔥" : streak >= 5 ? "🔥🔥" : "🔥";

  return (
    <BaseLayout previewText={`${flameCount} ${streak}-game streak! +${bonusXp} XP streak bonus!`}>
      {/* Hero */}
      <Section style={hero}>
        <div style={badge}>{milestoneLabel}</div>
        <Heading style={heroTitle}>{streak} correct in a row, {name}.</Heading>
        <Text style={heroSubtitle}>
          You&apos;re reading the game better than ever. A streak bonus has been
          added to your account.
        </Text>
      </Section>

      {/* Streak card */}
      <Section style={px}>
        <Section style={streakCard}>
          <div style={streakNumber}>{streak}</div>
          <div style={streakLabel}>CORRECT PREDICTIONS IN A ROW</div>

          <div style={divider} />

          <Row>
            <Column style={statCol}>
              <div style={statCard}>
                <div style={{ ...statValue, color: "#FF4B00" }}>+{bonusXp}</div>
                <div style={statLabel}>Streak Bonus XP</div>
              </div>
            </Column>
            <Column style={statColRight}>
              <div style={statCard}>
                <div style={statValue}>{newTotalXp.toLocaleString()}</div>
                <div style={statLabel}>Total XP</div>
              </div>
            </Column>
          </Row>
        </Section>
      </Section>

      {/* Body */}
      <Section style={pxBody}>
        <Heading style={bodyTitle}>Keep the streak alive.</Heading>
        <Text style={bodyText}>
          The next set of fixtures is live. Head back to the platform and
          extend your run — the longer the streak, the bigger the bonus.
          {streak >= 10
            ? " A 10-game streak is elite level. Don't let it stop here."
            : streak >= 5
            ? " You're halfway to a legendary streak bonus."
            : " Just 2 more correct calls to unlock a bigger bonus."}
        </Text>
      </Section>

      {/* CTA */}
      <Section style={pxCTA}>
        <Button style={ctaButton} href="https://matchkoo.com/app">
          Extend My Streak →
        </Button>
      </Section>
    </BaseLayout>
  );
}

StreakMilestoneEmail.PreviewProps = {
  name: "Ihab",
  streak: 5,
  bonusXp: 150,
  newTotalXp: 8500,
};

// ─── Styles ──────────────────────────────────────────────────────────────────
const px: React.CSSProperties = { padding: "22px 34px 8px 34px" };
const pxBody: React.CSSProperties = { padding: "22px 34px 8px 34px", fontFamily: "Arial, Helvetica, sans-serif" };
const pxCTA: React.CSSProperties = { padding: "24px 34px 32px 34px" };

const hero: React.CSSProperties = {
  padding: "24px 34px 12px 34px",
  background: "linear-gradient(135deg,#0D0500 0%,#1F0C00 48%,#0D0500 100%)",
  fontFamily: "Arial, Helvetica, sans-serif",
};

const badge: React.CSSProperties = {
  display: "inline-block", padding: "8px 12px", borderRadius: "999px",
  backgroundColor: "#2B0D00", color: "#FF4B00",
  fontSize: "12px", fontWeight: "700", letterSpacing: ".3px",
};

const heroTitle: React.CSSProperties = {
  margin: "18px 0 10px 0", fontSize: "40px", lineHeight: "44px",
  letterSpacing: "-1px", color: "#FFFFFF", fontWeight: "900",
};

const heroSubtitle: React.CSSProperties = {
  margin: 0, fontSize: "16px", lineHeight: "25px", color: "#D7B8A3",
};

const streakCard: React.CSSProperties = {
  backgroundColor: "#110500", border: "1px solid #3D1200",
  borderRadius: "22px", padding: "24px", fontFamily: "Arial, Helvetica, sans-serif",
};

const streakNumber: React.CSSProperties = {
  fontSize: "72px", fontWeight: "900", color: "#FF4B00",
  lineHeight: "1", marginBottom: "4px",
};

const streakLabel: React.CSSProperties = {
  fontSize: "11px", color: "#FF4B00", fontWeight: "700",
  textTransform: "uppercase", letterSpacing: ".8px", marginBottom: "4px",
};

const divider: React.CSSProperties = {
  height: "1px", backgroundColor: "#2A0D00", margin: "18px 0",
};

const statCol: React.CSSProperties = { width: "50%", paddingRight: "8px" };
const statColRight: React.CSSProperties = { width: "50%", paddingLeft: "8px" };

const statCard: React.CSSProperties = {
  background: "#1A0800", border: "1px solid #2A1000",
  borderRadius: "18px", padding: "16px", fontFamily: "Arial, Helvetica, sans-serif",
};

const statValue: React.CSSProperties = { fontSize: "24px", fontWeight: "900", color: "#FFFFFF" };
const statLabel: React.CSSProperties = { fontSize: "12px", color: "#A37060" };

const bodyTitle: React.CSSProperties = {
  margin: "0 0 10px 0", fontSize: "24px", lineHeight: "30px",
  color: "#FFFFFF", fontWeight: "900",
};

const bodyText: React.CSSProperties = {
  margin: 0, fontSize: "15px", lineHeight: "24px", color: "#D7B8A3",
};

const ctaButton: React.CSSProperties = {
  display: "inline-block", padding: "15px 26px",
  fontFamily: "Arial, Helvetica, sans-serif", fontSize: "15px",
  lineHeight: "20px", fontWeight: "900", color: "#06060A",
  backgroundColor: "#FF4B00", textDecoration: "none", borderRadius: "999px",
};
