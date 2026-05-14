import { NextResponse } from "next/server";
import * as React from "react";
import { sendAdminAlert } from "@/lib/email";
import AdminAlertEmail from "@/emails/AdminAlertEmail";
import { prisma } from "@/lib/prisma";

// Daily cron — run fix-stale THEN sync today's fixtures
export async function GET() {
  const secret = process.env.CRON_SECRET || "cron";
  const base = process.env.NEXTAUTH_URL || "https://matchkoo.com";

  const headers = {
    "Content-Type": "application/json",
    "x-cron-secret": secret,
  };

  const errors: string[] = [];

  // 1. First: close any stale LIVE/UPCOMING matches from past days
  let staleData: unknown;
  try {
    const staleRes = await fetch(`${base}/api/admin/sync-fixtures`, {
      method: "POST",
      headers,
      body: JSON.stringify({ mode: "fix-stale" }),
    });
    staleData = await staleRes.json();
    if (!staleRes.ok) errors.push(`fix-stale: HTTP ${staleRes.status}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    errors.push(`fix-stale: ${msg}`);
    staleData = { error: msg };
  }

  // 2. Then: sync next 30 days of fixtures (so users can predict a month ahead)
  let todayData: unknown;
  try {
    const todayRes = await fetch(`${base}/api/admin/sync-fixtures`, {
      method: "POST",
      headers,
      body: JSON.stringify({ mode: "month" }),
    });
    todayData = await todayRes.json();
    if (!todayRes.ok) errors.push(`sync-month: HTTP ${todayRes.status}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    errors.push(`sync-month: ${msg}`);
    todayData = { error: msg };
  }

  // 3. Send failure alert if anything went wrong
  if (errors.length > 0) {
    void sendAdminAlert(
      "🚨 Matchkoo: Cron sync failed",
      React.createElement(AdminAlertEmail, {
        type: "sync_failure",
        errorRoute: "/api/cron/sync-today",
        errorMessage: errors.join(" | "),
      })
    );
  }

  // 4. Daily digest email (fire-and-forget)
  try {
    const totalUsers = await prisma.user.count();
    const since24h = new Date(Date.now() - 86400000);
    const newUsersToday = await prisma.user.count({ where: { createdAt: { gte: since24h } } });
    const predictionsToday = await prisma.prediction.count({ where: { createdAt: { gte: since24h } } });
    const since7d = new Date(Date.now() - 7 * 86400000);
    const activeUsers7d = await prisma.user.count({ where: { predictions: { some: { createdAt: { gte: since7d } } } } });

    void sendAdminAlert(
      `📊 Matchkoo Daily — ${new Date().toLocaleDateString("en-GB")}`,
      React.createElement(AdminAlertEmail, {
        type: "daily_digest",
        digestDate: new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" }),
        totalUsers,
        newUsersToday,
        predictionsToday,
        activeUsers7d,
      })
    );
  } catch {
    // digest is best-effort, never block cron
  }

  return NextResponse.json({
    cron: "sync-today",
    staleFixed: staleData,
    todaySync: todayData,
    errors: errors.length > 0 ? errors : undefined,
  });
}
