import { NextResponse } from "next/server";

// Triggered by Vercel cron OR manually to sync today's whitelisted fixtures
export async function GET() {
  const secret = process.env.CRON_SECRET || "cron";
  const base = process.env.NEXTAUTH_URL || "https://kickoff-taupe.vercel.app";

  const res = await fetch(`${base}/api/admin/sync-fixtures`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-cron-secret": secret,
    },
    body: JSON.stringify({ mode: "today" }),
  });

  const data = await res.json();
  return NextResponse.json({ cron: "sync-today", ...data });
}
