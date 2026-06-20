import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

// GET /api/users/[userId]/profile — public profile data for any authenticated viewer
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId } = await params;

    // Fetch public user fields only — never expose email, password, tokens, etc.
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        image: true,
        country: true,
        xp: true,
        streak: true,
        bestStreak: true,
        predictionCount: true,
        correctCount: true,
        createdAt: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Fetch all completed predictions for this user (match must be COMPLETED)
    const completedPredictions = await prisma.prediction.findMany({
      where: {
        userId,
        match: { status: "COMPLETED" },
      },
      select: {
        id: true,
        homeScore: true,
        awayScore: true,
        firstGoalScorer: true,
        xpEarned: true,
        streakBonusXp: true,
        isDouble: true,
        isShield: true,
        btts: true,
        totalGoals: true,
        confidence: true,
        match: {
          select: {
            homeTeam: true,
            awayTeam: true,
            homeLogo: true,
            awayLogo: true,
            homeScore: true,
            awayScore: true,
            matchDate: true,
            round: true,
            firstGoalScorer: true,
            tournament: {
              select: { id: true, name: true, type: true },
            },
          },
        },
      },
      orderBy: { match: { matchDate: "desc" } },
    });

    return NextResponse.json({ ...user, completedPredictions });
  } catch (error) {
    console.error("[api/users/profile] error:", error);
    return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 });
  }
}
