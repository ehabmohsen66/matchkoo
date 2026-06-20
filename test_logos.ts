import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const names = ['River Plate', 'Boca Juniors', 'Independiente', 'Racing Club', 'San Lorenzo', 'Estudiantes', 'Huracán', 'Lanus', 'Atlanta United', 'D.C. United', 'Inter Miami', 'LA Galaxy', 'Los Angeles FC', 'New York City', 'Portland Timbers', 'Seattle Sounders'];
  for (const name of names) {
    const clubs = await prisma.club.findMany({
      where: { name: { contains: name, mode: 'insensitive' } }
    });
    console.log(name, '->', clubs.map(c => ({ id: c.apiId, name: c.name, logo: c.logoUrl })));
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
