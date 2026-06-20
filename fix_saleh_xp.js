const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function run() {
  const user = await p.user.findFirst({ where: { name: { contains: 'Mohamed Saleh', mode: 'insensitive' } } });
  console.log('User:', user.name, '| ID:', user.id, '| XP:', user.xp);

  const match = await p.match.findFirst({
    where: {
      OR: [
        { homeTeam: { contains: 'Argentina', mode: 'insensitive' }, awayTeam: { contains: 'Algeria', mode: 'insensitive' } },
        { homeTeam: { contains: 'Algeria', mode: 'insensitive' }, awayTeam: { contains: 'Argentina', mode: 'insensitive' } },
      ]
    }
  });
  console.log('Match:', match.homeTeam, 'vs', match.awayTeam, '| ID:', match.id);
  console.log('Score:', match.homeScore, '-', match.awayScore, '| firstGoalScorer:', match.firstGoalScorer);

  const pred = await p.prediction.findFirst({ where: { userId: user.id, matchId: match.id } });
  console.log('\nFull prediction object:');
  console.log(JSON.stringify(pred, null, 2));

  // Now manually trace what the current XP breakdown should be
  const homeScore = match.homeScore ?? 0;
  const awayScore = match.awayScore ?? 0;

  function scorerMatch(predicted, actual) {
    if (!predicted || !actual) return false;
    const pp = predicted.trim().toLowerCase();
    const a = actual.trim().toLowerCase();
    if (pp === a) return true;
    const aWords = a.split(/\s+/);
    if (aWords.length >= 2 && aWords[0].endsWith('.')) {
      const aInitial = aWords[0].charAt(0);
      const aLastName = aWords[aWords.length - 1];
      const pWords = pp.split(/\s+/);
      if (pWords.length >= 2 && pWords[0].charAt(0) === aInitial && pWords[pWords.length - 1] === aLastName) return true;
    }
    const pWords = pp.split(/\s+/);
    if (pWords.length >= 2 && pWords[0].endsWith('.')) {
      const pInitial = pWords[0].charAt(0);
      const pLastName = pWords[pWords.length - 1];
      const aWords2 = a.split(/\s+/);
      if (aWords2.length >= 2 && aWords2[0].charAt(0) === pInitial && aWords2[aWords2.length - 1] === pLastName) return true;
    }
    return false;
  }

  const correctResult =
    (pred.homeScore > pred.awayScore && homeScore > awayScore) ||
    (pred.homeScore < pred.awayScore && homeScore < awayScore) ||
    (pred.homeScore === pred.awayScore && homeScore === awayScore);
  const exactScore = pred.homeScore === homeScore && pred.awayScore === awayScore;
  const correctScorer = scorerMatch(pred.firstGoalScorer, match.firstGoalScorer);
  const multiplier = 1 + ((pred.confidence - 50) / 50);

  let xp = correctResult ? Math.round(50 * multiplier) : 0;
  console.log('\n--- XP Breakdown ---');
  console.log(`Correct result: ${correctResult} → ${correctResult ? Math.round(50 * multiplier) : 0} XP`);
  if (exactScore) { console.log('Exact score: +200 XP'); xp += 200; }
  if (correctScorer) { console.log('Correct scorer: +150 XP'); xp += 150; }
  if (!correctResult) { const pen = Math.round(50 * (pred.confidence / 100)); console.log(`Wrong result penalty: -${pen} XP`); xp -= pen; }
  if (pred.firstGoalScorer && !correctScorer) { console.log('Wrong scorer penalty: -100 XP'); xp -= 100; }

  const actualBtts = homeScore > 0 && awayScore > 0;
  if (pred.btts !== null && pred.btts !== undefined) {
    if (pred.btts === actualBtts) { console.log('BTTS correct: +75 XP'); xp += 75; }
    else { console.log('BTTS wrong: 0 XP'); }
  }

  const actualTotal = homeScore + awayScore;
  const actualBucket = actualTotal >= 5 ? 5 : actualTotal;
  const predBucket = (pred.totalGoals ?? -1) >= 5 ? 5 : (pred.totalGoals ?? -1);
  if (pred.totalGoals !== null && pred.totalGoals !== undefined) {
    if (predBucket === actualBucket) { console.log('Total goals correct: +75 XP'); xp += 75; }
    else { console.log('Total goals wrong: 0 XP'); }
  }

  console.log(`\nTotal recalculated XP: ${xp}`);
  console.log(`Current stored xpEarned: ${pred.xpEarned}`);
  console.log(`Difference: ${xp - (pred.xpEarned ?? 0)}`);

  // The screenshot shows the breakdown is wrong - it applied -100 in the UI
  // But the xpEarned=223 doesn't match -27 shown. Let's see what -27 would look like
  console.log('\n--- What gives -27 (as shown in screenshot) ---');
  // +73 (correct result, 73% conf) - 100 (wrong scorer) = -27
  // That's 50 * (1 + (73-50)/50) = 50 * 1.46 = 73
  // So xpEarned would be -27 if scorer was wrong
  console.log('If scorer was wrong: 73 - 100 =', 73 - 100, 'XP');
  console.log('If scorer was right: 73 + 150 =', 73 + 150, 'XP = 223 XP ✓');
  console.log('\nConclusion: xpEarned=223 already reflects correct scorer (73+150=223)');
  console.log('The screenshot shows "Account Credited +223 XP (old rules)" - meaning it was already fixed!');
  console.log('The "-27 XP" shown is the NET display under NEW rules vs what was actually credited.');
}

run().catch(console.error).finally(() => p.$disconnect());
