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

interface MatchResultEmailProps {
  name: string;
  homeTeam: string;
  awayTeam: string;
  actualScore: string;
  predictedScore: string;
  resultCorrect: boolean;
  scoreCorrect: boolean;
  xpEarned: number;
  newTotalXp: number;
  firstGoalScorer?: string;
  scorerCorrect?: boolean;
}

export default function MatchResultEmail({
  name,
  homeTeam,
  awayTeam,
  actualScore,
  predictedScore,
  resultCorrect,
  scoreCorrect,
  xpEarned,
  newTotalXp,
  firstGoalScorer,
  scorerCorrect,
}: MatchResultEmailProps) {
  const outcomeLabel = scoreCorrect
    ? "PERFECT PREDICTION 🎯"
    : resultCorrect
    ? "RESULT CORRECT ✅"
    : "RESULT INCORRECT ❌";

  const outcomeColor = scoreCorrect || resultCorrect ? "#7CE900" : "#FF4B4B";

  return (
    <BaseLayout previewText={scoreCorrect ? `Perfect call! +${xpEarned} XP` : `Match Result: ${homeTeam} vs ${awayTeam}`}>
      {/* Hero / Header */}
      <Section style={hero}>
        <div style={{ ...badge, color: outcomeColor, backgroundColor: `${outcomeColor}1A` }}>
          {outcomeLabel}
        </div>
        <Heading style={heroTitle}>
          Match Result, {name}.
        </Heading>
        <Text style={heroSubtitle}>
          The final whistle has blown. Here is how your prediction for {homeTeam} vs {awayTeam} performed.
        </Text>
      </Section>

      {/* Match Result Card */}
      <Section style={px}>
        <Section style={scoreCard}>
          <Row>
            <Column align="left">
              <Text style={scoreCardTag}>Final Scoreline</Text>
            </Column>
            <Column align="right">
              <Text style={scoreCardTime}>FT</Text>
            </Column>
          </Row>
          <Row style={{ marginTop: "18px" }}>
            <Column align="left" style={teamName}>{homeTeam}</Column>
            <Column align="center" style={scoreDisplay}>{actualScore}</Column>
            <Column align="right" style={teamName}>{awayTeam}</Column>
          </Row>
          
          <div style={divider} />
          
          <Row>
            <Column style={predictionCol}>
              <Text style={predictionLabel}>YOUR PREDICTION</Text>
              <Text style={{ ...predictionValue, color: scoreCorrect ? "#7CE900" : "#FFFFFF" }}>
                {predictedScore}
              </Text>
            </Column>
            <Column style={predictionCol}>
              <Text style={predictionLabel}>RESULT STATUS</Text>
              <Text style={{ ...predictionValue, color: outcomeColor }}>
                {resultCorrect ? "Correct" : "Incorrect"}
              </Text>
            </Column>
          </Row>
          
          {firstGoalScorer && (
            <>
              <div style={divider} />
              <Row>
                <Column>
                  <Text style={predictionLabel}>FIRST GOALSCORER</Text>
                  <Text style={{ ...predictionValue, color: scorerCorrect ? "#7CE900" : "#FF4B4B" }}>
                    {firstGoalScorer} {scorerCorrect ? "✅" : "❌"}
                  </Text>
                </Column>
              </Row>
            </>
          )}
        </Section>
      </Section>

      {/* Stats / XP */}
      <Section style={px}>
        <Row style={{ marginTop: "18px" }}>
          <Column style={statCol}>
            <div style={statCard}>
              <div style={{ ...statValue, color: "#7CE900" }}>+{xpEarned}</div>
              <div style={statLabel}>XP Earned</div>
            </div>
          </Column>
          <Column style={statColCenter}>
            <div style={statCard}>
              <div style={statValue}>{newTotalXp.toLocaleString()}</div>
              <div style={statLabel}>Total XP</div>
            </div>
          </Column>
          <Column style={statCol}>
            <div style={statCard}>
              <div style={statValue}>{scoreCorrect ? "🎯" : resultCorrect ? "✅" : "❌"}</div>
              <div style={statLabel}>Accuracy</div>
            </div>
          </Column>
        </Row>
      </Section>

      {/* Body copy */}
      <Section style={pxBody}>
        <Heading style={bodyTitle}>Keep the momentum going.</Heading>
        <Text style={bodyText}>
          The next matches are just around the corner. Head back to the arena to lock in your next set of predictions and climb the leaderboard.
        </Text>
      </Section>

      {/* CTA */}
      <Section style={pxCTA}>
        <Button style={ctaButton} href="https://matchkoo.com/app">
          Predict More Matches
        </Button>
      </Section>
    </BaseLayout>
  );
}

MatchResultEmail.PreviewProps = {
  name: "Ihab",
  homeTeam: "Man United",
  awayTeam: "Arsenal",
  actualScore: "1 — 2",
  predictedScore: "1 — 2",
  resultCorrect: true,
  scoreCorrect: true,
  xpEarned: 600,
  newTotalXp: 12500,
  firstGoalScorer: "Saka",
  scorerCorrect: true,
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

const divider: React.CSSProperties = {
  height: "1px",
  backgroundColor: "#18340F",
  margin: "18px 0",
};

const predictionCol: React.CSSProperties = {
  width: "50%",
};

const predictionLabel: React.CSSProperties = {
  fontSize: "10px",
  color: "#92A38B",
  fontWeight: "700",
  textTransform: "uppercase",
  letterSpacing: "0.5px",
  margin: "0 0 4px 0",
};

const predictionValue: React.CSSProperties = {
  fontSize: "16px",
  color: "#FFFFFF",
  fontWeight: "800",
  margin: 0,
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
