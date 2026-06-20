const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
async function run() {
  const users = await p.user.findMany({ where: { name: { contains: 'Ahmed Monem' } } });
  for (const u of users) {
    const cleanName = u.name.replace(/[^\p{L}\p{N}\s]/gu, '').trim();
    if (cleanName !== u.name) {
      await p.user.update({ where: { id: u.id }, data: { name: cleanName } });
      console.log(`Updated ${u.name} to ${cleanName}`);
    }
  }
}
run().catch(console.error).finally(() => p.$disconnect());
