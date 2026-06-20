import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getMiniLeagueRanking, COMP_TO_LEAGUE, normaliseName } from "@/lib/ranking";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;

    // Load the mini league (Tournament with INVITE_ONLY)
    const league = await prisma.tournament.findUnique({
      where: { id },
      include: {
        registrations: {
          include: {
            user: {
              select: { id: true, name: true, image: true, xp: true, streak: true, correctCount: true, predictionCount: true },
            },
          },
        },
      },
    });

    if (!league || league.registrationMode !== "INVITE_ONLY") {
      return NextResponse.json({ message: "Mini league not found" }, { status: 404 });
    }

    // Fetch all upcoming/live matches across ALL tournaments, filter by competition
    const competitionKey = league.competition || "premier_league";
    const validNames = COMP_TO_LEAGUE[competitionKey] || [];

    const allMatches = await prisma.match.findMany({
      where: { status: { in: ["UPCOMING", "LIVE"] } },
      include: { tournament: { select: { name: true } } },
      orderBy: { matchDate: "asc" },
    });

    const now = new Date();
    const cutoff = new Date(now);
    cutoff.setDate(cutoff.getDate() + 7);

    const fixtures = allMatches.filter((m) => {
      const normalised = normaliseName(m.tournament.name);
      const matchDate = new Date(m.matchDate);
      return (
        validNames.includes(normalised) &&
        m.status === "UPCOMING" &&
        matchDate >= now &&
        matchDate <= cutoff
      );
    });

    const liveMatches = allMatches.filter((m) => {
      const normalised = normaliseName(m.tournament.name);
      return validNames.includes(normalised) && m.status === "LIVE";
    });



    const ranking = await getMiniLeagueRanking(league, userId);
    if (!ranking) {
      return NextResponse.json({ message: "Mini league not found" }, { status: 404 });
    }

    // User's own predictions for upcoming fixtures
    let myPredictions: Record<string, any> = {};
    if (userId) {
      const preds = await prisma.prediction.findMany({
        where: { userId, matchId: { in: fixtures.map((m) => m.id) } },
        select: { matchId: true, homeScore: true, awayScore: true, firstGoalScorer: true },
      });
      myPredictions = Object.fromEntries(preds.map((p) => [p.matchId, p]));
    }

    return NextResponse.json({
      id: league.id,
      name: league.name,
      competition: competitionKey,
      scoringMode: league.scoringMode || "global",
      inviteCode: league.inviteCode,
      memberCount: league.registrations.length,
      ranking,
      targetableUsers: ranking.filter((r) => r.isTargetable),
      liveMatches: liveMatches.map((m) => ({
        id: m.id,
        homeTeam: m.homeTeam,
        awayTeam: m.awayTeam,
        homeLogo: m.homeLogo,
        awayLogo: m.awayLogo,
        homeScore: m.homeScore,
        awayScore: m.awayScore,
        minute: (m as any).minute ?? null,
      })),
      fixtures: fixtures.map((m) => ({
        id: m.id,
        homeTeam: m.homeTeam,
        awayTeam: m.awayTeam,
        homeLogo: m.homeLogo,
        awayLogo: m.awayLogo,
        matchDate: m.matchDate,
        round: m.round,
        status: m.status,
        userPrediction: myPredictions[m.id] ?? null,
      })),
    });
  } catch (error) {
    console.error("Mini league detail error:", error);
    return NextResponse.json({ message: "Failed to load mini league" }, { status: 500 });
  }
}
