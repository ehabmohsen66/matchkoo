import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // 1. Find Ahmed Rehima
  const users = await prisma.user.findMany({
    where: { name: { contains: 'Ahmed Rehima', mode: 'insensitive' } }
  });

  if (users.length === 0) { console.log('❌ User not found'); return; }
  const user = users[0];
  console.log(`✅ Found user: ${user.name} (${user.id})`);

  // 2. Find the Iraq vs Norway prediction
  const prediction = await prisma.prediction.findFirst({
    where: {
      userId: user.id,
      match: {
        AND: [
          { homeTeam: { contains: 'Iraq', mode: 'insensitive' } },
          { awayTeam: { contains: 'Norway', mode: 'insensitive' } },
        ]
      }
    },
    include: { match: true }
  });

  if (!prediction) {
    // Try reversed home/away
    const prediction2 = await prisma.prediction.findFirst({
      where: {
        userId: user.id,
        match: {
          AND: [
            { homeTeam: { contains: 'Norway', mode: 'insensitive' } },
            { awayTeam: { contains: 'Iraq', mode: 'insensitive' } },
          ]
        }
      },
      include: { match: true }
    });
    if (!prediction2) { console.log('❌ No prediction found for Iraq vs Norway'); return; }
    console.log(`✅ Match found (reversed): ${prediction2.match.homeTeam} vs ${prediction2.match.awayTeam}`);
    console.log(`   Status: ${prediction2.match.status}`);
    console.log(`   Current isShield: ${prediction2.isShield}`);

    if (prediction2.match.status !== 'UPCOMING') {
      console.log('⚠️  Match is not UPCOMING — XP may already be settled. Aborting to be safe.');
      return;
    }

    const updated = await prisma.prediction.update({
      where: { id: prediction2.id },
      data: { isShield: true }
    });
    console.log(`✅ isShield restored → ${updated.isShield} for prediction ${updated.id}`);
    return;
  }

  console.log(`✅ Match: ${prediction.match.homeTeam} vs ${prediction.match.awayTeam}`);
  console.log(`   Status: ${prediction.match.status}`);
  console.log(`   Current isShield: ${prediction.isShield}`);
  console.log(`   Prediction scores: ${prediction.homeScore} - ${prediction.awayScore}`);

  if (prediction.match.status !== 'UPCOMING') {
    console.log('⚠️  Match is not UPCOMING — XP may already be settled. Aborting to be safe.');
    return;
  }

  if (prediction.isShield === true) {
    console.log('ℹ️  isShield is already true — nothing to do.');
    return;
  }

  const updated = await prisma.prediction.update({
    where: { id: prediction.id },
    data: { isShield: true }
  });

  console.log(`✅ isShield restored → ${updated.isShield} for prediction ${updated.id}`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); })
