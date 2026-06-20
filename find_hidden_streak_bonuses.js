const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function scorerMatch(predVal, actualVal) {
  if (!predVal || !actualVal) return false;
  const p = predVal.toLowerCase().replace(/[^a-z0-9]/g, '');
  const a = actualVal.toLowerCase().replace(/[^a-z0-9]/g, '');
  return p === a || p.includes(a) || a.includes(p);
}

async function main() {
  const preds = await prisma.prediction.findMany({
    where: { status: { not: null }, xpEarned: { not: null } },
    include: { match: true, user: true },
  });

  const hiddenBonusesByUser = {};

  for (const pred of preds) {
    const hs = pred.match.homeScore;
    const as = pred.match.awayScore;
    if (hs === null || as === null) continue;

    const correctResult =
      (pred.homeScore > pred.awayScore && hs > as) ||
      (pred.homeScore < pred.awayScore && hs < as) ||
      (pred.homeScore === pred.awayScore && hs === as);
    const trueExactScore = pred.homeScore === hs && pred.awayScore === as;
    const exactScore = trueExactScore || (pred.isShield && correctResult);
    const correctScorer = !!pred.firstGoalScorer && !!pred.match.firstGoalScorer &&
      scorerMatch(pred.firstGoalScorer, pred.match.firstGoalScorer);

    const multiplier = 1 + ((pred.confidence - 50) / 50);
    let baseBonusReward = correctResult ? Math.round(50 * multiplier) : 0;
    if (exactScore)    baseBonusReward += 200;
    if (correctScorer) baseBonusReward += 150;

    const actualBtts = hs > 0 && as > 0;
    if (pred.btts !== null && pred.btts !== undefined && pred.btts === actualBtts) {
      baseBonusReward += 75;
    }

    const actualTotal  = hs + as;
    const actualBucket = actualTotal >= 5 ? 5 : actualTotal;
    const predBucket   = (pred.totalGoals ?? -1) >= 5 ? 5 : (pred.totalGoals ?? -1);
    if (pred.totalGoals !== null && pred.totalGoals !== undefined && predBucket === actualBucket) {
      baseBonusReward += 75;
    }

    if (pred.isDouble && baseBonusReward > 0) {
      baseBonusReward *= 2;
    }

    let penalty = 0;
    if (!correctResult) {
      penalty += Math.round(50 * (pred.confidence / 100));
    }
    if (pred.firstGoalScorer && !correctScorer) {
      penalty += 100;
    }

    const expectedXpNoStreak = baseBonusReward - penalty;
    const actualXp = pred.xpEarned;
    const recordedStreakBonus = pred.streakBonusXp || 0;

    const hiddenBonus = actualXp - expectedXpNoStreak - recordedStreakBonus;

    // A hidden bonus is a discrepancy that aligns with the known streak bonus values.
    // Sometimes there might be a 1-2 point rounding difference, but streak bonuses are 50, 150, 500.
    if (hiddenBonus > 40 && (Math.abs(hiddenBonus - 50) < 5 || Math.abs(hiddenBonus - 150) < 5 || Math.abs(hiddenBonus - 500) < 5)) {
      if (!hiddenBonusesByUser[pred.userId]) {
        hiddenBonusesByUser[pred.userId] = {
          name: pred.user.name,
          email: pred.user.email,
          totalHiddenBonus: 0,
          matches: []
        };
      }
      // Round to nearest streak bonus (50, 150, 500) just to be clean
      let cleanHiddenBonus = 0;
      if (Math.abs(hiddenBonus - 50) < 5) cleanHiddenBonus = 50;
      else if (Math.abs(hiddenBonus - 150) < 5) cleanHiddenBonus = 150;
      else if (Math.abs(hiddenBonus - 500) < 5) cleanHiddenBonus = 500;
      else cleanHiddenBonus = hiddenBonus;

      hiddenBonusesByUser[pred.userId].totalHiddenBonus += cleanHiddenBonus;
      hiddenBonusesByUser[pred.userId].matches.push({
        match: `${pred.match.homeTeam} vs ${pred.match.awayTeam}`,
        hiddenBonus: cleanHiddenBonus,
        predictionId: pred.id
      });
    }
  }

  console.log("Users with Hidden Streak Bonuses in their Mini League Points:\n");
  console.log("| User Name | Total Hidden Bonus | Matches |");
  console.log("|---|---|---|");
  for (const userId in hiddenBonusesByUser) {
    const data = hiddenBonusesByUser[userId];
    const matchStr = data.matches.map(m => `${m.match} (+${m.hiddenBonus})`).join(", ");
    console.log(`| ${data.name} | ${data.totalHiddenBonus} | ${matchStr} |`);
  }
}

main().finally(() => prisma.$disconnect());
