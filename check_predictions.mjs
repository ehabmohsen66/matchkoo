import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true }
  });
  
  console.log("Users:", users);

  const predictions = await prisma.prediction.findMany({
    include: { user: true, match: true }
  });

  console.log("Total predictions:", predictions.length);
  const grouped = predictions.reduce((acc, p) => {
    const key = `${p.user.name || p.user.email} - status: ${p.status}, xpEarned: ${p.xpEarned}`;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  console.log("Grouped:");
  console.log(grouped);
}

main().catch(console.error).finally(() => prisma.$disconnect());
