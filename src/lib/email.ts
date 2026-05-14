import { Resend } from "resend";
import type { ReactElement } from "react";

// Lazy client — instantiated on first use, not at module load time.
// This prevents build-time errors when RESEND_API_KEY is not set.
let _client: Resend | null = null;

function getClient(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null;
  if (!_client) _client = new Resend(process.env.RESEND_API_KEY);
  return _client;
}

const FROM = process.env.RESEND_FROM ?? "Matchkoo <onboarding@resend.dev>";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "";

export async function sendEmail({
  to,
  subject,
  react,
}: {
  to: string | string[];
  subject: string;
  react: ReactElement;
}) {
  const client = getClient();
  if (!client) {
    console.warn("[email] RESEND_API_KEY not set — skipping email send:", subject);
    return { success: false, error: "No API key" };
  }

  try {
    const { data, error } = await client.emails.send({
      from: FROM,
      to: Array.isArray(to) ? to : [to],
      subject,
      react,
    });

    if (error) {
      console.error("[email] Resend error:", error);
      return { success: false, error };
    }

    console.log("[email] Sent:", subject, "→", to, "id:", data?.id);
    return { success: true, id: data?.id };
  } catch (err) {
    console.error("[email] Unexpected error:", err);
    return { success: false, error: err };
  }
}

export async function sendAdminAlert(subject: string, react: ReactElement) {
  if (!ADMIN_EMAIL) return;
  return sendEmail({ to: ADMIN_EMAIL, subject, react });
}
