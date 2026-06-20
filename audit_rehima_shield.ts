import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Find Ahmed Rehima
  const users = await prisma.user.findMany({
    where: { name: { contains: 'Ahmed Rehima', mode: 'insensitive' } }
  });
  const user = users[0];
  console.log(`User: ${user.name} (${user.id}) — current XP: ${user.xp}`);

  // Find the prediction
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
  console.log(`\nMatch: ${match.homeTeam} vs ${match.awayTeam}`);
  console.log(`Result: ${match.homeScore} - ${match.awayScore}`);
  console.log(`First goal scorer: ${match.firstGoalScorer ?? 'none'}`);
  console.log(`\nPrediction: ${prediction.homeScore} - ${prediction.awayScore}`);
  console.log(`First goal scorer guess: ${prediction.firstGoalScorer ?? 'none'}`);
  console.log(`Confidence: ${prediction.confidence}%`);
  console.log(`isDouble (Joker): ${prediction.isDouble}`);
  console.log(`isShield (current, broken): ${prediction.isShield}`);
  console.log(`XP earned (on record): ${prediction.xpEarned}`);
  console.log(`Prediction status: ${prediction.status}`);

  const homeScore = match.homeScore!;
  const awayScore = match.awayScore!;

  // Recalculate XP WITHOUT shield (what was applied)
  const correctResult =
    (prediction.homeScore > prediction.awayScore && homeScore > awayScore) ||
    (prediction.homeScore < prediction.awayScore && homeScore < awayScore) ||
    (prediction.homeScore === prediction.awayScore && homeScore === awayScore);
  const trueExactScore = prediction.homeScore === homeScore && prediction.awayScore === awayScore;
  const correctScorer =
    !!prediction.firstGoalScorer &&
    !!match.firstGoalScorer &&
    prediction.firstGoalScorer.trim().toLowerCase() === match.firstGoalScorer.trim().toLowerCase();

  const multiplier = 1 + ((prediction.confidence - 50) / 50);

  // WITHOUT shield
  const exactScoreWithout = trueExactScore;
  let xpWithout = correctResult ? Math.round(50 * multiplier) : 0;
  if (exactScoreWithout) xpWithout += 200;
  if (correctScorer) xpWithout += 150;
  if (!correctResult) xpWithout -= Math.round(50 * (prediction.confidence / 100));
  if (prediction.isDouble) xpWithout *= 2;

  // WITH shield
  const exactScoreWith = trueExactScore || (true && correctResult); // isShield=true
  let xpWith = correctResult ? Math.round(50 * multiplier) : 0;
  if (exactScoreWith) xpWith += 200;
  if (correctScorer) xpWith += 150;
  if (!correctResult) xpWith -= Math.round(50 * (prediction.confidence / 100));
  if (prediction.isDouble) xpWith *= 2;

  console.log(`\n--- XP Calculation ---`);
  console.log(`correctResult: ${correctResult}`);
  console.log(`trueExactScore: ${trueExactScore}`);
  console.log(`exactScore WITHOUT shield: ${exactScoreWithout}`);
  console.log(`exactScore WITH shield:    ${exactScoreWith}`);
  console.log(`XP without shield: ${xpWithout}`);
  console.log(`XP with shield:    ${xpWith}`);
  console.log(`XP difference (to add): ${xpWith - xpWithout}`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); })
