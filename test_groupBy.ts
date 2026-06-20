import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
async function main() {
  const rows = await prisma.prediction.groupBy({
    by: ["userId"],
    where: { match: { tournamentId: 'cmp5asfc6003pjs04vhotv6cd' } },
    _sum: { xpEarned: true },
    orderBy: { _sum: { xpEarned: "desc" } },
  });
  console.log(rows);
}
main().catch(console.error).finally(() => prisma.$disconnect())
