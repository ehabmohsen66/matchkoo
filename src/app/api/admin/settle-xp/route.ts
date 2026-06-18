import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import * as React from "react";
import { sendEmail } from "@/lib/email";
import MatchResultEmail from "@/emails/MatchResultEmail";
import { calculateXp } from "@/lib/calculate-xp";

/**
 * POST /api/admin/settle-xp
 *
 * Manually re-settle XP for COMPLETED matches where predictions still have
 * status=null (i.e. the XP engine never fired — typically caused by a season
 * mismatch preventing the cron from picking up the match).
 *
 * Body: { matchId?: string }  — if omitted, settles ALL unsettled completed matches.
 *
 * Safe to call multiple times — the engine only touches predictions where status IS NULL.
 */
export async function POST(req: NextRequest) {
  // Allow admin session OR internal cron secret
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

  // Find completed matches with unsettled predictions
  const completedMatches = await prisma.match.findMany({
    where: {
      status: "COMPLETED",
      homeScore: { not: null },
      awayScore: { not: null },
      ...(matchId ? { id: matchId } : {}),
      predictions: {
        some: { status: null }, // has at least one unsettled prediction
      },
    },
    select: {
      id: true,
      homeTeam: true,
      awayTeam: true,
      homeScore: true,
      awayScore: true,
      firstGoalScorer: true,
      tournament: { select: { name: true } },
    },
  });

  if (completedMatches.length === 0) {
    return NextResponse.json({ success: true, message: "No unsettled predictions found", settled: 0 });
  }

  let totalSettled = 0;
  const results: Array<{ match: string; settled: number }> = [];

  for (const match of completedMatches) {
    const homeScore = match.homeScore!;
    const awayScore = match.awayScore!;

    const unsettledPreds = await prisma.prediction.findMany({
      where: { matchId: match.id, status: null },
      include: {
        user: {
          select: { id: true, email: true, name: true, xp: true, streak: true, bestStreak: true, predictionCount: true, correctCount: true },
        },
      },
    });

    for (const pred of unsettledPreds) {
      // ── 1. Calculate XP using shared canonical formula ───────────────
      const scoring = calculateXp(
        {
          homeScore:       pred.homeScore,
          awayScore:       pred.awayScore,
          confidence:      pred.confidence,
          isShield:        pred.isShield,
          isDouble:        pred.isDouble,
          firstGoalScorer: pred.firstGoalScorer ?? null,
          btts:            pred.btts ?? null,
          totalGoals:      pred.totalGoals ?? null,
        },
        { homeScore, awayScore, firstGoalScorer: match.firstGoalScorer },
      );
      const { correctResult, exactScore } = scoring;
      let xp = scoring.xp;

      // ── 2. Streak ────────────────────────────────────────────────────
      const newStreak    = correctResult ? pred.user.streak + 1 : 0;
      const newBest      = Math.max(pred.user.bestStreak, newStreak);
      const newPredCount = pred.user.predictionCount + 1;
      const newCorrect   = pred.user.correctCount + (correctResult ? 1 : 0);

      let streakBonus = 0;
      if (correctResult) {
        if (newStreak === 10) streakBonus = 500;
        else if (newStreak === 5) streakBonus = 150;
        else if (newStreak === 3) streakBonus = 50;
      }
      xp += streakBonus;

      // ── 9. Persist ───────────────────────────────────────────────────
      await prisma.prediction.update({
        where: { id: pred.id },
        data:  { xpEarned: xp, status: correctResult ? "correct" : "wrong" },
      });

      const updatedUser = await prisma.user.update({
        where: { id: pred.userId },
        data: {
          xp:              { increment: xp },
          streak:          newStreak,
          bestStreak:      newBest,
          predictionCount: newPredCount,
          correctCount:    newCorrect,
        },
        select: { email: true, name: true, xp: true },
      });

      // ── 10. Email ────────────────────────────────────────────────────
      if (updatedUser.email && !pred.emailSent) {
        sendEmail({
          to: updatedUser.email,
          subject: exactScore
            ? `🎯 Perfect call! ${match.homeTeam} ${homeScore}–${awayScore} ${match.awayTeam}`
            : correctResult
            ? `✅ Result correct! ${match.homeTeam} vs ${match.awayTeam}`
            : `⚽ Match result: ${match.homeTeam} ${homeScore}–${awayScore} ${match.awayTeam}`,
          react: React.createElement(MatchResultEmail, {
            name:           updatedUser.name ?? "there",
            homeTeam:       match.homeTeam,
            awayTeam:       match.awayTeam,
            actualScore:    `${homeScore} – ${awayScore}`,
            predictedScore: `${pred.homeScore} – ${pred.awayScore}`,
            resultCorrect:  correctResult,
            scoreCorrect:   exactScore,
            xpEarned:       xp,
            newTotalXp:     updatedUser.xp,
            firstGoalScorer: pred.firstGoalScorer ?? undefined,
            scorerCorrect:   scoring.correctScorer || undefined,
          }),
        })
          .then(async () => {
            await prisma.prediction.update({ where: { id: pred.id }, data: { emailSent: true } });
          })
          .catch((err) => console.error(`[settle-xp] Email failed for ${updatedUser.email}:`, err));
      }

      totalSettled++;
    }

    results.push({ match: `${match.homeTeam} vs ${match.awayTeam}`, settled: unsettledPreds.length });
    console.log(`[settle-xp] Settled ${unsettledPreds.length} predictions for ${match.homeTeam} vs ${match.awayTeam}`);
  }

  return NextResponse.json({ success: true, settled: totalSettled, matches: results });
}

/**
 * GET /api/admin/settle-xp
 * Diagnostic: shows completed matches that still have unsettled predictions.
 */
export async function GET(req: NextRequest) {
  const cronSecret = req.headers.get("x-cron-secret");
  const isValidCron = cronSecret && cronSecret === process.env.CRON_SECRET;

  if (!isValidCron) {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const unsettled = await prisma.match.findMany({
    where: {
      status: "COMPLETED",
      homeScore: { not: null },
      awayScore: { not: null },
      predictions: { some: { status: null } },
    },
    select: {
      id: true,
      homeTeam: true,
      awayTeam: true,
      homeScore: true,
      awayScore: true,
      matchDate: true,
      status: true,
      tournament: { select: { name: true } },
      _count: { select: { predictions: true } },
    },
    orderBy: { matchDate: "asc" },
  });

  // Count unsettled predictions per match
  const withUnsettled = await Promise.all(
    unsettled.map(async (m) => {
      const unsettledCount = await prisma.prediction.count({
        where: { matchId: m.id, status: null },
      });
      return { ...m, unsettledPredictions: unsettledCount };
    })
  );

  return NextResponse.json({ unsettledMatches: withUnsettled, total: withUnsettled.length });
}
