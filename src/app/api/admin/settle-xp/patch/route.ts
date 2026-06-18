/**
 * PATCH /api/admin/settle-xp
 *
 * FORCE re-settle ALL predictions for a specific match, even if already settled.
 * Use this when a match score was corrected AFTER the initial XP settlement ran.
 *
 * Body: { matchId: string }
 *
 * This REVERTS the old xpEarned from each user's total, then applies the correct XP.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { scorerMatch } from "@/lib/scorer-match";


export async function POST(req: NextRequest) {
  const cronSecret = req.headers.get("x-cron-secret");
  const isValidCron = cronSecret && cronSecret === process.env.CRON_SECRET;

  if (!isValidCron) {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const body = await req.json().catch(() => ({}));
  const { matchId } = body;

  if (!matchId) {
    return NextResponse.json({ error: "matchId is required" }, { status: 400 });
  }

  // Fetch the match with its current (correct) score
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    select: {
      id: true, homeTeam: true, awayTeam: true,
      homeScore: true, awayScore: true, firstGoalScorer: true,
      status: true,
    },
  });

  if (!match || match.status !== "COMPLETED" || match.homeScore == null || match.awayScore == null) {
    return NextResponse.json({ error: "Match not found or not completed with a score" }, { status: 404 });
  }

  const homeScore = match.homeScore;
  const awayScore = match.awayScore;

  // Fetch ALL predictions for this match (settled or not)
  const allPreds = await prisma.prediction.findMany({
    where: { matchId },
    include: {
      user: {
        select: { id: true, xp: true, streak: true, bestStreak: true, predictionCount: true, correctCount: true },
      },
    },
  });

  if (allPreds.length === 0) {
    return NextResponse.json({ success: true, message: "No predictions found for this match", resettled: 0 });
  }

  let totalResettled = 0;

  for (const pred of allPreds) {
    const oldXp = pred.xpEarned ?? 0;

    // ── Recalculate correct XP ─────────────────────────────────────
    const correctResult =
      (pred.homeScore > pred.awayScore && homeScore > awayScore) ||
      (pred.homeScore < pred.awayScore && homeScore < awayScore) ||
      (pred.homeScore === pred.awayScore && homeScore === awayScore);
    const trueExactScore = pred.homeScore === homeScore && pred.awayScore === awayScore;
    const exactScore = trueExactScore || (pred.isShield && correctResult);
    const correctScorer =
      !!pred.firstGoalScorer &&
      !!match.firstGoalScorer &&
      scorerMatch(pred.firstGoalScorer, match.firstGoalScorer);

    // ── Confidence multiplier: 50%=1.0×, 100%=2.0× ─────────────────────
    //    Multiplier applies ONLY to the 50 XP outcome — NOT to bonuses.
    const multiplier = 1 + ((pred.confidence - 50) / 50);
    let xp = correctResult ? Math.round(50 * multiplier) : 0;

    // ── Flat bonuses (no confidence multiplier) ──────────────────────────
    if (exactScore)    xp += 200;  // exact scoreline: 200 XP flat
    if (correctScorer) xp += 150;  // first goalscorer: 150 XP flat

    if (!correctResult)  xp -= Math.round(50  * (pred.confidence / 100));
    if (pred.firstGoalScorer && !correctScorer) xp -= 100;

    const actualBtts = homeScore > 0 && awayScore > 0;
    if (pred.btts !== null && pred.btts !== undefined && pred.btts === actualBtts) xp += 75;

    const actualTotal  = homeScore + awayScore;
    const actualBucket = actualTotal >= 5 ? 5 : actualTotal;
    const predBucket   = (pred.totalGoals ?? -1) >= 5 ? 5 : (pred.totalGoals ?? -1);
    if (pred.totalGoals !== null && pred.totalGoals !== undefined && predBucket === actualBucket) xp += 75;

    if (pred.isDouble && xp > 0) xp *= 2;

    const xpDelta = xp - oldXp;

    // ── Update prediction ─────────────────────────────────────────
    await prisma.prediction.update({
      where: { id: pred.id },
      data: { xpEarned: xp, status: correctResult ? "correct" : "wrong" },
    });

    // ── Apply XP delta to user (revert old, add new) ──────────────
    if (xpDelta !== 0) {
      await prisma.user.update({
        where: { id: pred.userId },
        data: { xp: { increment: xpDelta } },
      });
    }

    totalResettled++;
    console.log(`[settle-xp PATCH] Pred ${pred.id}: oldXP=${oldXp} → newXP=${xp} (delta=${xpDelta})`);
  }

  return NextResponse.json({
    success: true,
    match: `${match.homeTeam} ${homeScore}–${awayScore} ${match.awayTeam}`,
    resettled: totalResettled,
    message: `Force re-settled ${totalResettled} predictions. Users' XP updated with correct scores.`,
  });
}
