import { Section, Text, Heading, Button } from "@react-email/components";
import * as React from "react";
import BaseLayout from "./BaseLayout";

interface ReferralConvertedEmailProps {
  name: string;
  friendName: string;
  xpAwarded: number;
  newTotalXp: number;
}

export default function ReferralConvertedEmail({
  name,
  friendName,
  xpAwarded,
  newTotalXp,
}: ReferralConvertedEmailProps) {
  return (
    <BaseLayout previewText={`🎉 ${friendName} just made their first prediction — you earned +${xpAwarded} XP!`}>
      {/* Hero */}
      <Section style={hero}>
        <div style={badge}>🤝 REFERRAL BONUS</div>
        <Heading style={heroTitle}>Your invite paid off, {name}.</Heading>
        <Text style={heroSubtitle}>
          {friendName} just made their first prediction on Matchkoo. As their
          referrer, you&apos;ve been rewarded.
        </Text>
      </Section>

      {/* Reward card */}
      <Section style={px}>
        <Section style={rewardCard}>
          <Text style={friendLabel}>YOUR FRIEND</Text>
          <div style={friendName_}>{friendName}</div>
          <Text style={friendDesc}>just made their first prediction ⚽</Text>

          <div style={divider} />

          <div style={xpBig}>+{xpAwarded} XP</div>
          <div style={xpSub}>added to your account</div>

          <div style={divider} />

          <div style={totalRow}>
            <span style={totalLabel}>Your new total</span>
            <span style={totalValue}>{newTotalXp.toLocaleString()} XP</span>
          </div>
        </Section>
      </Section>

      {/* Body */}
      <Section style={pxBody}>
        <Heading style={bodyTitle}>Share more, earn more.</Heading>
        <Text style={bodyText}>
          Every friend you invite who makes their first prediction earns you
          +{xpAwarded} XP. Head to your profile page to grab your personal
          invite link and keep growing your squad.
        </Text>
      </Section>

      {/* CTA */}
      <Section style={pxCTA}>
        <Button style={ctaButton} href="https://matchkoo.com/app">
          Invite More Friends →
        </Button>
      </Section>
    </BaseLayout>
  );
}

ReferralConvertedEmail.PreviewProps = {
  name: "Ihab",
  friendName: "Ahmed Hassan",
  xpAwarded: 200,
  newTotalXp: 5200,
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
  backgroundColor: "#001F26", color: "#08BDBD",
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

const friendLabel: React.CSSProperties = {
  fontSize: "11px", color: "#08BDBD", fontWeight: "700",
  textTransform: "uppercase", letterSpacing: ".8px", margin: "0 0 6px 0",
};

const friendName_: React.CSSProperties = {
  fontSize: "26px", fontWeight: "900", color: "#FFFFFF", marginBottom: "4px",
};

const friendDesc: React.CSSProperties = {
  fontSize: "14px", color: "#7AABB0", margin: "0 0 4px 0",
};

const divider: React.CSSProperties = {
  height: "1px", backgroundColor: "#0A2A30", margin: "18px 0",
};

const xpBig: React.CSSProperties = {
  fontSize: "52px", fontWeight: "900", color: "#08BDBD",
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
  backgroundColor: "#08BDBD", textDecoration: "none", borderRadius: "999px",
};
