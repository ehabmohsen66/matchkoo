const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const matches = await prisma.match.findMany({
    select: { homeTeam: true, homeLogo: true, awayTeam: true, awayLogo: true }
  });
  
  const teams = {};
  for (const m of matches) {
    if (!teams[m.homeTeam]) teams[m.homeTeam] = m.homeLogo;
    if (!teams[m.awayTeam]) teams[m.awayTeam] = m.awayLogo;
  }
  
  console.log(JSON.stringify(teams, null, 2));
}

main().finally(() => prisma.$disconnect());
