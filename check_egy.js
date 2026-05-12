const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const matches = await prisma.match.findMany({ 
    where: { tournament: { name: { contains: 'egypt', mode: 'insensitive' } } },
    include: { tournament: true } 
  });
  console.log(matches.map(m => ({ 
    id: m.id, 
    date: m.matchDate, 
    home: m.homeTeam, 
    away: m.awayTeam, 
    tName: m.tournament?.name 
  })));
}
main().finally(() => prisma.$disconnect());
