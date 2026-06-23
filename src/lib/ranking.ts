import { prisma } from "@/lib/prisma";

export const COMP_TO_LEAGUE: Record<string, string[]> = {
  premier_league:          ["english premier league", "premier league"],
  la_liga:                 ["la liga"],
  champions_league:        ["uefa champions league", "champions league"],
  egyptian_premier_league: ["egyptian premier league"],
  world_cup:               ["fifa world cup", "world cup"],
};

export function normaliseName(raw: string): string {
  return (raw || "")
    .toLowerCase()
    .replace(/\s+\d{4}(\s+\[\d+\])?$/, "")
    .replace(/\s+\[\d+\]$/, "")
    .trim();
}

export interface RankingEntry {
  userId: string;
  name: string;
  image: string | null;
  xp: number;
  isMe: boolean;
  hasDemonPenalty: boolean;
  rank: number;
  isTargetable: boolean;
}

export async function getMiniLeagueRanking(
  leagueOrId: string | any,
  userId?: string
): Promise<RankingEntry[] | null> {
  const league = typeof leagueOrId === "string"
    ? await prisma.tournament.findUnique({
        where: { id: leagueOrId },
        include: {
          registrations: {
            include: {
              user: {
                select: { id: true, name: true, image: true, xp: true, streak: true, correctCount: true, predictionCount: true },
              },
            },
          },
        },
      })
    : leagueOrId;

  if (!league || league.registrationMode !== "INVITE_ONLY") {
    return null;
  }

  const competitionKey = league.competition || "premier_league";
  const validNames = COMP_TO_LEAGUE[competitionKey] || [];

  // Also include completed matches for scoring, starting from the mini-league's creation/start date.
  const allTournamentMatches = await prisma.match.findMany({
    where: {
      status: { in: ["UPCOMING", "LIVE", "COMPLETED"] },
      matchDate: { gte: league.startDate },
    },
    include: { tournament: { select: { name: true } } },
  });
  const allCompMatchIds = allTournamentMatches
    .filter((m) => validNames.includes(normaliseName(m.tournament.name)))
    .map((m) => m.id);

  const memberIds = league.registrations.map((r: any) => r.userId);

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
    league.registrations.map((r: any) => [r.userId, r.user])
  );

  // Fetch Demon Usage penalties
  const demonRows = await prisma.demonUsage.groupBy({
    by: ["targetUserId"],
    where: { miniLeagueId: league.id },
    _sum: { amount: true }
  });
  
  const demonMap = Object.fromEntries(
    demonRows.map(r => [r.targetUserId, r._sum.amount || 0])
  );

  const ranked = memberIds
    .map((uid: string) => {
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
    .sort((a: { xp: number }, b: { xp: number }) => b.xp - a.xp)
    .map((r: { userId: string; name: string; image: string | null; xp: number; isMe: boolean; hasDemonPenalty: boolean }, i: number) => ({ ...r, rank: i + 1 }));

  const myEntry = ranked.find((r: { isMe: boolean }) => r.isMe);
  const myRank = myEntry?.rank;

  const ranking = ranked.map((r: { userId: string; name: string; image: string | null; xp: number; isMe: boolean; hasDemonPenalty: boolean; rank: number }) => ({
    ...r,
    isTargetable: !!(userId && !r.isMe && myRank && Math.abs(r.rank - myRank) <= 2),
  }));

  return ranking;
}
