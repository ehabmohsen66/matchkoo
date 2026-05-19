import { Section, Text, Heading, Button } from "@react-email/components";
import * as React from "react";
import BaseLayout from "./BaseLayout";

interface ReferralWelcomeBonusEmailProps {
  name: string;        // new user's name
  referrerName: string; // friend who invited them
  xpAwarded: number;
  newTotalXp: number;
}

export default function ReferralWelcomeBonusEmail({
  name,
  referrerName,
  xpAwarded,
  newTotalXp,
}: ReferralWelcomeBonusEmailProps) {
  return (
    <BaseLayout previewText={`🎁 Welcome bonus! ${referrerName}'s invite earned you +${xpAwarded} XP on your first prediction.`}>

      {/* Hero */}
      <Section style={hero}>
        <div style={badge}>🎁 WELCOME BONUS</div>
        <Heading style={heroTitle}>You earned a bonus, {name}!</Heading>
        <Text style={heroSubtitle}>
          {referrerName} invited you to Matchkoo. As a thank-you for making
          your first prediction, you&apos;ve been rewarded.
        </Text>
      </Section>

      {/* Reward card */}
      <Section style={px}>
        <Section style={rewardCard}>
          <Text style={invitedLabel}>INVITED BY</Text>
          <div style={referrerNameStyle}>{referrerName}</div>
          <Text style={invitedDesc}>shared their personal invite link with you 🤝</Text>

          <div style={divider} />

          <div style={xpBig}>+{xpAwarded} XP</div>
          <div style={xpSub}>added to your account · welcome bonus</div>

          <div style={divider} />

          <div style={totalRow}>
            <span style={totalLabel}>Your current total</span>
            <span style={totalValue}>{newTotalXp.toLocaleString()} XP</span>
          </div>
        </Section>
      </Section>

      {/* Body */}
      <Section style={pxBody}>
        <Heading style={bodyTitle}>Now invite your own friends.</Heading>
        <Text style={bodyText}>
          Your invite link is waiting in your profile. Every friend you invite
          who makes their first prediction earns you both +{xpAwarded} XP. Keep
          the chain going!
        </Text>
      </Section>

      {/* CTA */}
      <Section style={pxCTA}>
        <Button style={ctaButton} href="https://matchkoo.com/app">
          Make Your Next Prediction →
        </Button>
      </Section>
    </BaseLayout>
  );
}

ReferralWelcomeBonusEmail.PreviewProps = {
  name: "Ahmed",
  referrerName: "Ihab",
  xpAwarded: 200,
  newTotalXp: 200,
};

// ─── Styles ──────────────────────────────────────────────────────────────────
const px: React.CSSProperties = { padding: "22px 34px 8px 34px" };
const pxBody: React.CSSProperties = { padding: "22px 34px 8px 34px", fontFamily: "Arial, Helvetica, sans-serif" };
const pxCTA: React.CSSProperties = { padding: "24px 34px 32px 34px" };

const hero: React.CSSProperties = {
  padding: "24px 34px 12px 34px",
  background: "linear-gradient(135deg,#000A0A 0%,#001A1F 48%,#000A0A 100%)",
  fontFamily: "Arial, Helvetica, sans-serif",
};

const badge: React.CSSProperties = {
  display: "inline-block", padding: "8px 12px", borderRadius: "999px",
  backgroundColor: "#1A1000", color: "#FF9914",
  fontSize: "12px", fontWeight: "700", letterSpacing: ".3px",
};

const heroTitle: React.CSSProperties = {
  margin: "18px 0 10px 0", fontSize: "40px", lineHeight: "44px",
  letterSpacing: "-1px", color: "#FFFFFF", fontWeight: "900",
};

const heroSubtitle: React.CSSProperties = {
  margin: 0, fontSize: "16px", lineHeight: "25px", color: "#A3D0D7",
};

const rewardCard: React.CSSProperties = {
  backgroundColor: "#050F10", border: "1px solid #0A3A40",
  borderRadius: "22px", padding: "28px 24px",
  fontFamily: "Arial, Helvetica, sans-serif", textAlign: "center",
};

const invitedLabel: React.CSSProperties = {
  fontSize: "11px", color: "#FF9914", fontWeight: "700",
  textTransform: "uppercase", letterSpacing: ".8px", margin: "0 0 6px 0",
};

const referrerNameStyle: React.CSSProperties = {
  fontSize: "26px", fontWeight: "900", color: "#FFFFFF", marginBottom: "4px",
};

const invitedDesc: React.CSSProperties = {
  fontSize: "14px", color: "#7AABB0", margin: "0 0 4px 0",
};

const divider: React.CSSProperties = {
  height: "1px", backgroundColor: "#0A2A30", margin: "18px 0",
};

const xpBig: React.CSSProperties = {
  fontSize: "52px", fontWeight: "900", color: "#FF9914",
  lineHeight: "1", marginBottom: "6px",
};

const xpSub: React.CSSProperties = {
  fontSize: "13px", color: "#5A9BA0", fontWeight: "600",
};

const totalRow: React.CSSProperties = {
  display: "flex", justifyContent: "space-between", alignItems: "center",
};

const totalLabel: React.CSSProperties = {
  fontSize: "12px", color: "#7AABB0", fontWeight: "600",
};

const totalValue: React.CSSProperties = {
  fontSize: "15px", fontWeight: "800", color: "#FFFFFF",
};

const bodyTitle: React.CSSProperties = {
  margin: "0 0 10px 0", fontSize: "24px", lineHeight: "30px",
  color: "#FFFFFF", fontWeight: "900",
};

const bodyText: React.CSSProperties = {
  margin: 0, fontSize: "15px", lineHeight: "24px", color: "#A3D0D7",
};

const ctaButton: React.CSSProperties = {
  display: "inline-block", padding: "15px 26px",
  fontFamily: "Arial, Helvetica, sans-serif", fontSize: "15px",
  lineHeight: "20px", fontWeight: "900", color: "#06060A",
  backgroundColor: "#FF9914", textDecoration: "none", borderRadius: "999px",
};
