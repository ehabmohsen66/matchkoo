import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

// GET /api/matches?tournamentId=xxx   — or personalised if no tournamentId
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const tournamentId = searchParams.get("tournamentId");
    const session = await getServerSession(authOptions);

    // Build the where clause
    let where: Record<string, any> = {};

    if (tournamentId) {
      // Explicit league page — show that league only
      where = { tournamentId };
    } else if (session?.user?.id) {
      // Personalised view: only show leagues the user has selected
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { preferredLeagues: true },
      });
      if (user?.preferredLeagues && user.preferredLeagues.length > 0) {
        // preferredLeagues stores canonical league names like "English Premier League"
        // Tournament names in DB are like "English Premier League 2025 [39]"
        // Match with contains filter across all preferred leagues
        where = {
          tournament: {
            name: {
              in: await prisma.tournament.findMany({
                where: {
                  OR: user.preferredLeagues.map((league) => ({
                    name: { contains: league },
                  })),
                },
                select: { name: true },
              }).then((ts) => ts.map((t) => t.name)),
            },
          },
        };
      }
      // If preferredLeagues is empty (not set yet) fall through and show all
    }

    const matches = await prisma.match.findMany({
      where,
      orderBy: [{ round: "asc" }, { matchDate: "asc" }],
      include: {
        tournament: { select: { id: true, name: true, type: true } },
        _count: { select: { predictions: true } },
        ...(session?.user?.id
          ? { predictions: { where: { userId: session.user.id }, select: { id: true, homeScore: true, awayScore: true, firstGoalScorer: true, confidence: true, isDouble: true, xpEarned: true, btts: true, totalGoals: true } } }
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
