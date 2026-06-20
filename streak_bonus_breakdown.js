const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const preds = await prisma.prediction.findMany({
    where: { streakBonusXp: { gt: 0 } },
    include: {
      user: { select: { name: true } },
      match: { select: { homeTeam: true, awayTeam: true } }
    },
    orderBy: [
      { user: { name: 'asc' } },
      { matchId: 'asc' }
    ]
  });

  const grouped = {};
  for (const p of preds) {
    const name = p.user.name || 'Unknown';
    if (!grouped[name]) grouped[name] = [];
    grouped[name].push({
      match: `${p.match.homeTeam} vs ${p.match.awayTeam}`,
      bonus: p.streakBonusXp,
      totalXp: p.xpEarned
    });
  }

  console.log("Streak Bonus Breakdown per User per Match:\n");
  for (const [user, matches] of Object.entries(grouped)) {
    console.log(`### ${user}`);
    console.log(`| Match | Streak Bonus Earned | Total Match XP (incl. bonus) |`);
    console.log(`|---|---|---|`);
    for (const m of matches) {
      console.log(`| ${m.match} | **+${m.bonus} XP** | ${m.totalXp} XP |`);
    }
    console.log("");
  }
}

main().finally(() => prisma.$disconnect());
