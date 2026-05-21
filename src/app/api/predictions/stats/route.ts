import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

// GET /api/predictions/stats — accuracy, correct/wrong counts for current user
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as any).id;

  // Fetch all completed predictions and evaluate correctness dynamically.
  // This avoids relying on DB `status` or `xpEarned` fields which might be
  // corrupted or null for older matches.
  const [allPredictions, completed] = await Promise.all([
    prisma.prediction.count({ where: { userId } }),
    prisma.prediction.findMany({
      where: { 
        userId, 
        match: { status: "COMPLETED", homeScore: { not: null }, awayScore: { not: null } } 
      },
      select: { 
        homeScore: true, 
        awayScore: true, 
        match: { select: { homeScore: true, awayScore: true } } 
      },
    }),
  ]);

  let correct = 0;
  let wrong = 0;

  for (const p of completed) {
    const hs = p.match.homeScore!;
    const as = p.match.awayScore!;
    const correctResult =
      (p.homeScore > p.awayScore && hs > as) ||
      (p.homeScore < p.awayScore && hs < as) ||
      (p.homeScore === p.awayScore && hs === as);
    
    if (correctResult) correct++;
    else wrong++;
  }

  const total = correct + wrong; // resolved picks only
  const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;

  return NextResponse.json({ total, correct, wrong, allPredictions, accuracy });
}

