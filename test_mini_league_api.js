const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Competition key → canonical tournament name suffix for matching
const COMP_TO_LEAGUE = {
  premier_league:          ["english premier league", "premier league"],
  la_liga:                 ["la liga"],
  champions_league:        ["uefa champions league", "champions league"],
  egyptian_premier_league: ["egyptian premier league"],
  world_cup:               ["fifa world cup", "world cup"],
};

function normaliseName(raw) {
  return (raw || "")
    .toLowerCase()
    .replace(/\s+\d{4}(\s+\[\d+\])?$/, "")
    .replace(/\s+\[\d+\]$/, "")
    .trim();
}

async function testMiniLeague(id) {
  const league = await prisma.tournament.findUnique({
    where: { id },
    include: {
      registrations: {
        include: {
          user: {
            select: { id: true, name: true, xp: true, streak: true },
          },
        },
      },
    },
  });

  if (!league) return;

  const competitionKey = league.competition || "premier_league";
  const validNames = COMP_TO_LEAGUE[competitionKey] || [];

  const allTournamentMatches = await prisma.match.findMany({
    where: { status: { in: ["UPCOMING", "LIVE", "COMPLETED"] } },
    include: { tournament: { select: { name: true } } },
  });
  const allCompMatchIds = allTournamentMatches
    .filter((m) => validNames.includes(normaliseName(m.tournament.name)))
    .map((m) => m.id);

  const memberIds = league.registrations.map((r) => r.userId);

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

  const memberMap = Object.fromEntries(
    league.registrations.map((r) => [r.userId, r.user])
  );

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
      
      const rawXpEarned = pred?._sum?.xpEarned ?? 0;
      const totalStreakBonus = pred?._sum?.streakBonusXp ?? 0;
      const matchXp = rawXpEarned - totalStreakBonus;
      const totalXp = matchXp - penalty;
      
      return {
        userId: uid,
        name: user?.name ?? "Unknown",
        globalXp: user.xp,
        rawXpEarnedSum: rawXpEarned,
        totalStreakBonus: totalStreakBonus,
        miniLeagueXp: totalXp,
      };
    })
    .sort((a, b) => b.miniLeagueXp - a.miniLeagueXp);

  console.log(`Mini League: ${league.name} (Competition: ${competitionKey})`);
  console.table(ranking);
}

async function main() {
  const leagues = await prisma.tournament.findMany({ where: { registrationMode: "INVITE_ONLY" } });
  for (const l of leagues) {
    await testMiniLeague(l.id);
  }
}

main().finally(() => prisma.$disconnect());
