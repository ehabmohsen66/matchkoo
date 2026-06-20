import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
async function main() {
  const t = await prisma.tournament.findFirst({ select: { status: true, startDate: true, endDate: true } });
  console.log(t);
}
main().catch(console.error).finally(() => prisma.$disconnect())
