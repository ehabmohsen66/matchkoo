import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
async function main() {
  const ts = await prisma.tournament.findMany({ select: { name: true, status: true, startDate: true } });
  console.log(ts);
}
main().catch(console.error).finally(() => prisma.$disconnect())
