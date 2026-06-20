import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const users = await prisma.user.findMany({
    where: { name: { contains: 'Ahmed Rehima', mode: 'insensitive' } }
  });
  const user = users[0];
  console.log(`User: ${user.name} (${user.id}) — current XP: ${user.xp}`);

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

  if (!prediction) { console.log('❌ Prediction not found'); return; }

  const match = prediction.match;
  const homeScore = match.homeScore!;
  const awayScore = match.awayScore!;
  const xpOnRecord = prediction.xpEarned ?? 0;

  console.log(`\nMatch: ${match.homeTeam} vs ${match.awayTeam} — Result: ${homeScore}-${awayScore}`);
  console.log(`Prediction: ${prediction.homeScore}-${prediction.awayScore} | confidence: ${prediction.confidence}%`);
  console.log(`XP on record (settled without Shield): ${xpOnRecord}`);

  // ── Re-derive original XP (without shield) ─────────────────────────────
  const correctResult =
    (prediction.homeScore > prediction.awayScore && homeScore > awayScore) ||
    (prediction.homeScore < prediction.awayScore && homeScore < awayScore) ||
    (prediction.homeScore === prediction.awayScore && homeScore === awayScore);

  const trueExactScore = prediction.homeScore === homeScore && prediction.awayScore === awayScore;
  const correctScorer =
    !!prediction.firstGoalScorer &&
    !!match.firstGoalScorer &&
    prediction.firstGoalScorer.trim().toLowerCase() === match.firstGoalScorer.trim().toLowerCase();

  const actualBtts = homeScore > 0 && awayScore > 0;
  const actualTotal = homeScore + awayScore;
  const actualBucket = actualTotal >= 5 ? 5 : actualTotal;
  const predBucket = (prediction.totalGoals ?? -1) >= 5 ? 5 : (prediction.totalGoals ?? -1);
  const multiplier = 1 + ((prediction.confidence - 50) / 50);

  function calcXp(withShield: boolean): number {
    const exactScore = trueExactScore || (withShield && correctResult);
    let xp = correctResult ? Math.round(50 * multiplier) : 0;
    if (exactScore) xp += 200;
    if (correctScorer) xp += 150;
    if (!correctResult) xp -= Math.round(50 * (prediction!.confidence / 100));
    if (prediction!.firstGoalScorer && !correctScorer) xp -= 100;
    if (prediction!.btts !== null && prediction!.btts !== undefined && prediction!.btts === actualBtts) xp += 75;
    if (prediction!.totalGoals !== null && prediction!.totalGoals !== undefined && predBucket === actualBucket) xp += 75;
    if (prediction!.isDouble && xp > 0) xp *= 2;
    // NOTE: streak bonus is NOT recalculated — it was a one-time event at settlement time
    // and is already included in xpOnRecord. We only add the Shield scoreline bonus delta.
    return xp;
  }

  const xpBaseWithout = calcXp(false);
  const xpBaseWith    = calcXp(true);
  const shieldDelta   = xpBaseWith - xpBaseWithout; // should be +200

  console.log(`\n--- XP Breakdown ---`);
  console.log(`correctResult:  ${correctResult}`);
  console.log(`trueExactScore: ${trueExactScore}`);
  console.log(`XP base WITHOUT shield: ${xpBaseWithout}`);
  console.log(`XP base WITH shield:    ${xpBaseWith}`);
  console.log(`Shield bonus delta:     +${shieldDelta}`);
  console.log(`\nCorrect XP (on record + delta): ${xpOnRecord} + ${shieldDelta} = ${xpOnRecord + shieldDelta}`);

  if (shieldDelta <= 0) {
    console.log('ℹ️  Shield makes no difference to XP here — no changes needed.');
    return;
  }

  // ── Apply correction in a transaction ───────────────────────────────────
  console.log(`\n⏳ Applying correction...`);
  const [updatedPrediction, updatedUser] = await prisma.$transaction([
    // 1. Mark isShield=true and update xpEarned to the correct value
    prisma.prediction.update({
      where: { id: prediction.id },
      data: {
        isShield: true,
        xpEarned: xpOnRecord + shieldDelta,
      }
    }),
    // 2. Increment user XP by the delta only (streak/bonuses already applied)
    prisma.user.update({
      where: { id: user.id },
      data: { xp: { increment: shieldDelta } },
      select: { id: true, name: true, xp: true }
    }),
  ]);

  console.log(`✅ Prediction updated — isShield: ${updatedPrediction.isShield}, xpEarned: ${updatedPrediction.xpEarned}`);
  console.log(`✅ User XP: ${user.xp} → ${updatedUser.xp} (+${shieldDelta})`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); })
