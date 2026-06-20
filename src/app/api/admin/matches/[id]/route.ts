import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import * as React from "react";
import { sendEmail } from "@/lib/email";
import MatchResultEmail from "@/emails/MatchResultEmail";
import { scorerMatch } from "@/lib/scorer-match";

// PATCH /api/admin/matches/[id] — set result and trigger XP calculation
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== "ADMIN")
    return NextResponse.json({ message: "Unauthorized" }, { status: 403 });

  const { id } = await params;
  const { homeScore, awayScore, firstGoalScorer, status } = await req.json();

  // Auto-fetch firstGoalScorer from API if not provided manually
  let resolvedScorer = firstGoalScorer ?? null;
  if (status === "COMPLETED" && !resolvedScorer) {
    try {
      const matchForScorer = await prisma.match.findUnique({
        where: { id },
        select: { externalId: true, firstGoalScorer: true },
      });
      // Use existing if already set
      if (matchForScorer?.firstGoalScorer) {
        resolvedScorer = matchForScorer.firstGoalScorer;
      } else if (matchForScorer?.externalId?.startsWith("apif-")) {
        const fixtureId = matchForScorer.externalId.replace("apif-", "");
        const eventsRes = await fetch(
          `https://v3.football.api-sports.io/fixtures/events?fixture=${fixtureId}`,
          { headers: { "x-apisports-key": process.env.FOOTBALL_API_KEY! } }
        );
        const eventsData = await eventsRes.json();
        const firstGoalEvent = (eventsData.response ?? []).find(
          (e: any) => e.type === "Goal" && e.detail !== "Own Goal"
        );
        if (firstGoalEvent?.player?.name) {
          resolvedScorer = firstGoalEvent.player.name;
          console.log(`[admin] Auto-set firstGoalScorer for ${id}: ${resolvedScorer}`);
        }
      }
    } catch (e) {
      console.error("[admin] Failed to auto-fetch firstGoalScorer:", e);
    }
  }

  const match = await prisma.match.update({
    where: { id },
    data: {
      ...(homeScore !== undefined && { homeScore }),
      ...(awayScore !== undefined && { awayScore }),
      ...(resolvedScorer !== undefined && { firstGoalScorer: resolvedScorer }),
      ...(status && { status }),
    },
  });

  // If match completed, calculate XP for all predictions
  if (status === "COMPLETED" && homeScore !== undefined && awayScore !== undefined) {
    const predictions = await prisma.prediction.findMany({
      where: {
        matchId: id,
        status: null, // only unsettled — prevents double XP if re-submitted or cron already ran
      },
      include: { user: { select: { id: true, email: true, name: true, streak: true, bestStreak: true } } },
    });

    for (const pred of predictions) {
      let xp = 0;
      const correctResult =
        (pred.homeScore > pred.awayScore && homeScore > awayScore) ||
        (pred.homeScore < pred.awayScore && homeScore < awayScore) ||
        (pred.homeScore === pred.awayScore && homeScore === awayScore);
      const trueExactScore = pred.homeScore === homeScore && pred.awayScore === awayScore;
      const exactScore = trueExactScore || (pred.isShield && correctResult);
      const correctFGS = !!(resolvedScorer && pred.firstGoalScorer && scorerMatch(pred.firstGoalScorer, resolvedScorer));

      // Confidence multiplier applies ONLY to match result outcome
      const multiplier = 1 + ((pred.confidence - 50) / 50);
      xp = correctResult ? Math.round(50 * multiplier) : 0;
      if (exactScore) xp += 200;  // flat, no multiplier
      if (correctFGS) xp += 150;  // flat, no multiplier

      // Confidence Penalty (Risk vs Reward)
      if (!correctResult) xp -= Math.round(50  * (pred.confidence / 100));
      if (pred.firstGoalScorer && !correctFGS) xp -= 100;

      // BTTS bonus — 75 XP flat (no confidence multiplier)
      const actualBtts = homeScore > 0 && awayScore > 0;
      if (pred.btts !== null && pred.btts !== undefined && pred.btts === actualBtts) xp += 75;

      // Total Goals bucket bonus — 75 XP flat
      const actualTotal  = homeScore + awayScore;
      const actualBucket = actualTotal >= 5 ? 5 : actualTotal;
      const predBucket   = (pred.totalGoals ?? -1) >= 5 ? 5 : (pred.totalGoals ?? -1);
      if (pred.totalGoals !== null && pred.totalGoals !== undefined && predBucket === actualBucket) xp += 75;

      // Double joker: rewards only, not penalties
      if (pred.isDouble && xp > 0) xp *= 2;

      // Streak
      const newStreak = correctResult ? (pred.user as any).streak + 1 : 0;

      // Streak bonus XP (milestone: 3, 5, 10 in a row)
      let streakBonus = 0;
      if (correctResult) {
        if (newStreak === 10) streakBonus = 500;
        else if (newStreak === 5) streakBonus = 150;
        else if (newStreak === 3) streakBonus = 50;
      }
      xp += streakBonus;

      await prisma.prediction.update({ where: { id: pred.id }, data: { xpEarned: xp, streakBonusXp: streakBonus, status: correctResult ? "correct" : "wrong" } });

      // Update user total XP + stats
      const updatedUser = await prisma.user.update({
        where: { id: pred.userId },
        data: {
          xp:              { increment: xp },
          streak:          newStreak,
          bestStreak:      { set: Math.max((pred.user as any).bestStreak ?? 0, newStreak) },
          predictionCount: { increment: 1 },
          correctCount:    { increment: correctResult ? 1 : 0 },
        },
        select: { xp: true },
      });

      const newTotalXp = updatedUser.xp;

      // Send match result email — log failures instead of swallowing them
      if (pred.user.email) {
        sendEmail({
          to: pred.user.email,
          subject: exactScore
            ? `🎯 Perfect call! ${match.homeTeam} ${homeScore}–${awayScore} ${match.awayTeam}`
            : correctResult
            ? `✅ Result correct! ${match.homeTeam} vs ${match.awayTeam}`
            : `⚽ Match result: ${match.homeTeam} ${homeScore}–${awayScore} ${match.awayTeam}`,
          react: React.createElement(MatchResultEmail, {
            name:           pred.user.name ?? "there",
            homeTeam:       match.homeTeam,
            awayTeam:       match.awayTeam,
            actualScore:    `${homeScore} – ${awayScore}`,
            predictedScore: `${pred.homeScore} – ${pred.awayScore}`,
            resultCorrect:  correctResult,
            scoreCorrect:   exactScore,
            xpEarned:       xp,
            newTotalXp:     updatedUser.xp,
            firstGoalScorer: pred.firstGoalScorer ?? undefined,
            scorerCorrect:   correctFGS || undefined,
          }),
        }).catch((err) => console.error(`[email] Failed to send result email to ${pred.user.email}:`, err));
      }
    }
  }

  return NextResponse.json(match);
}

// DELETE /api/admin/matches/[id]
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== "ADMIN")
    return NextResponse.json({ message: "Unauthorized" }, { status: 403 });

  const { id } = await params;
  await prisma.match.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
