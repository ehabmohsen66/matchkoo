import {
  Section,
  Text,
  Heading,
  Row,
  Column,
  Hr,
} from "@react-email/components";
import * as React from "react";
import BaseLayout from "./BaseLayout";

interface AdminAlertEmailProps {
  type: "sync_failure" | "new_user" | "daily_digest";
  errorMessage?: string;
  errorRoute?: string;
  newUserName?: string;
  newUserEmail?: string;
  digestDate?: string;
  totalUsers?: number;
  newUsersToday?: number;
  predictionsToday?: number;
  activeUsers7d?: number;
}

export default function AdminAlertEmail({
  type,
  errorMessage,
  errorRoute,
  newUserName,
  newUserEmail,
  digestDate,
  totalUsers,
  newUsersToday,
  predictionsToday,
  activeUsers7d,
}: AdminAlertEmailProps) {
  const config = {
    sync_failure: {
      preview: `🚨 Matchkoo sync failed — ${errorRoute}`,
      badge: "🚨 SYNC FAILURE",
      badgeBg: "#FF4B4B",
      title: "Sync Job Failed",
    },
    new_user: {
      preview: `🆕 New signup: ${newUserName}`,
      badge: "🆕 NEW USER",
      badgeBg: "#08BDBD",
      title: "New Signup",
    },
    daily_digest: {
      preview: `📊 Matchkoo Daily Digest — ${digestDate}`,
      badge: "📊 DAILY DIGEST",
      badgeBg: "#7CE900",
      title: `Daily Report`,
    },
  }[type];

  return (
    <BaseLayout previewText={config.preview}>
      {/* Hero */}
      <Section style={hero}>
        <div style={{ ...badge, backgroundColor: config.badgeBg, color: "#fff" }}>
          {config.badge}
        </div>
        <Heading style={heroTitle}>
          {config.title}
        </Heading>
        {type === "daily_digest" && (
          <Text style={heroSubtitle}>
            Platform overview for {digestDate}.
          </Text>
        )}
      </Section>

      {/* Content */}
      <Section style={px}>
        {type === "sync_failure" && (
          <Section style={alertBox}>
            <Text style={label}>ROUTE</Text>
            <Text style={value}>{errorRoute ?? "Unknown"}</Text>
            <div style={divider} />
            <Text style={label}>ERROR</Text>
            <Text style={errorValue}>{errorMessage ?? "No details"}</Text>
          </Section>
        )}

        {type === "new_user" && (
          <Section style={alertBox}>
            <Text style={label}>NAME</Text>
            <Text style={value}>{newUserName}</Text>
            <div style={divider} />
            <Text style={label}>EMAIL</Text>
            <Text style={value}>{newUserEmail}</Text>
          </Section>
        )}

        {type === "daily_digest" && (
          <Row style={{ marginTop: "18px" }}>
            <Column style={statCol}>
              <div style={statCard}>
                <div style={statValue}>{totalUsers?.toLocaleString()}</div>
                <div style={statLabel}>Total Users</div>
              </div>
            </Column>
            <Column style={statColCenter}>
              <div style={statCard}>
                <div style={{ ...statValue, color: "#7CE900" }}>+{newUsersToday}</div>
                <div style={statLabel}>New Today</div>
              </div>
            </Column>
            <Column style={statCol}>
              <div style={statCard}>
                <div style={{ ...statValue, color: "#08BDBD" }}>{predictionsToday}</div>
                <div style={statLabel}>Predictions</div>
              </div>
            </Column>
          </Row>
        )}
      </Section>

      <Section style={pxBody}>
        <Hr style={{ borderColor: "#18340F", margin: "20px 0" }} />
        <Text style={smallText}>
          This is an automated admin notification. For full details, visit the Admin Panel.
        </Text>
      </Section>
    </BaseLayout>
  );
}

AdminAlertEmail.PreviewProps = {
  type: "sync_failure" as const,
  errorRoute: "/api/cron/sync-today",
  errorMessage: "Error: Cannot read properties of undefined (reading 'league')",
};

// ─── Styles ──────────────────────────────────────────────────────────────────
const px: React.CSSProperties = {
  padding: "22px 34px 8px 34px",
};

const pxBody: React.CSSProperties = {
  padding: "22px 34px 28px 34px",
  fontFamily: "Arial, Helvetica, sans-serif",
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
  fontSize: "12px",
  fontWeight: "700",
  letterSpacing: ".3px",
};

const heroTitle: React.CSSProperties = {
  margin: "18px 0 10px 0",
  fontSize: "36px",
  lineHeight: "40px",
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

const alertBox: React.CSSProperties = {
  backgroundColor: "#0F170D",
  border: "1px solid #244B16",
  borderRadius: "22px",
  padding: "24px",
  fontFamily: "Arial, Helvetica, sans-serif",
};

const label: React.CSSProperties = {
  fontSize: "10px",
  color: "#92A38B",
  fontWeight: "700",
  textTransform: "uppercase",
  letterSpacing: "0.5px",
  margin: "0 0 4px 0",
};

const value: React.CSSProperties = {
  fontSize: "15px",
  color: "#FFFFFF",
  fontWeight: "700",
  margin: 0,
};

const errorValue: React.CSSProperties = {
  fontSize: "13px",
  color: "#FF4B4B",
  fontFamily: "monospace",
  margin: 0,
};

const divider: React.CSSProperties = {
  height: "1px",
  backgroundColor: "#18340F",
  margin: "16px 0",
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
  fontSize: "20px",
  fontWeight: "900",
  color: "#FFFFFF",
};

const statLabel: React.CSSProperties = {
  fontSize: "10px",
  color: "#92A38B",
};

const smallText: React.CSSProperties = {
  fontSize: "12px",
  color: "#7D9076",
  margin: 0,
};
