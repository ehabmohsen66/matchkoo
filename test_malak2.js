const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst({ where: { name: { contains: 'Malak Tera' } } });
  
  const pred = await prisma.prediction.findFirst({
    where: { userId: user.id },
    include: { match: true }
  });
  
  // Actually, I just want to run the exact calculation for her Uzbekistan prediction
  const p = await prisma.prediction.findFirst({
    where: { userId: user.id, match: { homeTeam: 'Uzbekistan' } },
    include: { match: true, user: true }
  });

  const hs = p.match.homeScore;
  const as = p.match.awayScore;
  
  const correctResult =
    (p.homeScore > p.awayScore && hs > as) ||
    (p.homeScore < p.awayScore && hs < as) ||
    (p.homeScore === p.awayScore && hs === as);
  const trueExactScore = p.homeScore === hs && p.awayScore === as;
  const exactScore = trueExactScore || (p.isShield && correctResult);
  
  const multiplier = 1 + ((p.confidence - 50) / 50);
  let xp = correctResult ? Math.round(50 * multiplier) : 0;
  console.log('Result XP:', xp);
  if (exactScore) xp += 200;
  
  const actualBtts = hs > 0 && as > 0;
  if (p.btts !== null && p.btts === actualBtts) {
    xp += 75;
    console.log('BTTS XP: 75');
  }
  
  const actualTotal = hs + as;
  const actualBucket = actualTotal >= 5 ? 5 : actualTotal;
  const predBucket = (p.totalGoals ?? -1) >= 5 ? 5 : (p.totalGoals ?? -1);
  if (p.totalGoals !== null && predBucket === actualBucket) {
    xp += 75;
    console.log('Total Goals XP: 75');
  }
  
  console.log('Double Joker:', p.isDouble);
  if (p.isDouble && xp > 0) xp *= 2;
  
  console.log('Total Calc XP:', xp);
  console.log('DB xpEarned:', p.xpEarned);
}
main().finally(() => prisma.$disconnect());
