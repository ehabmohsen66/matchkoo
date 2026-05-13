import { NextResponse } from "next/server";

// Daily cron — run fix-stale THEN sync today's fixtures
export async function GET() {
  const secret = process.env.CRON_SECRET || "cron";
  const base = process.env.NEXTAUTH_URL || "https://kickoff-taupe.vercel.app";

  const headers = {
    "Content-Type": "application/json",
    "x-cron-secret": secret,
  };

  // 1. First: close any stale LIVE/UPCOMING matches from past days
  const staleRes = await fetch(`${base}/api/admin/sync-fixtures`, {
    method: "POST",
    headers,
    body: JSON.stringify({ mode: "fix-stale" }),
  });
  const staleData = await staleRes.json();

  // 2. Then: sync today's fresh fixtures
  const todayRes = await fetch(`${base}/api/admin/sync-fixtures`, {
    method: "POST",
    headers,
    body: JSON.stringify({ mode: "today" }),
  });
  const todayData = await todayRes.json();

  return NextResponse.json({
    cron: "sync-today",
    staleFixed: staleData,
    todaySync: todayData,
  });
}
