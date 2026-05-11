import { NextResponse } from "next/server";

// Daily sync — called by Vercel Cron at 06:00 UTC
export async function GET() {
  const secret = process.env.CRON_SECRET || "cron";
  const base = process.env.NEXTAUTH_URL || "https://kickoff-taupe.vercel.app";

  const res = await fetch(`${base}/api/admin/sync-fixtures`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-cron-secret": secret,
    },
    body: JSON.stringify({ mode: "week" }),
  });

  const data = await res.json();
  return NextResponse.json({ cron: "daily-sync", ...data });
}
