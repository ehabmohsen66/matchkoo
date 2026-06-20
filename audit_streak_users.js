const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Get all predictions that have a streak bonus recorded
  const preds = await prisma.prediction.findMany({
    where: { streakBonusXp: { gt: 0 } },
    include: {
      user: { select: { id: true, name: true, xp: true } },
      match: { select: { homeTeam: true, awayTeam: true } }
    },
    orderBy: [{ user: { name: 'asc' } }]
  });

  // Group by user
  const grouped = {};
  for (const p of preds) {
    const uid = p.user.id;
    if (!grouped[uid]) {
      grouped[uid] = {
        name: p.user.name,
        globalXp: p.user.xp,
        predictions: []
      };
    }
    grouped[uid].predictions.push({
      match: `${p.match.homeTeam} vs ${p.match.awayTeam}`,
      xpEarned: p.xpEarned,
      streakBonusXp: p.streakBonusXp
    });
  }

  console.log("Per-user streak bonus audit:\n");
  console.log("| User | Global XP (with bonus) | Total Streak Bonus | Mini League XP (bonus excluded) | Match Breakdown |");
  console.log("|---|---|---|---|---|");

  for (const uid of Object.keys(grouped)) {
    const u = grouped[uid];
    // Get ALL their predictions in the Digitology mini league (competition: world_cup)
    const allPreds = await prisma.prediction.groupBy({
      by: ['userId'],
      where: {
        userId: uid,
        xpEarned: { not: null }
      },
      _sum: { xpEarned: true, streakBonusXp: true }
    });
    const totalXpEarned = allPreds[0]?._sum?.xpEarned ?? 0;
    const totalStreakBonus = allPreds[0]?._sum?.streakBonusXp ?? 0;
    const miniLeagueXp = totalXpEarned - totalStreakBonus;

    const matchBreakdown = u.predictions.map(p =>
      `${p.match}: +${p.streakBonusXp} bonus (${p.xpEarned} total)`
    ).join(' | ');

    console.log(`| ${u.name} | ${u.globalXp} XP | ${totalStreakBonus} XP | ${miniLeagueXp} XP | ${matchBreakdown} |`);
  }

  console.log("\n\nNote: Global XP remains unchanged. Mini League rank uses (xpEarned - streakBonusXp) automatically.\n");
  console.log("No DB changes needed — the mini league API already subtracts streakBonusXp at runtime.");
}

main().finally(() => prisma.$disconnect());
