import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const names = ["Torino", "Como", "Monza", "Brescia", "Cosenza", "Como 1907", "AC Monza"];
  for (const name of names) {
    const clubs = await prisma.club.findMany({
      where: { name: { contains: name, mode: 'insensitive' } }
    });
    console.log(`Search: ${name} ->`, clubs.map(c => ({ id: c.apiId, name: c.name, logo: c.logoUrl })));
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
