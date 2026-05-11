import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

// GET /api/predictions — user's own predictions, grouped data included
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const filter = searchParams.get("filter") || "upcoming";

    const predictions = await prisma.prediction.findMany({
      where: {
        userId: session.user.id,
        match: {
          status: filter === "upcoming" ? { in: ["UPCOMING", "LIVE"] } : "COMPLETED",
        },
      },
      include: {
        match: {
          include: {
            tournament: { select: { id: true, name: true, type: true, prizes: true } },
          },
        },
      },
      orderBy: [{ match: { matchDate: "asc" } }],
    });

    return NextResponse.json(predictions);
  } catch (error) {
    return NextResponse.json({ message: "Failed to fetch predictions" }, { status: 500 });
  }
}

// POST /api/predictions — create or update a prediction
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const { matchId, homeScore, awayScore, firstGoalScorer, confidence, isDouble } = await req.json();

    if (!matchId || homeScore == null || awayScore == null) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
    }

    const match = await prisma.match.findUnique({ where: { id: matchId } });
    if (!match) return NextResponse.json({ message: "Match not found" }, { status: 404 });

    const now = new Date();
    if (match.matchDate <= now && match.status !== "UPCOMING") {
      return NextResponse.json({ message: "Predictions are locked — match has started" }, { status: 400 });
    }

    // Enforce one double per round per tournament
    if (isDouble) {
      const existingDouble = await prisma.prediction.findFirst({
        where: {
          userId: session.user.id,
          isDouble: true,
          match: { tournamentId: match.tournamentId, round: match.round },
          NOT: { matchId },
        },
      });
      if (existingDouble) {
        return NextResponse.json({ message: "You already have a double marker in this round" }, { status: 400 });
      }
    }

    const prediction = await prisma.prediction.upsert({
      where: { userId_matchId: { userId: session.user.id, matchId } },
      update: { homeScore, awayScore, firstGoalScorer, confidence: confidence ?? 50, isDouble: isDouble ?? false, updatedAt: new Date() },
      create: { userId: session.user.id, matchId, homeScore, awayScore, firstGoalScorer, confidence: confidence ?? 50, isDouble: isDouble ?? false },
    });

    // Award referral XP on first prediction
    const predCount = await prisma.prediction.count({ where: { userId: session.user.id } });
    if (predCount === 1) {
      const referral = await prisma.referral.findUnique({ where: { referredId: session.user.id } });
      if (referral && !referral.xpAwarded) {
        await prisma.$transaction([
          prisma.referral.update({ where: { referredId: session.user.id }, data: { xpAwarded: true } }),
          prisma.user.update({ where: { id: referral.referrerId }, data: { xp: { increment: 200 } } }),
        ]);
      }
    }

    return NextResponse.json(prediction, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "An error occurred" }, { status: 500 });
  }
}
