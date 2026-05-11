import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

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
    const predictions = await prisma.prediction.findMany({ where: { matchId: id } });

    for (const pred of predictions) {
      let xp = 0;
      const correctResult =
        (pred.homeScore > pred.awayScore && homeScore > awayScore) ||
        (pred.homeScore < pred.awayScore && homeScore < awayScore) ||
        (pred.homeScore === pred.awayScore && homeScore === awayScore);
      const exactScore = pred.homeScore === homeScore && pred.awayScore === awayScore;
      const correctFGS = firstGoalScorer && pred.firstGoalScorer?.toLowerCase() === firstGoalScorer.toLowerCase();

      if (exactScore) xp += 30;
      else if (correctResult) xp += 10;
      if (correctFGS) xp += 15;

      // Confidence multiplier: 50→×1.0, 75→×1.5, 100→×2.0
      const multiplier = 1 + ((pred.confidence - 50) / 50);
      xp = Math.round(xp * multiplier);

      // Double XP joker
      if (pred.isDouble) xp *= 2;

      await prisma.prediction.update({ where: { id: pred.id }, data: { xpEarned: xp } });

      // Update user total XP
      if (xp > 0) {
        await prisma.user.update({ where: { id: pred.userId }, data: { xp: { increment: xp } } });
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
