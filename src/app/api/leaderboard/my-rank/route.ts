import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

/**
 * GET /api/leaderboard/my-rank
 * Returns the authenticated user's exact global rank (all-time, by XP)
 * plus xpToday: XP earned from predictions settled today (UTC).
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the current user's XP
    const me = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, xp: true },
    });

    if (!me) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Count how many OTHER users have strictly more XP (include all roles)
    const usersAhead = await prisma.user.count({
      where: {
        xp: { gt: me.xp ?? 0 },
        id: { not: userId },
      },
    });

    // Count total ranked users (all roles)
    const totalUsers = await prisma.user.count({});

    // XP earned today (UTC midnight → now)
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);

    const todayPreds = await prisma.prediction.aggregate({
      where: {
        userId,
        xpEarned: { not: null },
        updatedAt: { gte: todayStart },
      },
      _sum: { xpEarned: true },
    });
    const xpToday = todayPreds._sum.xpEarned ?? 0;

    // Rank = number of users ahead + 1
    const rank = usersAhead + 1;

    return NextResponse.json({ rank, totalUsers, xp: me.xp ?? 0, xpToday });
  } catch (error) {
    console.error("my-rank error:", error);
    return NextResponse.json({ error: "Failed to fetch rank" }, { status: 500 });
  }
}

