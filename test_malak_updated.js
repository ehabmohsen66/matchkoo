const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst({ where: { name: { contains: 'Malak Tera' } } });
  
  const preds = await prisma.prediction.findMany({
    where: { userId: user.id, status: { not: null } },
    include: { match: true },
    orderBy: { updatedAt: 'asc' }
  });
  
  preds.forEach(p => {
    console.log(`${p.updatedAt.toISOString()} | Match: ${p.match.homeTeam} vs ${p.match.awayTeam} | Status: ${p.status} | xpEarned: ${p.xpEarned} | MatchDate: ${p.match.matchDate.toISOString()}`);
  });
}
main().finally(() => prisma.$disconnect());
