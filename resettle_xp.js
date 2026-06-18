/**
 * resettle_xp.js — ONE-TIME MIGRATION (applies changes to DB)
 *
 * Recalculates xpEarned for all 17 drifted predictions and adjusts
 * each user's total XP by the exact delta. Safe to re-run — idempotent
 * because it reads the current xpEarned before each update.
 */

require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// ── Scorer matching ────────────────────────────────────────────────────
function matchFullVsAbbr(full, abbr) {
  const abbrWords = abbr.split(/\s+/);
  if (abbrWords.length < 2 || !abbrWords[0].endsWith('.')) return false;
  const abbrInitial = abbrWords[0].charAt(0);
  const abbrLast = abbrWords[abbrWords.length - 1];
  const fullWords = full.split(/\s+/);
  if (fullWords.length < 2) return false;
  return fullWords[0].charAt(0) === abbrInitial && fullWords[fullWords.length - 1] === abbrLast;
}

function scorerMatch(predicted, actual) {
  if (!predicted || !actual) return false;
  const p = predicted.trim().toLowerCase();
  const a = actual.trim().toLowerCase();
  if (p === a) return true;
  if (matchFullVsAbbr(p, a)) return true;
  if (matchFullVsAbbr(a, p)) return true;
  return false;
}

// ── Canonical XP formula (mirrors src/lib/calculate-xp.ts) ─────────────
function calculateXp(pred, match) {
  const hs = match.homeScore;
  const as = match.awayScore;

  const correctResult =
    (pred.homeScore > pred.awayScore && hs > as) ||
    (pred.homeScore < pred.awayScore && hs < as) ||
    (pred.homeScore === pred.awayScore && hs === as);

  const trueExactScore  = pred.homeScore === hs && pred.awayScore === as;
  const shieldActivated = !!(pred.isShield && correctResult && !trueExactScore);
  const exactScore      = trueExactScore || shieldActivated;

  const correctScorer =
    !!pred.firstGoalScorer &&
    !!match.firstGoalScorer &&
    scorerMatch(pred.firstGoalScorer, match.firstGoalScorer);

  const multiplier = 1 + ((pred.confidence - 50) / 50);
  const outcomeXp = correctResult
    ? Math.round(50 * multiplier)
    : -Math.round(50 * (pred.confidence / 100));

  const exactScoreXp = exactScore ? 200 : 0;
  const scorerXp     = pred.firstGoalScorer ? (correctScorer ? 150 : -100) : 0;

  const actualBtts = hs > 0 && as > 0;
  const bttsXp = (pred.btts !== null && pred.btts !== undefined && pred.btts === actualBtts) ? 75 : 0;

  const actualTotal = hs + as;
  const actualBucket = actualTotal >= 5 ? 5 : actualTotal;
  const predBucket = (pred.totalGoals ?? -1) >= 5 ? 5 : (pred.totalGoals ?? -1);
  const totalGoalsXp = (pred.totalGoals !== null && pred.totalGoals !== undefined && predBucket === actualBucket) ? 75 : 0;

  const beforeDouble = outcomeXp + exactScoreXp + scorerXp + bttsXp + totalGoalsXp;
  const xp = pred.isDouble && beforeDouble > 0 ? beforeDouble * 2 : beforeDouble;

  return xp;
}

async function run() {
  console.log('🔧 Re-settling drifted XP predictions…\n');

  const predictions = await prisma.prediction.findMany({
    where: {
      xpEarned: { not: null },
      match: { status: 'COMPLETED', homeScore: { not: null }, awayScore: { not: null } },
    },
    include: {
      user: { select: { id: true, name: true, xp: true } },
      match: { select: { homeTeam: true, awayTeam: true, homeScore: true, awayScore: true, firstGoalScorer: true } },
    },
  });

  let totalUpdated = 0;
  let totalXpShift = 0;

  for (const pred of predictions) {
    const storedXp  = pred.xpEarned ?? 0;
    const recalcXp  = calculateXp(pred, pred.match);
    const delta     = recalcXp - storedXp;

    if (delta === 0) continue; // no drift — skip

    console.log(`  📌 ${pred.match.homeTeam} vs ${pred.match.awayTeam} | user: ${pred.user.name}`);
    console.log(`     stored=${storedXp}  recalc=${recalcXp}  delta=${delta >= 0 ? '+' : ''}${delta}`);

    // 1. Update prediction.xpEarned
    await prisma.prediction.update({
      where: { id: pred.id },
      data:  { xpEarned: recalcXp },
    });

    // 2. Apply delta to user.xp
    if (delta !== 0) {
      await prisma.user.update({
        where: { id: pred.userId },
        data:  { xp: { increment: delta } },
      });
    }

    totalUpdated++;
    totalXpShift += delta;
    console.log(`     ✅ Done (user.xp: ${pred.user.xp} → ${pred.user.xp + delta})\n`);
  }

  if (totalUpdated === 0) {
    console.log('✅ Nothing to fix — all predictions already match current rules.');
  } else {
    console.log(`\n✅ Re-settled ${totalUpdated} predictions. Net XP change across all users: ${totalXpShift >= 0 ? '+' : ''}${totalXpShift}`);
  }
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
