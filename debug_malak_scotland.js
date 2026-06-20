const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function scorerMatch(predVal, actualVal) {
  if (!predVal || !actualVal) return false;
  const p = predVal.toLowerCase().replace(/[^a-z0-9]/g, '');
  const a = actualVal.toLowerCase().replace(/[^a-z0-9]/g, '');
  return p === a || p.includes(a) || a.includes(p);
}

async function main() {
  // Find Malak Tera
  const user = await prisma.user.findFirst({ where: { name: { contains: 'Malak' } } });
  console.log(`User: ${user.name} (${user.id})\n`);

  // Find Scotland vs Morocco match
  const match = await prisma.match.findFirst({
    where: {
      OR: [
        { homeTeam: { contains: 'Scotland' }, awayTeam: { contains: 'Morocco' } },
        { homeTeam: { contains: 'Morocco' }, awayTeam: { contains: 'Scotland' } }
      ]
    }
  });
  console.log(`Match: ${match.homeTeam} vs ${match.awayTeam}`);
  console.log(`Actual Score: ${match.homeScore} - ${match.awayScore}`);
  console.log(`First Goalscorer: ${match.firstGoalScorer || 'N/A'}\n`);

  // Find Malak's prediction
  const pred = await prisma.prediction.findFirst({
    where: { userId: user.id, matchId: match.id }
  });

  if (!pred) { console.log("No prediction found."); return; }

  console.log(`Malak's Prediction:`);
  console.log(`  Predicted Score: ${pred.homeScore} - ${pred.awayScore}`);
  console.log(`  Confidence: ${pred.confidence}%`);
  console.log(`  First Goalscorer: ${pred.firstGoalScorer || 'N/A'}`);
  console.log(`  BTTS: ${pred.btts}`);
  console.log(`  Total Goals: ${pred.totalGoals}`);
  console.log(`  isDouble: ${pred.isDouble}`);
  console.log(`  isShield: ${pred.isShield}`);
  console.log(`  xpEarned (stored): ${pred.xpEarned}`);
  console.log(`  streakBonusXp (stored): ${pred.streakBonusXp}\n`);

  // Recalculate step by step
  const hs = match.homeScore;
  const as_ = match.awayScore;

  const correctResult =
    (pred.homeScore > pred.awayScore && hs > as_) ||
    (pred.homeScore < pred.awayScore && hs < as_) ||
    (pred.homeScore === pred.awayScore && hs === as_);
  const trueExactScore = pred.homeScore === hs && pred.awayScore === as_;
  const exactScore = trueExactScore || (pred.isShield && correctResult);
  const correctScorer = !!pred.firstGoalScorer && !!match.firstGoalScorer &&
    scorerMatch(pred.firstGoalScorer, match.firstGoalScorer);

  const multiplier = 1 + ((pred.confidence - 50) / 50);
  const resultXp = correctResult ? Math.round(50 * multiplier) : 0;

  const actualBtts = hs > 0 && as_ > 0;
  const bttsBonus = (pred.btts !== null && pred.btts !== undefined && pred.btts === actualBtts) ? 75 : 0;

  const actualTotal = hs + as_;
  const actualBucket = actualTotal >= 5 ? 5 : actualTotal;
  const predBucket = (pred.totalGoals ?? -1) >= 5 ? 5 : (pred.totalGoals ?? -1);
  const totalGoalsBonus = (pred.totalGoals !== null && pred.totalGoals !== undefined && predBucket === actualBucket) ? 75 : 0;

  const exactScoreBonus = exactScore ? 200 : 0;
  const scorerBonus = correctScorer ? 150 : 0;
  const resultPenalty = !correctResult ? Math.round(50 * (pred.confidence / 100)) : 0;
  const scorerPenalty = (pred.firstGoalScorer && !correctScorer) ? 100 : 0;

  let baseXp = resultXp + exactScoreBonus + scorerBonus + bttsBonus + totalGoalsBonus - resultPenalty - scorerPenalty;
  if (pred.isDouble && baseXp > 0) baseXp *= 2;

  const storedStreak = pred.streakBonusXp || 0;
  const totalWithStreak = baseXp + storedStreak;

  console.log(`--- XP Calculation Breakdown ---`);
  console.log(`  Correct Result: ${correctResult} → ${resultXp} XP (multiplier: ${multiplier.toFixed(2)}x at ${pred.confidence}% confidence)`);
  console.log(`  Exact Score: ${exactScore} → +${exactScoreBonus} XP`);
  console.log(`  First Goalscorer: ${correctScorer} → +${scorerBonus} XP`);
  console.log(`  BTTS (actual=${actualBtts}, pred=${pred.btts}): → +${bttsBonus} XP`);
  console.log(`  Total Goals (actual bucket=${actualBucket}, pred bucket=${predBucket}): → +${totalGoalsBonus} XP`);
  console.log(`  Result Penalty: -${resultPenalty} XP`);
  console.log(`  Scorer Penalty (picked FGS but wrong): -${scorerPenalty} XP`);
  console.log(`  Double Joker: ${pred.isDouble}`);
  console.log(``);
  console.log(`  BASE XP (no streak):    ${baseXp} XP`);
  console.log(`  + Streak Bonus:        +${storedStreak} XP`);
  console.log(`  = Total Stored xpEarned: ${totalWithStreak} XP`);
  console.log(``);
  console.log(`  Stored in DB: ${pred.xpEarned} XP  ← matches? ${pred.xpEarned === totalWithStreak ? '✅ YES' : `❌ NO (discrepancy: ${pred.xpEarned - totalWithStreak})`}`);
  console.log(``);
  console.log(`  ✅ Global XP counts:        ${pred.xpEarned} XP (250 shown on match card)`);
  console.log(`  ✅ Mini League counts:       ${(pred.xpEarned || 0) - storedStreak} XP (after streak bonus excluded)`);
}

main().finally(() => prisma.$disconnect());
