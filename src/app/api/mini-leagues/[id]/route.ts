import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

// Competition key → canonical tournament name suffix for matching
const COMP_TO_LEAGUE: Record<string, string[]> = {
  premier_league:          ["english premier league", "premier league"],
  la_liga:                 ["la liga"],
  champions_league:        ["uefa champions league", "champions league"],
  egyptian_premier_league: ["egyptian premier league"],
  world_cup:               ["fifa world cup", "world cup"],
};

function normaliseName(raw: string): string {
  return (raw || "")
    .toLowerCase()
    .replace(/\s+\d{4}(\s+\[\d+\])?$/, "")
    .replace(/\s+\[\d+\]$/, "")
    .trim();
}

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



    // Also include completed matches for scoring.
    // Use the same normalised-name filter as fixtures (raw DB `in` won't match
    // names like "UEFA Champions League 2025 [2]").
    const allTournamentMatches = await prisma.match.findMany({
      where: { status: { in: ["UPCOMING", "LIVE", "COMPLETED"] } },
      include: { tournament: { select: { name: true } } },
    });
    const allCompMatchIds = allTournamentMatches
      .filter((m) => validNames.includes(normaliseName(m.tournament.name)))
      .map((m) => m.id);


    const memberIds = league.registrations.map((r) => r.userId);

    // Get predictions for each member on this competition's matches
    const predRows = await prisma.prediction.groupBy({
      by: ["userId"],
      where: {
        userId: { in: memberIds },
        matchId: { in: allCompMatchIds },
        xpEarned: { not: null },
      },
      _sum: { xpEarned: true, streakBonusXp: true },
      orderBy: { _sum: { xpEarned: "desc" } },
    });

    // Build ranking with member info
    const memberMap = Object.fromEntries(
      league.registrations.map((r) => [r.userId, r.user])
    );

    // Fetch Demon Usage penalties
    const demonRows = await prisma.demonUsage.groupBy({
      by: ["targetUserId"],
      where: { miniLeagueId: id },
      _sum: { amount: true }
    });
    
    const demonMap = Object.fromEntries(
      demonRows.map(r => [r.targetUserId, r._sum.amount || 0])
    );

    const ranking = memberIds
      .map((uid) => {
        const pred = predRows.find((r) => r.userId === uid);
        const user = memberMap[uid];
        const penalty = demonMap[uid] || 0;
        // Exclude streak milestone bonuses — mini-league standings reward only match XP
        const matchXp = (pred?._sum?.xpEarned ?? 0) - (pred?._sum?.streakBonusXp ?? 0);
        const totalXp = matchXp - penalty;
        
        return {
          userId: uid,
          name: user?.name ?? "Unknown",
          image: user?.image ?? null,
          xp: totalXp,
          isMe: uid === userId,
          hasDemonPenalty: penalty > 0,
        };
      })
      .sort((a, b) => b.xp - a.xp)
      .map((r, i) => ({ ...r, rank: i + 1 }));

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
