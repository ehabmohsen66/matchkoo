import {
  Section,
  Text,
  Heading,
  Button,
} from "@react-email/components";
import * as React from "react";
import BaseLayout from "./BaseLayout";

interface ForgotPasswordEmailProps {
  name: string;
  resetUrl: string;
}

export default function ForgotPasswordEmail({ name, resetUrl }: ForgotPasswordEmailProps) {
  return (
    <BaseLayout previewText={`Reset your Matchkoo password, ${name}`}>
      {/* Hero */}
      <Section style={hero}>
        <div style={badge}>🔑 PASSWORD RESET</div>
        <Heading style={heroTitle}>
          Reset your password,<br />
          <span style={{ color: "#7CE900" }}>{name}.</span>
        </Heading>
        <Text style={heroSubtitle}>
          We received a request to reset your Matchkoo password. This link expires in 1 hour.
        </Text>
      </Section>

      {/* Body copy */}
      <Section style={pxBody}>
        <Heading style={bodyTitle}>Secure your account.</Heading>
        <Text style={bodyText}>
          If you didn&apos;t request a password reset, you can safely ignore this email. Your password will remain unchanged.
        </Text>
      </Section>

      {/* CTA */}
      <Section style={pxCTA}>
        <Button style={ctaButton} href={resetUrl}>
          Reset My Password
        </Button>
        
        <div style={{ marginTop: "24px", borderTop: "1px solid #18340F", paddingTop: "16px" }}>
          <Text style={fallbackLabel}>
            Button not working? Copy and paste this URL:
          </Text>
          <Text style={fallbackUrl}>{resetUrl}</Text>
        </div>
      </Section>
    </BaseLayout>
  );
}

ForgotPasswordEmail.PreviewProps = {
  name: "Ihab",
  resetUrl: "https://matchkoo.com/reset-password?token=abc123",
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
