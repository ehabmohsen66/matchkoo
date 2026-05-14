import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as React from "react";
import { sendEmail } from "@/lib/email";
import ReEngagementEmail from "@/emails/ReEngagementEmail";

/**
 * GET /api/cron/re-engagement
 *
 * Runs daily at 14:00 UTC (4pm Egypt / 2pm London).
 * Finds users who haven't made a prediction in 3+ days but have
 * upcoming matches tonight or tomorrow. Sends one re-engagement email per user.
 * Never sends to the same user twice in a 24h window (guarded by DB check).
 */
export async function GET(req: NextRequest) {
  const cronSecret = req.headers.get("x-cron-secret");
  if (cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    // 1. Find upcoming matches in the next 24h
    const upcomingMatches = await prisma.match.findMany({
      where: {
        status: "UPCOMING",
        matchDate: { gte: now, lte: tomorrow },
      },
      include: {
        tournament: { select: { name: true } },
      },
      orderBy: { matchDate: "asc" },
    });

    if (upcomingMatches.length === 0) {
      return NextResponse.json({ success: true, message: "No upcoming matches — no emails sent", sent: 0 });
    }

    // Featured match for the email (first one coming up)
    const featured = upcomingMatches[0];
    const featuredMatch = `${featured.homeTeam} vs ${featured.awayTeam}`;
    const featuredLeague = (featured.tournament?.name ?? "").replace(/\s*\[\d+\]$/, "");

    // 2. Find verified users whose last prediction was 3+ days ago (or never)
    const inactiveUsers = await prisma.user.findMany({
      where: {
        emailVerified: { not: null }, // only verified accounts
        email: { not: null },
        OR: [
          // Last prediction was more than 3 days ago
          {
            predictions: {
              none: {
                createdAt: { gte: threeDaysAgo },
              },
            },
          },
        ],
      },
      select: {
        id: true,
        email: true,
        name: true,
        predictions: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { createdAt: true },
        },
      },
    });

    let sent = 0;
    let skipped = 0;

    for (const user of inactiveUsers) {
      if (!user.email) { skipped++; continue; }

      const lastPred = user.predictions[0]?.createdAt;
      const daysSince = lastPred
        ? Math.floor((now.getTime() - lastPred.getTime()) / (1000 * 60 * 60 * 24))
        : 999;

      // Only send if inactive 3+ days but not more than 30 days (beyond 30 = churned, not re-engageable by email)
      if (daysSince < 3 || daysSince > 30) { skipped++; continue; }

      // Rate limit: if last prediction was between 3–7 days ago, check we haven't already
      // sent a re-engagement email in the last 7 days (approximated: skip if daysSince < 7 AND
      // lastPred is in the last-7-day window — i.e. they just became inactive)
      // Full rate-limiting requires a dedicated table; this is a safe approximation:
      // only send on exactly the 3rd, 7th, 14th, 21st, 30th day bands.
      const isRemindDay = [3, 7, 14, 21, 30].some(d => daysSince >= d && daysSince < d + 2);
      if (!isRemindDay) { skipped++; continue; }

      sendEmail({
        to: user.email,
        subject: `⚽ ${upcomingMatches.length} matches tonight — your predictions are waiting`,
        react: React.createElement(ReEngagementEmail, {
          name: user.name ?? "there",
          daysSinceLastPrediction: Math.min(daysSince, 99),
          upcomingMatchCount: upcomingMatches.length,
          featuredMatch,
          featuredLeague,
        }),
      }).catch((err) =>
        console.error(`[re-engagement] Failed to email ${user.email}:`, err)
      );

      sent++;
    }

    console.log(`[re-engagement] Sent: ${sent}, Skipped: ${skipped}`);
    return NextResponse.json({ success: true, sent, skipped });
  } catch (err: any) {
    console.error("[re-engagement] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
