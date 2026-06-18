/**
 * audit_xp_drift.js — DRY RUN (read-only, changes nothing)
 *
 * Recalculates every settled prediction under current scoring rules,
 * compares with stored xpEarned, and prints a per-user impact table.
 */

require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// ── Scorer matching (mirrors src/lib/scorer-match.ts) ──────────────────
function scorerMatch(predicted, actual) {
  if (!predicted || !actual) return false;
  const p = predicted.trim().toLowerCase();
  const a = actual.trim().toLowerCase();
  if (p === a) return true;

  function matchFullVsAbbr(full, abbr) {
    const abbrWords = abbr.split(/\s+/);
    if (abbrWords.length < 2 || !abbrWords[0].endsWith('.')) return false;
    const abbrInitial = abbrWords[0].charAt(0);
    const abbrLast = abbrWords[abbrWords.length - 1];
    const fullWords = full.split(/\s+/);
    if (fullWords.length < 2) return false;
    return fullWords[0].charAt(0) === abbrInitial && fullWords[fullWords.length - 1] === abbrLast;
  }

  if (matchFullVsAbbr(p, a)) return true;
  if (matchFullVsAbbr(a, p)) return true;
  return false;
}

// ── Current scoring rules (mirrors all backend scoring blocks) ─────────
function calculateXp(pred, match) {
  const hs = match.homeScore;
  const as = match.awayScore;

  const correctResult =
    (pred.homeScore > pred.awayScore && hs > as) ||
    (pred.homeScore < pred.awayScore && hs < as) ||
    (pred.homeScore === pred.awayScore && hs === as);

  const trueExactScore = pred.homeScore === hs && pred.awayScore === as;
  const exactScore = trueExactScore || (pred.isShield && correctResult);

  const correctScorer =
    !!pred.firstGoalScorer &&
    !!match.firstGoalScorer &&
    scorerMatch(pred.firstGoalScorer, match.firstGoalScorer);

  // Confidence multiplier applies ONLY to match result outcome
  const multiplier = 1 + ((pred.confidence - 50) / 50);
  let xp = correctResult ? Math.round(50 * multiplier) : 0;

  // Flat bonuses
  if (exactScore) xp += 200;
  if (correctScorer) xp += 150;

  // Penalties
  if (!correctResult) xp -= Math.round(50 * (pred.confidence / 100));
  if (pred.firstGoalScorer && !correctScorer) xp -= 100;

  // BTTS bonus — 75 XP flat
  const actualBtts = hs > 0 && as > 0;
  if (pred.btts !== null && pred.btts !== undefined && pred.btts === actualBtts) xp += 75;

  // Total Goals bucket bonus — 75 XP flat
  const actualTotal = hs + as;
  const actualBucket = actualTotal >= 5 ? 5 : actualTotal;
  const predBucket = (pred.totalGoals ?? -1) >= 5 ? 5 : (pred.totalGoals ?? -1);
  if (pred.totalGoals !== null && pred.totalGoals !== undefined && predBucket === actualBucket) xp += 75;

  // Double joker (rewards only)
  if (pred.isDouble && xp > 0) xp *= 2;

  // NOTE: we intentionally skip streak bonuses here because those are
  // order-dependent and were correctly applied at scoring time.
  // The drift comes from the base formula, not streaks.

  return xp;
}

