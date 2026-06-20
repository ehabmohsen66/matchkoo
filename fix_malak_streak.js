const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst({ where: { name: { contains: 'Malak Tera' } } });
  console.log('User:', user.name, '| Current XP:', user.xp, '| Streak:', user.streak);

  const pred = await prisma.prediction.findFirst({
    where: { userId: user.id },
    include: { match: true },
    orderBy: { match: { matchDate: 'desc' } }
  });

  // Find the Uzbekistan vs Colombia prediction (the one with xpEarned: 225)
  const targetPred = await prisma.prediction.findFirst({
    where: { userId: user.id, match: { homeTeam: 'Uzbekistan' } },
    include: { match: true }
  });

  console.log('\nTarget prediction:');
  console.log('  Match:', targetPred.match.homeTeam, 'vs', targetPred.match.awayTeam);
  console.log('  Current xpEarned:', targetPred.xpEarned);
  console.log('  Current streakBonusXp:', targetPred.streakBonusXp);

  // Fix: subtract 50 from xpEarned, set streakBonusXp=0
  await prisma.prediction.update({
    where: { id: targetPred.id },
    data: { xpEarned: 175, streakBonusXp: 0 }
  });

  // Fix user total XP: subtract 50
  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: { xp: { decrement: 50 } }
  });

  console.log('\n✅ Fixed:');
  console.log('  Prediction xpEarned: 225 → 175');
  console.log('  User XP:', user.xp, '→', updatedUser.xp);
}
main().catch(console.error).finally(() => prisma.$disconnect());
