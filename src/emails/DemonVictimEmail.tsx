import { Section, Text, Heading, Button } from "@react-email/components";
import * as React from "react";
import BaseLayout from "./BaseLayout";

interface DemonVictimEmailProps {
  name: string;
  miniLeagueName: string;
}

export default function DemonVictimEmail({
  name,
  miniLeagueName,
}: DemonVictimEmailProps) {
  return (
    <BaseLayout previewText={`Watch out! You've been hit by The Demon 😈 in ${miniLeagueName}`}>
      
      {/* Hero */}
      <Section style={hero}>
        <div style={badge}>😈 THE DEMON</div>
        <Heading style={heroTitle}>Watch out, {name}!</Heading>
        <Text style={heroSubtitle}>
          You have just been targeted by The Demon chip in the <strong style={{ color: "#fff" }}>{miniLeagueName}</strong> mini league!
        </Text>
      </Section>

      {/* Alert Card */}
      <Section style={px}>
        <Section style={alertCard}>
          <Text style={alertTitle}>CHIP CAST BY A RIVAL</Text>
          <div style={demonIcon}>😈</div>
          <Text style={alertDesc}>A rival cast the demon to ruin your ranking</Text>

          <div style={divider} />

          <div style={xpBig}>-500 XP</div>
          <div style={xpSub}>deducted from your total score in this mini league</div>
        </Section>
      </Section>

      {/* Body */}
      <Section style={pxBody}>
        <Heading style={bodyTitle}>Don't let them win.</Heading>
        <Text style={bodyText}>
          They struck first, but you can always earn your XP back with some spot-on predictions. Get back in the game and show them who's boss!
        </Text>
      </Section>

      {/* CTA */}
      <Section style={pxCTA}>
        <Button style={ctaButton} href="https://matchkoo.com/app">
          Plot Your Revenge →
        </Button>
      </Section>
    </BaseLayout>
  );
}

DemonVictimEmail.PreviewProps = {
  name: "Ahmed",
  miniLeagueName: "Office Championship",
};

// ─── Styles ──────────────────────────────────────────────────────────────────
const px: React.CSSProperties = { padding: "22px 34px 8px 34px" };
const pxBody: React.CSSProperties = { padding: "22px 34px 8px 34px", fontFamily: "Arial, Helvetica, sans-serif" };
const pxCTA: React.CSSProperties = { padding: "24px 34px 32px 34px" };

const hero: React.CSSProperties = {
  padding: "24px 34px 12px 34px",
  background: "linear-gradient(135deg,#1F000A 0%,#2B0000 48%,#1F000A 100%)",
  fontFamily: "Arial, Helvetica, sans-serif",
};

const badge: React.CSSProperties = {
  display: "inline-block", padding: "8px 12px", borderRadius: "999px",
  backgroundColor: "rgba(224, 26, 79, 0.2)", color: "#e01a4f",
  fontSize: "12px", fontWeight: "700", letterSpacing: ".3px",
};

const heroTitle: React.CSSProperties = {
  margin: "18px 0 10px 0", fontSize: "40px", lineHeight: "44px",
  letterSpacing: "-1px", color: "#FFFFFF", fontWeight: "900",
};

const heroSubtitle: React.CSSProperties = {
  margin: "0", fontSize: "16px", lineHeight: "24px", color: "#A0AEC0",
};

// Red-tinted card for Demon
const alertCard: React.CSSProperties = {
  background: "linear-gradient(135deg,#130005 0%,#1A000A 100%)",
  border: "1px solid #330011",
  borderRadius: "16px",
  padding: "32px",
  textAlign: "center",
  fontFamily: "Arial, Helvetica, sans-serif",
};

const alertTitle: React.CSSProperties = {
  margin: "0 0 16px 0", fontSize: "13px", color: "#e01a4f",
  fontWeight: "800", letterSpacing: "1px",
};

const demonIcon: React.CSSProperties = {
  fontSize: "48px", margin: "16px 0", lineHeight: "1",
};

const alertDesc: React.CSSProperties = {
  margin: "0", fontSize: "15px", color: "#A0AEC0", lineHeight: "22px",
};

const divider: React.CSSProperties = {
  height: "1px", backgroundColor: "#330011", margin: "24px 0",
};

const xpBig: React.CSSProperties = {
  fontSize: "48px", fontWeight: "900", color: "#e01a4f",
  letterSpacing: "-1px", lineHeight: "1", margin: "0 0 8px 0",
};

const xpSub: React.CSSProperties = {
  fontSize: "14px", color: "#A0AEC0", margin: "0",
};

const bodyTitle: React.CSSProperties = {
  margin: "0 0 12px 0", fontSize: "24px", color: "#FFFFFF",
  fontWeight: "800", letterSpacing: "-0.5px",
};

const bodyText: React.CSSProperties = {
  margin: "0", fontSize: "16px", lineHeight: "26px", color: "#A0AEC0",
};

const ctaButton: React.CSSProperties = {
  backgroundColor: "#e01a4f", color: "#FFFFFF", fontSize: "16px",
  fontWeight: "800", letterSpacing: "-0.2px", borderRadius: "12px",
  padding: "16px 32px", display: "inline-block", textAlign: "center",
  textDecoration: "none", boxShadow: "0 8px 24px rgba(224, 26, 79, 0.4)",
};
