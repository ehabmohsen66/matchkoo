const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst({ where: { name: { contains: 'Malak Tera' } } });
  
  const preds = await prisma.prediction.findMany({
    where: { userId: user.id },
    include: { match: true },
    orderBy: { match: { matchDate: 'asc' } }
  });
  
  preds.forEach(p => {
    console.log(`${p.match.matchDate.toISOString()} | Match: ${p.match.homeTeam} vs ${p.match.awayTeam} | Status: ${p.status} | xpEarned: ${p.xpEarned} | Score: ${p.match.homeScore}-${p.match.awayScore} | Pred: ${p.homeScore}-${p.awayScore}`);
  });
}
main().finally(() => prisma.$disconnect());
