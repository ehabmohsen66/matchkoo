const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function run() {
  // Find Ahmed Rehima
  const user = await p.user.findFirst({ where: { name: { contains: 'ahmed rehima', mode: 'insensitive' } } });
  if (!user) { console.log('User not found'); return; }
  console.log('Found user:', user.name, user.id);

  // Find England vs Croatia match (17 Jun 2026, result 4-2)
  const match = await p.match.findFirst({
    where: {
      homeTeam: { contains: 'England', mode: 'insensitive' },
      awayTeam: { contains: 'Croatia', mode: 'insensitive' },
    }
  });
  if (!match) { console.log('Match not found'); return; }
  console.log('Found match:', match.homeTeam, 'vs', match.awayTeam, '| ID:', match.id);
  console.log('First goalscorer in DB:', match.firstGoalScorer);

  // Find the prediction
  const pred = await p.prediction.findFirst({
    where: { userId: user.id, matchId: match.id }
  });
  if (!pred) { console.log('Prediction not found'); return; }
  console.log('Prediction:', pred);
  console.log('Current xpEarned:', pred.xpEarned);

  // Recalculate correct XP
  const homeScore = match.homeScore ?? 0;
  const awayScore = match.awayScore ?? 0;

  const correctResult =
    (pred.homeScore > pred.awayScore && homeScore > awayScore) ||
    (pred.homeScore < pred.awayScore && homeScore < awayScore) ||
    (pred.homeScore === pred.awayScore && homeScore === awayScore);

  const exactScore = pred.homeScore === homeScore && pred.awayScore === awayScore;

  // Smart scorer match
  function scorerMatch(predicted, actual) {
    const pp = predicted.trim().toLowerCase();
    const a = actual.trim().toLowerCase();
    if (pp === a) return true;
    const pLast = pp.split(/\s+/).pop();
    const aLast = a.split(/\s+/).pop();
    if (pLast === aLast) return true;
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

  const correctScorer = !!pred.firstGoalScorer && !!match.firstGoalScorer && scorerMatch(pred.firstGoalScorer, match.firstGoalScorer);
  console.log('Correct result?', correctResult, '| Exact score?', exactScore, '| Correct scorer?', correctScorer);

  const multiplier = 1 + ((pred.confidence - 50) / 50);
  let xp = correctResult ? Math.round(50 * multiplier) : 0;
  if (exactScore) xp += 200;
  if (correctScorer) xp += 150;
  if (!correctResult) xp -= Math.round(50 * (pred.confidence / 100));
  if (pred.firstGoalScorer && !correctScorer) xp -= 100;

  const actualBtts = homeScore > 0 && awayScore > 0;
  if (pred.btts !== null && pred.btts !== undefined && pred.btts === actualBtts) xp += 75;

  const actualTotal = homeScore + awayScore;
  const actualBucket = actualTotal >= 5 ? 5 : actualTotal;
  const predBucket = (pred.totalGoals ?? -1) >= 5 ? 5 : (pred.totalGoals ?? -1);
  if (pred.totalGoals !== null && pred.totalGoals !== undefined && predBucket === actualBucket) xp += 75;

  console.log('Recalculated XP:', xp, '(was:', pred.xpEarned, ')');
  const diff = xp - (pred.xpEarned ?? 0);
  console.log('XP difference to apply to user total:', diff);

  // Update prediction xpEarned
  await p.prediction.update({ where: { id: pred.id }, data: { xpEarned: xp } });

  // Update user total XP
  await p.user.update({ where: { id: user.id }, data: { xp: { increment: diff } } });

  console.log('Done! Updated prediction xpEarned to', xp, 'and adjusted user XP by', diff);
}

run().catch(console.error).finally(() => p.$disconnect());
