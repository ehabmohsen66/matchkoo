import {
  Body,
  Container,
  Head,
  Html,
  Img,
  Preview,
  Section,
  Text,
  Row,
  Column,
  Link,
} from "@react-email/components";
import * as React from "react";

interface BaseLayoutProps {
  previewText: string;
  children: React.ReactNode;
}

const BASE = "https://matchkoo.com";

export default function BaseLayout({ previewText, children }: BaseLayoutProps) {
  return (
    <Html lang="en">
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={body}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Img
              src="https://matchkoo.com/_next/image?q=75&url=%2Fmatchkoo-logo-cropped.png&w=640"
              width="180"
              alt="Matchkoo"
              style={logo}
            />
          </Section>

          {children}

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerText}>
              Matchkoo — The intelligent football prediction platform.
            </Text>
            <Text style={footerSubText}>
              You are receiving this email because you signed up for Matchkoo updates.
              <br />
              <Link href="{{unsubscribe_url}}" style={footerLink}>Unsubscribe</Link> ·{" "}
              <Link href="{{preferences_url}}" style={footerLink}>Manage preferences</Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const body: React.CSSProperties = {
  margin: 0,
  padding: 0,
  backgroundColor: "#050705",
  WebkitTextSizeAdjust: "100%",
};

const container: React.CSSProperties = {
  width: "600px",
  maxWidth: "600px",
  margin: "34px auto",
  backgroundColor: "#0A0F08",
  borderRadius: "28px",
  overflow: "hidden",
  border: "1px solid #18340F",
};

const header: React.CSSProperties = {
  padding: "26px 34px 18px 34px",
  backgroundColor: "#070B06",
};

const logo: React.CSSProperties = {
  display: "block",
  maxWidth: "210px",
  height: "auto",
  border: "0",
};

const headerRight: React.CSSProperties = {
  fontFamily: "Arial, Helvetica, sans-serif",
  fontSize: "12px",
  color: "#93A48C",
  margin: 0,
};

const footer: React.CSSProperties = {
  padding: "24px 34px 28px 34px",
  backgroundColor: "#060A05",
  borderTop: "1px solid #18340F",
};

const footerText: React.CSSProperties = {
  fontFamily: "Arial, Helvetica, sans-serif",
  margin: "0 0 8px 0",
  fontSize: "13px",
  lineHeight: "20px",
  color: "#AFC0A8",
};

const footerSubText: React.CSSProperties = {
  fontFamily: "Arial, Helvetica, sans-serif",
  margin: 0,
  fontSize: "11px",
  lineHeight: "18px",
  color: "#66755F",
};

const footerLink: React.CSSProperties = {
  color: "#7CE900",
  textDecoration: "underline",
};
