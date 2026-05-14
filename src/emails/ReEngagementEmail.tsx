import { Section, Text, Heading, Row, Column, Button } from "@react-email/components";
import * as React from "react";
import BaseLayout from "./BaseLayout";

interface ReEngagementEmailProps {
  name: string;
  daysSinceLastPrediction: number;
  upcomingMatchCount: number;
  featuredMatch?: string; // e.g. "Man City vs Real Madrid"
  featuredLeague?: string; // e.g. "UEFA Champions League"
}

export default function ReEngagementEmail({
  name,
  daysSinceLastPrediction,
  upcomingMatchCount,
  featuredMatch,
  featuredLeague,
}: ReEngagementEmailProps) {
  return (
    <BaseLayout previewText={`⚽ ${upcomingMatchCount} matches tonight — don't miss your predictions, ${name}`}>
      {/* Hero */}
      <Section style={hero}>
        <div style={badge}>⚽ MATCHES TONIGHT</div>
        <Heading style={heroTitle}>You&apos;ve been missed, {name}.</Heading>
        <Text style={heroSubtitle}>
          It&apos;s been {daysSinceLastPrediction} day{daysSinceLastPrediction !== 1 ? "s" : ""} since your last prediction.
          There {upcomingMatchCount === 1 ? "is" : "are"} {upcomingMatchCount} match{upcomingMatchCount !== 1 ? "es" : ""} coming
          up and XP is up for grabs.
        </Text>
      </Section>

      {/* Stats card */}
      <Section style={px}>
        <Section style={alertCard}>
          {featuredMatch && (
            <>
              <Text style={featuredLabel}>DON&apos;T MISS</Text>
              <div style={featuredMatchName}>{featuredMatch}</div>
              {featuredLeague && <div style={featuredLeagueName}>{featuredLeague}</div>}
              <div style={divider} />
            </>
          )}

          <Row>
            <Column style={statCol}>
              <div style={statCard}>
                <div style={{ ...statValue, color: "#7CE900" }}>{upcomingMatchCount}</div>
                <div style={statLabel}>Matches to Predict</div>
              </div>
            </Column>
            <Column style={statColRight}>
              <div style={statCard}>
                <div style={{ ...statValue, color: "#FF9914" }}>{daysSinceLastPrediction}d</div>
                <div style={statLabel}>Since Last Prediction</div>
              </div>
            </Column>
          </Row>
        </Section>
      </Section>

      {/* Body */}
      <Section style={pxBody}>
        <Heading style={bodyTitle}>Your streak is waiting.</Heading>
        <Text style={bodyText}>
          Every match you skip is XP left on the table. Predict tonight&apos;s
          fixtures, lock in your confidence rating, and pick a first goalscorer
          for extra XP. The leaderboard doesn&apos;t wait.
        </Text>
      </Section>

      {/* CTA */}
      <Section style={pxCTA}>
        <Button style={ctaButton} href="https://matchkoo.com/app">
          Predict Tonight&apos;s Matches →
        </Button>
      </Section>
    </BaseLayout>
  );
}

ReEngagementEmail.PreviewProps = {
  name: "Ihab",
  daysSinceLastPrediction: 4,
  upcomingMatchCount: 6,
  featuredMatch: "Manchester City vs Real Madrid",
  featuredLeague: "UEFA Champions League",
};

// ─── Styles ──────────────────────────────────────────────────────────────────
const px: React.CSSProperties = { padding: "22px 34px 8px 34px" };
const pxBody: React.CSSProperties = { padding: "22px 34px 8px 34px", fontFamily: "Arial, Helvetica, sans-serif" };
const pxCTA: React.CSSProperties = { padding: "24px 34px 32px 34px" };

const hero: React.CSSProperties = {
  padding: "24px 34px 12px 34px",
  background: "linear-gradient(135deg,#080810 0%,#0F1030 48%,#080810 100%)",
  fontFamily: "Arial, Helvetica, sans-serif",
};

const badge: React.CSSProperties = {
  display: "inline-block", padding: "8px 12px", borderRadius: "999px",
  backgroundColor: "#0F1535", color: "#6B8AFF",
  fontSize: "12px", fontWeight: "700", letterSpacing: ".3px",
};

const heroTitle: React.CSSProperties = {
  margin: "18px 0 10px 0", fontSize: "40px", lineHeight: "44px",
  letterSpacing: "-1px", color: "#FFFFFF", fontWeight: "900",
};

const heroSubtitle: React.CSSProperties = {
  margin: 0, fontSize: "16px", lineHeight: "25px", color: "#B0B8D7",
};

const alertCard: React.CSSProperties = {
  backgroundColor: "#060810", border: "1px solid #1A2050",
  borderRadius: "22px", padding: "24px",
  fontFamily: "Arial, Helvetica, sans-serif",
};

const featuredLabel: React.CSSProperties = {
  fontSize: "11px", color: "#6B8AFF", fontWeight: "700",
  textTransform: "uppercase", letterSpacing: ".8px", margin: "0 0 8px 0",
};

const featuredMatchName: React.CSSProperties = {
  fontSize: "22px", fontWeight: "900", color: "#FFFFFF", marginBottom: "4px",
};

const featuredLeagueName: React.CSSProperties = {
  fontSize: "13px", color: "#6B8AFF", fontWeight: "600", marginBottom: "4px",
};

const divider: React.CSSProperties = {
  height: "1px", backgroundColor: "#1A2050", margin: "18px 0",
};

const statCol: React.CSSProperties = { width: "50%", paddingRight: "8px" };
const statColRight: React.CSSProperties = { width: "50%", paddingLeft: "8px" };

const statCard: React.CSSProperties = {
  background: "#0A0C1A", border: "1px solid #1A2050",
  borderRadius: "18px", padding: "16px", fontFamily: "Arial, Helvetica, sans-serif",
};

const statValue: React.CSSProperties = { fontSize: "28px", fontWeight: "900", color: "#FFFFFF" };
const statLabel: React.CSSProperties = { fontSize: "12px", color: "#6070A0" };

const bodyTitle: React.CSSProperties = {
  margin: "0 0 10px 0", fontSize: "24px", lineHeight: "30px",
  color: "#FFFFFF", fontWeight: "900",
};

const bodyText: React.CSSProperties = {
  margin: 0, fontSize: "15px", lineHeight: "24px", color: "#B0B8D7",
};

const ctaButton: React.CSSProperties = {
  display: "inline-block", padding: "15px 26px",
  fontFamily: "Arial, Helvetica, sans-serif", fontSize: "15px",
  lineHeight: "20px", fontWeight: "900", color: "#06060A",
  backgroundColor: "#6B8AFF", textDecoration: "none", borderRadius: "999px",
};
