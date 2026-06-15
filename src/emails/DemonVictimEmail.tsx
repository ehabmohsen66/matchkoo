import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";

interface DemonVictimEmailProps {
  name: string;
  miniLeagueName: string;
}

export default function DemonVictimEmail({
  name,
  miniLeagueName,
}: DemonVictimEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>You've been hit by The Demon 😈</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Watch out! 😈</Heading>
          
          <Text style={text}>Hi {name},</Text>
          
          <Text style={text}>
            You have just been targeted by <strong>The Demon</strong> chip in the <strong>{miniLeagueName}</strong> mini league!
          </Text>

          <Section style={alertBox}>
            <Text style={alertText}>
              A rival in your league has cast The Demon on you, which means <strong>500 XP</strong> has been deducted from your total score in this mini league.
            </Text>
          </Section>

          <Text style={text}>
            Don't worry, you can always earn it back with some spot-on predictions. Get back in the game and show them who's boss!
          </Text>

          <Text style={footer}>
            Best of luck,
            <br />
            The Matchkoo Team
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

const main = {
  backgroundColor: "#f6f9fc",
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "40px 20px",
  borderRadius: "8px",
  maxWidth: "600px",
};

const h1 = {
  color: "#e01a4f",
  fontSize: "24px",
  fontWeight: "bold",
  margin: "0 0 20px",
  padding: "0",
};

const text = {
  color: "#333",
  fontSize: "16px",
  lineHeight: "24px",
  margin: "0 0 20px",
};

const alertBox = {
  backgroundColor: "rgba(224, 26, 79, 0.1)",
  border: "1px solid #e01a4f",
  borderRadius: "8px",
  padding: "16px",
  margin: "24px 0",
};

const alertText = {
  color: "#e01a4f",
  fontSize: "16px",
  lineHeight: "24px",
  margin: "0",
  fontWeight: "bold",
};

const footer = {
  color: "#8898aa",
  fontSize: "14px",
  lineHeight: "24px",
  marginTop: "32px",
};
