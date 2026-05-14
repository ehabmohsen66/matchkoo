import { Section, Text, Heading, Row, Column, Button } from "@react-email/components";
import * as React from "react";
import BaseLayout from "./BaseLayout";

interface TeamMatchReminderEmailProps {
  name: string;
  clubName: string;
  homeTeam: string;
  awayTeam: string;
  matchTime: string; // e.g. "20:00"
  leagueName: string;
  isHome: boolean; // is clubName the home team?
  snoozeBaseUrl: string; // e.g. https://matchkoo.com/api/team-reminder/snooze
  token: string; // signed snooze token
}

export default function TeamMatchReminderEmail({
  name,
  clubName,
  homeTeam,
  awayTeam,
  matchTime,
  leagueName,
  isHome,
  snoozeBaseUrl,
  token,
}: TeamMatchReminderEmailProps) {
  const snoozeUrl = (duration: string) =>
    `${snoozeBaseUrl}?token=${encodeURIComponent(token)}&duration=${duration}`;

  return (
    <BaseLayout previewText={`⚽ ${clubName} plays today at ${matchTime} — vote now!`}>
      {/* Hero */}
      <Section style={hero}>
        <div style={badge}>⚽ MATCH DAY REMINDER</div>
        <Heading style={heroTitle}>Your team plays today, {name}.</Heading>
        <Text style={heroSubtitle}>
          {clubName} kicks off at {matchTime}. You haven&apos;t voted yet —
          head to the platform and show your support.
        </Text>
      </Section>

      {/* Match card */}
      <Section style={px}>
        <Section style={matchCard}>
          <Text style={leagueTag}>{leagueName}</Text>

          <Row style={{ marginTop: "16px" }}>
            <Column align="left">
              <div style={{ ...teamNameStyle, color: isHome ? "#7CE900" : "#FFFFFF" }}>
                {homeTeam}
                {isHome && <span style={yourTeamBadge}> ★</span>}
              </div>
            </Column>
            <Column align="center" style={vsCol}>vs</Column>
            <Column align="right">
              <div style={{ ...teamNameStyle, color: !isHome ? "#7CE900" : "#FFFFFF" }}>
                {awayTeam}
                {!isHome && <span style={yourTeamBadge}> ★</span>}
              </div>
            </Column>
          </Row>

          <div style={timeRow}>
            <span style={kickoffLabel}>KICK OFF</span>
            <span style={kickoffTime}>{matchTime}</span>
          </div>
        </Section>
      </Section>

      {/* CTA */}
      <Section style={pxCTA}>
        <Button style={ctaButton} href="https://matchkoo.com/app">
          Vote for {clubName} Now →
        </Button>
      </Section>

      {/* Snooze options */}
      <Section style={snoozeSection}>
        <Text style={snoozeTitle}>Don&apos;t want reminders for {clubName}?</Text>
        <Row style={snoozeRow}>
          <Column align="center">
            <a href={snoozeUrl("week")} style={snoozeBtn}>1 Week</a>
          </Column>
          <Column align="center">
            <a href={snoozeUrl("month")} style={snoozeBtn}>1 Month</a>
          </Column>
          <Column align="center">
            <a href={snoozeUrl("year")} style={snoozeBtn}>1 Year</a>
          </Column>
          <Column align="center">
            <a href={snoozeUrl("forever")} style={{ ...snoozeBtn, color: "#FF4B4B", borderColor: "#FF4B4B44" }}>
              Forever
            </a>
          </Column>
        </Row>
      </Section>
    </BaseLayout>
  );
}

TeamMatchReminderEmail.PreviewProps = {
  name: "Ihab",
  clubName: "Arsenal",
  homeTeam: "Arsenal",
  awayTeam: "Chelsea",
  matchTime: "20:00",
  leagueName: "English Premier League",
  isHome: true,
  snoozeBaseUrl: "https://matchkoo.com/api/team-reminder/snooze",
  token: "preview-token",
};

// ─── Styles ──────────────────────────────────────────────────────────────────
const px: React.CSSProperties = { padding: "22px 34px 8px 34px" };
const pxCTA: React.CSSProperties = { padding: "20px 34px 8px 34px" };

const hero: React.CSSProperties = {
  padding: "24px 34px 12px 34px",
  background: "linear-gradient(135deg,#080D08 0%,#0D1F0A 48%,#080D08 100%)",
  fontFamily: "Arial, Helvetica, sans-serif",
};

const badge: React.CSSProperties = {
  display: "inline-block", padding: "8px 12px", borderRadius: "999px",
  backgroundColor: "#102E07", color: "#7CE900",
  fontSize: "12px", fontWeight: "700", letterSpacing: ".3px",
};

const heroTitle: React.CSSProperties = {
  margin: "18px 0 10px 0", fontSize: "38px", lineHeight: "44px",
  letterSpacing: "-1px", color: "#FFFFFF", fontWeight: "900",
};

const heroSubtitle: React.CSSProperties = {
  margin: 0, fontSize: "16px", lineHeight: "25px", color: "#C9D7C3",
};

const matchCard: React.CSSProperties = {
  backgroundColor: "#0F170D", border: "1px solid #244B16",
  borderRadius: "22px", padding: "24px",
  fontFamily: "Arial, Helvetica, sans-serif",
};

const leagueTag: React.CSSProperties = {
  fontSize: "11px", color: "#7CE900", fontWeight: "700",
  textTransform: "uppercase", letterSpacing: ".8px", margin: 0,
};

const teamNameStyle: React.CSSProperties = {
  fontSize: "16px", fontWeight: "800",
};

const yourTeamBadge: React.CSSProperties = {
  color: "#7CE900", fontSize: "14px",
};

const vsCol: React.CSSProperties = {
  fontSize: "18px", color: "#555", fontWeight: "900",
};

const timeRow: React.CSSProperties = {
  display: "flex", justifyContent: "center", alignItems: "center",
  gap: "10px", marginTop: "18px",
  borderTop: "1px solid #1A3710", paddingTop: "14px",
};

const kickoffLabel: React.CSSProperties = {
  fontSize: "11px", color: "#7CE900", fontWeight: "700",
  textTransform: "uppercase", letterSpacing: ".8px",
};

const kickoffTime: React.CSSProperties = {
  fontSize: "22px", fontWeight: "900", color: "#FFFFFF",
};

const ctaButton: React.CSSProperties = {
  display: "inline-block", padding: "15px 26px",
  fontFamily: "Arial, Helvetica, sans-serif", fontSize: "15px",
  lineHeight: "20px", fontWeight: "900", color: "#061006",
  backgroundColor: "#6AC800", textDecoration: "none", borderRadius: "999px",
};

const snoozeSection: React.CSSProperties = {
  padding: "24px 34px 32px 34px",
  borderTop: "1px solid #1A1A1A",
  fontFamily: "Arial, Helvetica, sans-serif",
};

const snoozeTitle: React.CSSProperties = {
  fontSize: "13px", color: "#666", margin: "0 0 12px 0",
  textAlign: "center",
};

const snoozeRow: React.CSSProperties = {
  marginTop: "4px",
};

const snoozeBtn: React.CSSProperties = {
  display: "inline-block", padding: "7px 12px",
  border: "1px solid #333", borderRadius: "999px",
  color: "#888", fontSize: "12px", fontWeight: "600",
  textDecoration: "none", textAlign: "center",
};
