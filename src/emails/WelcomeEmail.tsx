import {
  Section,
  Text,
  Heading,
  Row,
  Column,
  Link,
  Button,
} from "@react-email/components";
import * as React from "react";
import BaseLayout from "./BaseLayout";

interface WelcomeEmailProps {
  name: string;
  email: string;
}

export default function WelcomeEmail({ name, email }: WelcomeEmailProps) {
  return (
    <BaseLayout previewText={`Welcome to Matchkoo, ${name} — the arena is open ⚽`}>
      {/* Hero */}
      <Section style={hero}>
        <div style={badge}>⚽ New season challenge is live</div>
        <Heading style={heroTitle}>
          Predict Football.<br />
          <span style={{ color: "#7CE900" }}>Compete. Win.</span>
        </Heading>
        <Text style={heroSubtitle}>
          Join Matchkoo and prove your football knowledge. Predict results, exact scores, and first goalscorers, then earn XP as you climb global and friends leaderboards.
        </Text>
      </Section>

      {/* Live match card (Mock for welcome) */}
      <Section style={px}>
        <Section style={scoreCard}>
          <Row>
            <Column align="left">
              <Text style={scoreCardTag}>Live prediction pulse</Text>
            </Column>
            <Column align="right">
              <Text style={scoreCardTime}>67&apos;</Text>
            </Column>
          </Row>
          <Row style={{ marginTop: "18px" }}>
            <Column align="left" style={teamName}>Team A</Column>
            <Column align="center" style={scoreDisplay}>1 — 2</Column>
            <Column align="right" style={teamName}>Team B</Column>
          </Row>
          <div style={{ height: "12px" }}>&nbsp;</div>
          <Row>
            <Column width="42%" style={{ height: "10px", background: "#7CE900", borderRadius: "999px 0 0 999px" }} />
            <Column width="18%" style={{ height: "10px", background: "#FFFFFF" }} />
            <Column width="40%" style={{ height: "10px", background: "#5AA000", borderRadius: "0 999px 999px 0" }} />
          </Row>
          <Text style={communityPicks}>
            Community picks: Home 42% · Draw 18% · Away 40%
          </Text>
        </Section>
      </Section>

      {/* Stats */}
      <Section style={px}>
        <Row style={{ marginTop: "18px" }}>
          <Column style={statCol}>
            <div style={statCard}>
              <div style={statValue}>5</div>
              <div style={statLabel}>Top Leagues</div>
            </div>
          </Column>
          <Column style={statColCenter}>
            <div style={statCard}>
              <div style={statValue}>+200</div>
              <div style={statLabel}>Exact-score XP</div>
            </div>
          </Column>
          <Column style={statCol}>
            <div style={statCard}>
              <div style={statValue}>×2</div>
              <div style={statLabel}>Streak bonus</div>
            </div>
          </Column>
        </Row>
      </Section>

      {/* Body copy */}
      <Section style={pxBody}>
        <Heading style={bodyTitle}>Make your first pick today.</Heading>
        <Text style={bodyText}>
          Pick upcoming matches, set your confidence level, and watch your rank update as the action unfolds. Create a private mini league to challenge friends, family, or colleagues.
        </Text>
      </Section>

      {/* CTA */}
      <Section style={pxCTA}>
        <Button style={ctaButton} href="https://matchkoo.com/app">
          Start Predicting Free
        </Button>
        <Text style={ctaSubtext}>
          Free forever · 5 top leagues · Global leaderboards
        </Text>
      </Section>
    </BaseLayout>
  );
}

WelcomeEmail.PreviewProps = {
  name: "Ihab Mohamed",
  email: "ihab@example.com",
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
  background: "linear-gradient(135deg,#0A0F08 0%,#10240B 48%,#0A0F08 100%)",
  fontFamily: "Arial, Helvetica, sans-serif",
};

const badge: React.CSSProperties = {
  display: "inline-block",
  padding: "8px 12px",
  borderRadius: "999px",
  backgroundColor: "#102E07",
  color: "#7CE900",
  fontSize: "12px",
  fontWeight: "700",
  letterSpacing: ".3px",
};

const heroTitle: React.CSSProperties = {
  margin: "18px 0 10px 0",
  fontSize: "46px",
  lineHeight: "50px",
  letterSpacing: "-1.4px",
  color: "#FFFFFF",
  fontWeight: "900",
};

const heroSubtitle: React.CSSProperties = {
  margin: 0,
  fontSize: "16px",
  lineHeight: "25px",
  color: "#C9D7C3",
};

const scoreCard: React.CSSProperties = {
  backgroundColor: "#0F170D",
  border: "1px solid #244B16",
  borderRadius: "22px",
  padding: "24px",
  fontFamily: "Arial, Helvetica, sans-serif",
};

const scoreCardTag: React.CSSProperties = {
  fontSize: "12px",
  color: "#7CE900",
  fontWeight: "700",
  textTransform: "uppercase",
  letterSpacing: ".8px",
  margin: 0,
};

const scoreCardTime: React.CSSProperties = {
  fontSize: "12px",
  color: "#FFFFFF",
  margin: 0,
};

const teamName: React.CSSProperties = {
  fontSize: "14px",
  color: "#DDE7D8",
  fontWeight: "700",
};

const scoreDisplay: React.CSSProperties = {
  fontSize: "28px",
  color: "#FFFFFF",
  fontWeight: "900",
};

const communityPicks: React.CSSProperties = {
  margin: "12px 0 0 0",
  fontSize: "13px",
  lineHeight: "20px",
  color: "#95A78E",
};

const statCol: React.CSSProperties = {
  width: "33.33%",
  paddingRight: "8px",
};

const statColCenter: React.CSSProperties = {
  width: "33.33%",
  paddingLeft: "4px",
  paddingRight: "4px",
};

const statCard: React.CSSProperties = {
  background: "#0F170D",
  border: "1px solid #1A3710",
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
  color: "#92A38B",
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
  color: "#C9D7C3",
};

const ctaButton: React.CSSProperties = {
  display: "inline-block",
  padding: "15px 26px",
  fontFamily: "Arial, Helvetica, sans-serif",
  fontSize: "15px",
  lineHeight: "20px",
  fontWeight: "900",
  color: "#061006",
  backgroundColor: "#6AC800",
  textDecoration: "none",
  borderRadius: "999px",
};

const ctaSubtext: React.CSSProperties = {
  margin: "14px 0 0 0",
  fontFamily: "Arial, Helvetica, sans-serif",
  fontSize: "12px",
  lineHeight: "19px",
  color: "#7D9076",
};
