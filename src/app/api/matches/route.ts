import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

// GET /api/matches?tournamentId=xxx
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const tournamentId = searchParams.get("tournamentId");
    const session = await getServerSession(authOptions);

    const matches = await prisma.match.findMany({
      where: tournamentId ? { tournamentId } : {},
      orderBy: [{ round: "asc" }, { matchDate: "asc" }],
      include: {
        tournament: { select: { id: true, name: true, type: true } },
        _count: { select: { predictions: true } },
        ...(session?.user?.id
          ? { predictions: { where: { userId: session.user.id }, select: { id: true, homeScore: true, awayScore: true, firstGoalScorer: true, confidence: true, isDouble: true, xpEarned: true } } }
          : {}),
      },
    });

    const enriched = matches.map((m: any) => ({
      ...m,
      userPrediction: m.predictions?.[0] ?? null,
      predictions: undefined,
    }));

    return NextResponse.json(enriched);
  } catch (error) {
    return NextResponse.json({ message: "Failed to fetch matches" }, { status: 500 });
  }
}

// POST /api/matches — admin creates a match
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== "ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
    }

    const { tournamentId, homeTeam, awayTeam, matchDate, round } = await req.json();
    if (!tournamentId || !homeTeam || !awayTeam || !matchDate) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
    }

    const match = await prisma.match.create({
      data: { tournamentId, homeTeam, awayTeam, matchDate: new Date(matchDate), round: round || "Round 1" },
    });

    return NextResponse.json(match, { status: 201 });
  } catch (error) {
    return NextResponse.json({ message: "An error occurred" }, { status: 500 });
  }
}
