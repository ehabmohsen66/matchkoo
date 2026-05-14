import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as React from "react";
import { createHmac } from "crypto";
import { sendEmail } from "@/lib/email";
import TeamMatchReminderEmail from "@/emails/TeamMatchReminderEmail";

const SECRET = process.env.CRON_SECRET;
if (!SECRET) throw new Error("CRON_SECRET env var is not set");

const SNOOZE_BASE_URL =
  process.env.NEXT_PUBLIC_BASE_URL
    ? `${process.env.NEXT_PUBLIC_BASE_URL}/api/team-reminder/snooze`
    : "https://matchkoo.com/api/team-reminder/snooze";

/** Build a signed snooze token: userId:clubName:hmac */
function buildSnoozeToken(userId: string, clubName: string): string {
  const sig = createHmac("sha256", SECRET!)
    .update(`${userId}:${clubName}`)
    .digest("hex")
    .slice(0, 16);
  return `${userId}:${clubName}:${sig}`;
}

/**
 * GET /api/cron/team-reminders
 *
 * Runs daily at 10:00 UTC (noon Egypt / 10am London).
 * For every user who has voted for a club before:
 *   1. Find matches TODAY that include that club.
 *   2. Check the user hasn't already voted for that club today.
 *   3. Check there's no active snooze for that club.
 *   4. Send one email per club per user (deduped).
 */
export async function GET(req: NextRequest) {
  const cronSecret = req.headers.get("x-cron-secret");
  if (cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const today = new Date().toISOString().split("T")[0];
    const now = new Date();
    const todayStart = new Date(today);
    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);

    // 1. Find distinct (userId, clubName) pairs with a vote history
    const voteHistory = await prisma.clubVote.findMany({
      where: {
        votedDate: { lt: today }, // voted on this club on a previous day
      },
      select: { userId: true, clubName: true, country: true },
      distinct: ["userId", "clubName"],
    });

    if (voteHistory.length === 0) {
      return NextResponse.json({ success: true, sent: 0, message: "No vote history" });
    }

    // 2. Find matches today
    const todayMatches = await prisma.match.findMany({
      where: {
        status: "UPCOMING",
        matchDate: { gte: todayStart, lte: todayEnd },
      },
      include: { tournament: { select: { name: true } } },
    });

    if (todayMatches.length === 0) {
      return NextResponse.json({ success: true, sent: 0, message: "No matches today" });
    }

    // 3. Get all active snoozes
    const activeSnoozes = await prisma.teamReminderSnooze.findMany({
      where: {
        OR: [
          { snoozedUntil: null }, // forever
          { snoozedUntil: { gte: now } }, // still active
        ],
      },
      select: { userId: true, clubName: true },
    });
    const snoozeSet = new Set(activeSnoozes.map(s => `${s.userId}:${s.clubName}`));

    // 4. Get users who already voted today (so we don't nag them)
    const todayVotes = await prisma.clubVote.findMany({
      where: { votedDate: today },
      select: { userId: true, clubName: true },
    });
    const votedTodaySet = new Set(todayVotes.map(v => `${v.userId}:${v.clubName}`));

    // 5. Fetch user details for all affected users
    const userIds = [...new Set(voteHistory.map(v => v.userId))];
    const users = await prisma.user.findMany({
      where: {
        id: { in: userIds },
        email: { not: null },
        emailVerified: { not: null },
      },
      select: { id: true, email: true, name: true },
    });
    const userMap = new Map(users.map(u => [u.id, u]));

    let sent = 0;
    let skipped = 0;
    // Track already-sent per (userId, clubName) to avoid duplicate emails
    const sentSet = new Set<string>();

    for (const vote of voteHistory) {
      const key = `${vote.userId}:${vote.clubName}`;

      // Skip if already emailed this combo today
      if (sentSet.has(key)) { skipped++; continue; }
      // Skip if snoozed
      if (snoozeSet.has(key)) { skipped++; continue; }
      // Skip if already voted today for this club
      if (votedTodaySet.has(key)) { skipped++; continue; }

      const user = userMap.get(vote.userId);
      if (!user?.email) { skipped++; continue; }

      // Find a match today with this club
      const match = todayMatches.find(
        m =>
          m.homeTeam.toLowerCase().includes(vote.clubName.toLowerCase()) ||
          m.awayTeam.toLowerCase().includes(vote.clubName.toLowerCase()) ||
          vote.clubName.toLowerCase().includes(m.homeTeam.toLowerCase()) ||
          vote.clubName.toLowerCase().includes(m.awayTeam.toLowerCase())
      );

      if (!match) { skipped++; continue; }

      const isHome =
        match.homeTeam.toLowerCase().includes(vote.clubName.toLowerCase()) ||
        vote.clubName.toLowerCase().includes(match.homeTeam.toLowerCase());

      const matchTime = new Date(match.matchDate).toLocaleTimeString("en-GB", {
        hour: "2-digit", minute: "2-digit", timeZone: "UTC",
      });

      const leagueName = (match.tournament?.name ?? "").replace(/\s*\[\d+\]$/, "").replace(/\s*\d{4}$/, "").trim();
      const token = buildSnoozeToken(user.id, vote.clubName);

      sendEmail({
        to: user.email,
        subject: `⚽ ${vote.clubName} plays today at ${matchTime} — vote now!`,
        react: React.createElement(TeamMatchReminderEmail, {
          name: user.name ?? "there",
          clubName: vote.clubName,
          homeTeam: match.homeTeam,
          awayTeam: match.awayTeam,
          matchTime,
          leagueName,
          isHome,
          snoozeBaseUrl: SNOOZE_BASE_URL,
          token,
        }),
      }).catch(err => console.error(`[team-reminder] Failed to email ${user.email}:`, err));

      sentSet.add(key);
      sent++;
    }

    console.log(`[team-reminders] Sent: ${sent}, Skipped: ${skipped}`);
    return NextResponse.json({ success: true, sent, skipped });
  } catch (err: any) {
    console.error("[team-reminders] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
