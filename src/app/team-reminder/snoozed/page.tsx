interface PageProps {
  searchParams: Promise<{ club?: string; for?: string }>;
}

export const metadata = {
  title: "Reminders Updated — Matchkoo",
};

export default async function SnoozedPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const club = params.club ?? "that team";
  const forDuration = params.for ?? "the selected period";

  return (
    <div style={{
      minHeight: "100vh", background: "#0A0E1A",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      fontFamily: "'Inter', sans-serif", padding: "24px",
    }}>
      <div style={{
        background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 24, padding: "48px 40px", maxWidth: 440, width: "100%",
        textAlign: "center",
      }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>🔕</div>
        <h1 style={{ color: "#fff", fontSize: "1.8rem", fontWeight: 900, margin: "0 0 12px" }}>
          Got it!
        </h1>
        <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "1rem", lineHeight: 1.6, margin: "0 0 24px" }}>
          You won&apos;t receive match day reminders for{" "}
          <strong style={{ color: "#fff" }}>{club}</strong> for{" "}
          <strong style={{ color: "#7CE900" }}>{forDuration}</strong>.
        </p>
        <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.85rem", margin: "0 0 28px" }}>
          You can always update your notification preferences from your profile settings.
        </p>
        <a
          href="/app"
          style={{
            display: "inline-block", padding: "13px 28px",
            background: "linear-gradient(135deg,#3CB82E,#6FE840)",
            color: "#000", fontWeight: 800, fontSize: "0.95rem",
            borderRadius: 100, textDecoration: "none",
          }}
        >
          Back to Matchkoo →
        </a>
      </div>
    </div>
  );
}
