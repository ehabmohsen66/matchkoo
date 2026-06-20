const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst({ where: { name: { contains: 'Malak Tera' } } });
  if (!user) { console.log('User not found'); return; }
  
  const preds = await prisma.prediction.findMany({
    where: { userId: user.id },
    include: { match: true }
  });
  
  const target = preds.find(p => p.match.homeTeam === 'Uzbekistan' || p.match.awayTeam === 'Uzbekistan');
  console.log(target);
}
main().finally(() => prisma.$disconnect());