async function run() {
  console.log('🔍 Auditing XP drift across all settled predictions…\n');

  // Fetch all settled predictions with their match data
  const predictions = await prisma.prediction.findMany({
    where: {
      xpEarned: { not: null },
      match: { status: 'COMPLETED', homeScore: { not: null }, awayScore: { not: null } },
    },
    include: {
      user: { select: { id: true, name: true, email: true, xp: true } },
      match: { select: { id: true, homeTeam: true, awayTeam: true, homeScore: true, awayScore: true, firstGoalScorer: true } },
    },
  });

  console.log(`Found ${predictions.length} settled predictions.\n`);

  // Track per-user impact
  const userMap = new Map(); // userId -> { name, email, currentTotalXp, storedSum, recalcSum, diffs: [] }
  let totalMismatches = 0;

  for (const pred of predictions) {
    const storedXp = pred.xpEarned ?? 0;
    const recalcXp = calculateXp(pred, pred.match);

    if (!userMap.has(pred.userId)) {
      userMap.set(pred.userId, {
        name: pred.user.name || '(no name)',
        email: pred.user.email || '(no email)',
        currentTotalXp: pred.user.xp,
        storedSum: 0,
        recalcSum: 0,
        diffs: [],
      });
    }

    const u = userMap.get(pred.userId);
    u.storedSum += storedXp;
    u.recalcSum += recalcXp;

    if (storedXp !== recalcXp) {
      totalMismatches++;
      u.diffs.push({
        match: `${pred.match.homeTeam} vs ${pred.match.awayTeam}`,
        matchResult: `${pred.match.homeScore}-${pred.match.awayScore}`,
        predicted: `${pred.homeScore}-${pred.awayScore}`,
        conf: pred.confidence,
        shield: pred.isShield,
        joker: pred.isDouble,
        storedXp,
        recalcXp,
        delta: recalcXp - storedXp,
      });
    }
  }

  // Filter only affected users
  const affected = [...userMap.entries()]
    .filter(([, u]) => u.diffs.length > 0)
    .sort((a, b) => {
      const aDelta = a[1].recalcSum - a[1].storedSum;
      const bDelta = b[1].recalcSum - b[1].storedSum;
      return aDelta - bDelta; // most impacted first
    });

  if (affected.length === 0) {
    console.log('✅ No discrepancies found. All predictions match current rules.');
    return;
  }

  // ── Print summary table ──────────────────────────────────────────────
  console.log(`⚠️  ${totalMismatches} mismatched predictions across ${affected.length} users:\n`);

  console.log('┌─────────────────────────────┬──────────────────┬──────────────────┬──────────────────┬──────────────────┐');
  console.log('│ User                        │ Current Total XP │ Stored Pred Sum  │ Recalc Pred Sum  │ XP Adjustment    │');
  console.log('├─────────────────────────────┼──────────────────┼──────────────────┼──────────────────┼──────────────────┤');

  for (const [userId, u] of affected) {
    const delta = u.recalcSum - u.storedSum;
    const name = u.name.padEnd(27).slice(0, 27);
    const current = String(u.currentTotalXp).padStart(16);
    const stored = String(u.storedSum).padStart(16);
    const recalc = String(u.recalcSum).padStart(16);
    const deltaStr = (delta >= 0 ? `+${delta}` : `${delta}`).padStart(16);
    console.log(`│ ${name} │${current} │${stored} │${recalc} │${deltaStr} │`);
  }

  console.log('└─────────────────────────────┴──────────────────┴──────────────────┴──────────────────┴──────────────────┘');

  // Grand total
  const grandDelta = affected.reduce((s, [, u]) => s + (u.recalcSum - u.storedSum), 0);
  console.log(`\nGrand total XP adjustment: ${grandDelta >= 0 ? '+' : ''}${grandDelta} XP\n`);

  // ── Per-user detailed diffs ──────────────────────────────────────────
  console.log('─'.repeat(100));
  console.log('DETAILED BREAKDOWN PER USER');
  console.log('─'.repeat(100));

  for (const [userId, u] of affected) {
    const delta = u.recalcSum - u.storedSum;
    console.log(`\n👤 ${u.name} (${u.email}) — Total adjustment: ${delta >= 0 ? '+' : ''}${delta} XP`);
    console.log(`   Current total XP: ${u.currentTotalXp} → would become: ${u.currentTotalXp + delta}`);
    console.log('');

    for (const d of u.diffs) {
      const sign = d.delta >= 0 ? '+' : '';
      console.log(`   📌 ${d.match} (${d.matchResult}) — Predicted: ${d.predicted} (conf ${d.conf}%${d.shield ? ' 🛡️' : ''}${d.joker ? ' 🃏' : ''})`);
      console.log(`      Stored: ${d.storedXp} XP → Recalc: ${d.recalcXp} XP (${sign}${d.delta})`);
    }
  }
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
