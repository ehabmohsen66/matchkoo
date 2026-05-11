import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

// GET /api/predictions/stats — real accuracy, correct count, total for current user
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as any).id;

  const [total, completed] = await Promise.all([
    prisma.prediction.count({ where: { userId } }),
    prisma.prediction.findMany({
      where: { userId, match: { status: "COMPLETED" }, xpEarned: { not: null } },
      select: { xpEarned: true },
    }),
  ]);

  const correct = completed.filter((p) => (p.xpEarned ?? 0) >= 10).length;
  const accuracy = completed.length > 0 ? Math.round((correct / completed.length) * 100) : 0;

  return NextResponse.json({ total, correct, completed: completed.length, accuracy });
}
