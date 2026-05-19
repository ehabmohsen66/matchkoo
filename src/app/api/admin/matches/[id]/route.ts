import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import * as React from "react";
import { sendEmail } from "@/lib/email";
import MatchResultEmail from "@/emails/MatchResultEmail";

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

  const match = await prisma.match.update({
    where: { id },
    data: {
      ...(homeScore !== undefined && { homeScore }),
      ...(awayScore !== undefined && { awayScore }),
      ...(firstGoalScorer !== undefined && { firstGoalScorer }),
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
      const exactScore = pred.homeScore === homeScore && pred.awayScore === awayScore;
      const correctFGS = !!(firstGoalScorer && pred.firstGoalScorer?.toLowerCase() === firstGoalScorer.toLowerCase());

      // Base XP
      let baseXp = 0;
      if (correctResult) baseXp += 50;
      if (exactScore)    baseXp += 150;
      if (correctFGS)    baseXp += 100;

      // Confidence multiplier: 50%=1.0×, 100%=2.0×
      const multiplier = 1 + ((pred.confidence - 50) / 50);
      xp = Math.round(baseXp * multiplier);

      // Confidence Penalty (Risk vs Reward)
      if (!correctResult) xp -= Math.round(50  * (pred.confidence / 100));
      if (pred.firstGoalScorer && !correctFGS) xp -= Math.round(100 * (pred.confidence / 100));

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

      await prisma.prediction.update({ where: { id: pred.id }, data: { xpEarned: xp, status: correctResult ? "correct" : "wrong" } });

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
