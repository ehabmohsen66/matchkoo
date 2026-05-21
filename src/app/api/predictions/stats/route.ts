import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

// GET /api/predictions/stats — real accuracy, correct count, total for current user
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as any).id;

  const [total, completedCount, correctCount] = await Promise.all([
    prisma.prediction.count({ where: { userId } }),
    prisma.prediction.count({
      where: { userId, status: { not: null } }
    }),
    prisma.prediction.count({
      where: { userId, status: "correct" }
    })
  ]);

  const accuracy = completedCount > 0 ? Math.round((correctCount / completedCount) * 100) : 0;

  return NextResponse.json({ 
    total, 
    correct: correctCount, 
    completed: completedCount, 
    accuracy 
  });
}
