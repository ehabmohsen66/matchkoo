import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

// GET /api/predictions/stats — accuracy, correct/wrong counts for current user
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as any).id;

  // Use prediction.status ("correct" | "wrong") — NOT xpEarned threshold.
  // Wrong predictions can still earn XP (BTTS bonus, total goals bonus, etc.)
  // so xpEarned >= 10 is not a reliable signal for correctness.
  const [statusCounts, allPredictions] = await Promise.all([
    prisma.prediction.groupBy({
      by: ["status"],
      where: { userId, status: { in: ["correct", "wrong"] } },
      _count: { status: true },
    }),
    prisma.prediction.count({ where: { userId } }),
  ]);

  const correct = statusCounts.find((r) => r.status === "correct")?._count.status ?? 0;
  const wrong   = statusCounts.find((r) => r.status === "wrong")?._count.status   ?? 0;
  const total   = correct + wrong; // resolved picks only (consistent denominator)
  const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;

  return NextResponse.json({ total, correct, wrong, allPredictions, accuracy });
}

