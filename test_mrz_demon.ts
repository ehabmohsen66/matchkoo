import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { name: { contains: 'MRZ', mode: 'insensitive' } },
        { email: { contains: 'MRZ', mode: 'insensitive' } },
      ]
    }
  });

  if (users.length === 0) {
    console.log("User MRZ not found by name or email");
    return;
  }
  
  console.log("Found matching users:");
  console.log(users.map(u => ({ id: u.id, name: u.name, email: u.email })));
  
  for (const u of users) {
    const jokerUsages = await prisma.prediction.findMany({
      where: {
        userId: u.id,
        isDouble: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        match: true
      }
    });
    console.log(`Joker Usages for ${u.name} (${u.id}):`);
    jokerUsages.forEach(p => {
      console.log(`- Match: ${p.match.homeTeam} vs ${p.match.awayTeam} | Created At: ${p.createdAt} | Updated At: ${p.updatedAt}`);
    });
  }
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
