import {
  Section,
  Text,
  Heading,
  Button,
} from "@react-email/components";
import * as React from "react";
import BaseLayout from "./BaseLayout";

interface VerifyEmailProps {
  name: string;
  verifyUrl: string;
}

export default function VerifyEmailEmail({ name, verifyUrl }: VerifyEmailProps) {
  return (
    <BaseLayout previewText={`Activate your Matchkoo account, ${name} — one click away ⚽`}>
      {/* Hero */}
      <Section style={hero}>
        <div style={badge}>✦ ACCOUNT ACTIVATION</div>
        <Heading style={heroTitle}>
          One step left,<br />
          <span style={{ color: "#7CE900" }}>{name}!</span>
        </Heading>
        <Text style={heroSubtitle}>
          You&apos;re almost in the arena. Click the button below to verify your email and unlock your Matchkoo account.
        </Text>
      </Section>

      {/* Body copy */}
      <Section style={pxBody}>
        <Heading style={bodyTitle}>Enter the Arena.</Heading>
        <Text style={bodyText}>
          Matchkoo is the intelligent football prediction platform where you can predict matches across 5 top leagues, earn XP, and climb global leaderboards.
        </Text>
      </Section>

      {/* CTA */}
      <Section style={pxCTA}>
        <Button style={ctaButton} href={verifyUrl}>
          Verify My Email &amp; Start Predicting
        </Button>
        
        <div style={{ marginTop: "24px", borderTop: "1px solid #18340F", paddingTop: "16px" }}>
          <Text style={fallbackLabel}>
            Button not working? Copy and paste this URL:
          </Text>
          <Text style={fallbackUrl}>{verifyUrl}</Text>
        </div>
      </Section>
    </BaseLayout>
  );
}

VerifyEmailEmail.PreviewProps = {
  name: "Ihab",
  verifyUrl: "https://matchkoo.com/api/auth/verify-email?token=abc123",
};

// ─── Styles ──────────────────────────────────────────────────────────────────
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

const fallbackLabel: React.CSSProperties = {
  fontSize: "12px",
  color: "#7D9076",
  margin: "0 0 4px 0",
};

const fallbackUrl: React.CSSProperties = {
  fontSize: "11px",
  color: "#4A5D44",
  wordBreak: "break-all",
  margin: 0,
};
