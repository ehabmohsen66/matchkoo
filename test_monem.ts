import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const users = await prisma.user.findMany({
    where: { name: { contains: 'Ahmed Monem', mode: 'insensitive' } }
  });

  if (users.length === 0) { console.log("User not found"); return; }
  
  const user = users[0];
  console.log(`Found user: ${user.name} (${user.id})`);

  const preds = await prisma.prediction.findMany({
    where: { userId: user.id },
    include: { match: true },
    orderBy: { createdAt: 'desc' }
  });

  console.log(`Total predictions: ${preds.length}`);
  preds.forEach(p => {
    console.log(`- Match: ${p.match.homeTeam} vs ${p.match.awayTeam} | isDouble: ${p.isDouble} | isShield: ${p.isShield}`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
