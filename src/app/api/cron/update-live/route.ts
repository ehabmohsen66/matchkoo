import { NextResponse } from "next/server";

// Live update cron — every 5 minutes
export async function GET() {
  const secret = process.env.CRON_SECRET || "cron";
  const base = process.env.NEXTAUTH_URL || "https://kickoff-taupe.vercel.app";

  const res = await fetch(`${base}/api/admin/sync-fixtures`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-cron-secret": secret,
    },
    body: JSON.stringify({ mode: "update-live" }),
  });

  const data = await res.json();
  return NextResponse.json({ cron: "live-update", ...data });
}
