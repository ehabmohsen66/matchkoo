const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findUnique({
    where: { email: 'ahmed.mousa.it@gmail.com' },
    select: { id: true, name: true, xp: true },
  });
  console.log('Current XP:', user.xp);

  // Sum ALL XP sources for this user
  const [predXp, spinXp, challengeXp] = await Promise.all([
    // Predictions
    prisma.prediction.aggregate({
      where: { userId: user.id, xpEarned: { not: null } },
      _sum: { xpEarned: true },
    }),
    // Daily spins
    prisma.dailySpin.aggregate({
      where: { userId: user.id },
      _sum: { xpAwarded: true },
    }),
    // Challenge rewards
    prisma.challengeReward.aggregate({
      where: { userId: user.id },
      _sum: { xpAwarded: true },
    }),
  ]);

  const totalCalc =
    (predXp._sum.xpEarned || 0) +
    (spinXp._sum.xpAwarded || 0) +
    (challengeXp._sum.xpAwarded || 0);

  console.log('Prediction XP:   ', predXp._sum.xpEarned || 0);
  console.log('Daily Spin XP:   ', spinXp._sum.xpAwarded || 0);
  console.log('Challenge XP:    ', challengeXp._sum.xpAwarded || 0);
  console.log('Calculated total:', totalCalc);
  console.log('Stored total:    ', user.xp);

  // Restore to correct total
  await prisma.user.update({
    where: { id: user.id },
    data: { xp: totalCalc },
  });
  console.log('✅ Restored XP to', totalCalc);
}

main().catch(console.error).finally(() => prisma.$disconnect());
