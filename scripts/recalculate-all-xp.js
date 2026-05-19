/**
 * recalculate-all-xp.js
 * Recalculates xpEarned for every settled prediction using current scoring rules.
 * Adjusts User.xp by the diff (new - old) for each affected prediction.
 * Safe: only updates predictions where xpEarned would change.
 *
 * Run: node scripts/recalculate-all-xp.js [--dry-run]
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const DRY_RUN = process.argv.includes('--dry-run');

function calcXp(pred, match) {
  const hs = match.homeScore, as = match.awayScore;
  if (hs == null || as == null) return null;

  const correctResult =
    (pred.homeScore > pred.awayScore && hs > as) ||
    (pred.homeScore < pred.awayScore && hs < as) ||
    (pred.homeScore === pred.awayScore && hs === as);
  const exactScore = pred.homeScore === hs && pred.awayScore === as;
  const correctFGS = !!(pred.firstGoalScorer && match.firstGoalScorer &&
    pred.firstGoalScorer.trim().toLowerCase() === match.firstGoalScorer.trim().toLowerCase());

  const conf = pred.confidence || 50;
  const multiplier = 1 + ((conf - 50) / 50);

  let baseXp = 0;
  if (correctResult) baseXp += 50;
  if (exactScore)    baseXp += 150;
  if (pred.firstGoalScorer && correctFGS) baseXp += 100;

  let xp = Math.round(baseXp * multiplier);
  if (!correctResult) xp -= Math.round(50  * (conf / 100));
  if (pred.firstGoalScorer && !correctFGS) xp -= Math.round(100 * (conf / 100));

  // BTTS bonus
  const actualBtts = hs > 0 && as > 0;
  if (pred.btts !== null && pred.btts !== undefined && pred.btts === actualBtts) xp += 75;

  // Total Goals bonus
  const actualTotal  = hs + as;
  const actualBucket = actualTotal >= 5 ? 5 : actualTotal;
  const predBucket   = (pred.totalGoals ?? -1) >= 5 ? 5 : (pred.totalGoals ?? -1);
  if (pred.totalGoals !== null && pred.totalGoals !== undefined && predBucket === actualBucket) xp += 75;

  // Double joker (rewards only)
  if (pred.isDouble && xp > 0) xp *= 2;

  return xp;
}

async function main() {
  console.log(`\n${DRY_RUN ? '🔍 DRY RUN — no DB writes' : '✏️  LIVE RUN — will update DB'}\n`);

  const predictions = await prisma.prediction.findMany({
    where: { status: { in: ['correct', 'wrong'] } },
    include: { match: true },
  });

  console.log(`Found ${predictions.length} settled predictions\n`);

  const userDeltas = {}; // userId → net XP diff
  let changed = 0, skipped = 0;

  for (const pred of predictions) {
    if (!pred.match || pred.match.homeScore == null) { skipped++; continue; }
    const newXp = calcXp(pred, pred.match);
    if (newXp === null) { skipped++; continue; }

    const oldXp = pred.xpEarned ?? 0;
    const diff  = newXp - oldXp;

    if (diff === 0) { skipped++; continue; }

    changed++;
    console.log(`  ${pred.id.slice(0,8)} | ${pred.match.homeTeam} vs ${pred.match.awayTeam} | old=${oldXp} new=${newXp} diff=${diff > 0 ? '+' : ''}${diff}`);

    userDeltas[pred.userId] = (userDeltas[pred.userId] || 0) + diff;

    if (!DRY_RUN) {
      await prisma.prediction.update({
        where: { id: pred.id },
        data:  { xpEarned: newXp },
      });
    }
  }

  console.log(`\nSummary: ${changed} predictions recalculated, ${skipped} unchanged\n`);

  const userIds = Object.keys(userDeltas);
  if (userIds.length === 0) { console.log('No user XP changes needed.'); return; }

  console.log(`Adjusting XP for ${userIds.length} users:\n`);
  for (const userId of userIds) {
    const delta = userDeltas[userId];
    const user  = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, email: true, xp: true } });
    if (!user) continue;
    const newTotal = (user.xp || 0) + delta;
    console.log(`  ${user.email || userId.slice(0,8)} | current=${user.xp} delta=${delta > 0 ? '+' : ''}${delta} → new=${newTotal}`);
    if (!DRY_RUN) {
      await prisma.user.update({ where: { id: userId }, data: { xp: { increment: delta } } });
    }
  }

  console.log(`\n${DRY_RUN ? '✅ Dry run complete. Rerun without --dry-run to apply.' : '✅ All XP recalculated and applied.'}\n`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
