import {
  Section,
  Text,
  Heading,
  Row,
  Column,
  Button,
} from "@react-email/components";
import * as React from "react";
import BaseLayout from "./BaseLayout";

interface DailyBonusEmailProps {
  name: string;
  prize: string;
  xpAwarded: number;
  newTotalXp: number;
}

export default function DailyBonusEmail({
  name,
  prize,
  xpAwarded,
  newTotalXp,
}: DailyBonusEmailProps) {
  const hasXp = xpAwarded > 0;

  return (
    <BaseLayout previewText={`🎡 You won ${prize} on today's Daily Spin!`}>
      {/* Hero */}
      <Section style={hero}>
        <div style={badge}>🎡 DAILY BONUS</div>
        <Heading style={heroTitle}>You spun. You won, {name}.</Heading>
        <Text style={heroSubtitle}>
          The wheel has spoken. Here&apos;s what you picked up today on Matchkoo.
        </Text>
      </Section>

      {/* Prize card */}
      <Section style={px}>
        <Section style={prizeCard}>
          <Text style={prizeLabel}>TODAY&apos;S PRIZE</Text>
          <div style={prizeValue}>{prize}</div>

          <div style={divider} />

          <Row>
            <Column style={statCol}>
              <div style={statCard}>
                <div style={{ ...statValue, color: "#FF9914" }}>
                  {hasXp ? `+${xpAwarded}` : "🎁"}
                </div>
                <div style={statLabel}>{hasXp ? "XP Earned" : "Reward"}</div>
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

      {/* Body copy */}
      <Section style={pxBody}>
        <Heading style={bodyTitle}>Come back tomorrow for another spin.</Heading>
        <Text style={bodyText}>
          Your daily bonus resets every 24 hours. In the meantime, lock in your
          match predictions to keep climbing the leaderboard and building your
          streak.
        </Text>
      </Section>

      {/* CTA */}
      <Section style={pxCTA}>
        <Button style={ctaButton} href="https://matchkoo.com/app">
          Make Your Predictions →
        </Button>
      </Section>
    </BaseLayout>
  );
}

DailyBonusEmail.PreviewProps = {
  name: "Ihab",
  prize: "150 XP",
  xpAwarded: 150,
  newTotalXp: 4350,
};

// ─── Styles ──────────────────────────────────────────────────────────────────
const px: React.CSSProperties = {
  padding: "22px 34px 8px 34px",
};

const pxBody: React.CSSProperties = {
  padding: "22px 34px 8px 34px",
  fontFamily: "Arial, Helvetica, sans-serif",
};

const pxCTA: React.CSSProperties = {
  padding: "24px 34px 32px 34px",
};

const hero: React.CSSProperties = {
  padding: "24px 34px 12px 34px",
  background: "linear-gradient(135deg,#0D0A00 0%,#1F1500 48%,#0D0A00 100%)",
  fontFamily: "Arial, Helvetica, sans-serif",
};

const badge: React.CSSProperties = {
  display: "inline-block",
  padding: "8px 12px",
  borderRadius: "999px",
  backgroundColor: "#2B1D00",
  color: "#FF9914",
  fontSize: "12px",
  fontWeight: "700",
  letterSpacing: ".3px",
};

const heroTitle: React.CSSProperties = {
  margin: "18px 0 10px 0",
  fontSize: "40px",
  lineHeight: "44px",
  letterSpacing: "-1px",
  color: "#FFFFFF",
  fontWeight: "900",
};

const heroSubtitle: React.CSSProperties = {
  margin: 0,
  fontSize: "16px",
  lineHeight: "25px",
  color: "#D7C9A3",
};

const prizeCard: React.CSSProperties = {
  backgroundColor: "#110D00",
  border: "1px solid #3D2D00",
  borderRadius: "22px",
  padding: "24px",
  fontFamily: "Arial, Helvetica, sans-serif",
};

const prizeLabel: React.CSSProperties = {
  fontSize: "11px",
  color: "#FF9914",
  fontWeight: "700",
  textTransform: "uppercase",
  letterSpacing: ".8px",
  margin: "0 0 10px 0",
};

const prizeValue: React.CSSProperties = {
  fontSize: "42px",
  fontWeight: "900",
  color: "#FFFFFF",
  marginBottom: "4px",
};

const divider: React.CSSProperties = {
  height: "1px",
  backgroundColor: "#2A1E00",
  margin: "18px 0",
};

const statCol: React.CSSProperties = {
  width: "50%",
  paddingRight: "8px",
};

const statColRight: React.CSSProperties = {
  width: "50%",
  paddingLeft: "8px",
};

const statCard: React.CSSProperties = {
  background: "#1A1200",
  border: "1px solid #2A1E00",
  borderRadius: "18px",
  padding: "16px",
  fontFamily: "Arial, Helvetica, sans-serif",
};

const statValue: React.CSSProperties = {
  fontSize: "24px",
  fontWeight: "900",
  color: "#FFFFFF",
};

const statLabel: React.CSSProperties = {
  fontSize: "12px",
  color: "#A38B30",
};

const bodyTitle: React.CSSProperties = {
  margin: "0 0 10px 0",
  fontSize: "24px",
  lineHeight: "30px",
  color: "#FFFFFF",
  fontWeight: "900",
};

const bodyText: React.CSSProperties = {
  margin: 0,
  fontSize: "15px",
  lineHeight: "24px",
  color: "#D7C9A3",
};

const ctaButton: React.CSSProperties = {
  display: "inline-block",
  padding: "15px 26px",
  fontFamily: "Arial, Helvetica, sans-serif",
  fontSize: "15px",
  lineHeight: "20px",
  fontWeight: "900",
  color: "#06060A",
  backgroundColor: "#FF9914",
  textDecoration: "none",
  borderRadius: "999px",
};
