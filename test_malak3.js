const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst({ where: { name: { contains: 'Malak Tera' } } });
  
  const p = await prisma.prediction.findFirst({
    where: { userId: user.id, match: { homeTeam: 'Ghana' } },
    include: { match: true }
  });

  console.log('Match Score:', p.match.homeScore, '-', p.match.awayScore);
  console.log('Pred Score:', p.homeScore, '-', p.awayScore);
  console.log('Status:', p.status);
}
main().finally(() => prisma.$disconnect());
