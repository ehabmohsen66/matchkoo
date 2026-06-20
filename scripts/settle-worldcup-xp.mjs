/**
 * settle-worldcup-xp.mjs
 *
 * Run with:
 *   DATABASE_URL="postgresql://..." node scripts/settle-worldcup-xp.mjs
 *
 * Or set DATABASE_URL_UNPOOLED if you need the direct (non-pooled) URL.
 *
 * This script:
 *  1. Finds all COMPLETED World Cup matches with unsettled predictions (status = null)
 *  2. Calculates XP for each prediction using the canonical XP formula
 *  3. Updates xpEarned + prediction status in the DB
 *  4. Increments user xp, streak, predictionCount, correctCount
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL || process.env.DATABASE_URL_UNPOOLED } },
});

// World Cup tournament name patterns
const WC_KEYWORDS = ["world cup", "fifa world cup"];
function isWorldCup(name) {
  return WC_KEYWORDS.some(k => name.toLowerCase().includes(k));
}

async function main() {
  console.log("🔍 Scanning for unsettled World Cup predictions...\n");

  // 1. Find all completed WC matches with unsettled predictions
  const completedMatches = await prisma.match.findMany({
    where: {
      status: "COMPLETED",
      homeScore: { not: null },
      awayScore: { not: null },
    },
    include: {
      tournament: { select: { name: true } },
      predictions: {
        where: { status: null },
        include: {
          user: {
            select: {
              id: true, name: true, email: true, xp: true,
              streak: true, bestStreak: true,
              predictionCount: true, correctCount: true,
            },
          },
        },
      },
    },
    orderBy: { matchDate: "asc" },
  });

  const wcMatches = completedMatches.filter(m => isWorldCup(m.tournament.name));
  const unsettledWcMatches = wcMatches.filter(m => m.predictions.length > 0);

  if (unsettledWcMatches.length === 0) {
    console.log("✅ No unsettled World Cup predictions found. All XP is already settled.");
    return;
  }

  console.log(`Found ${unsettledWcMatches.length} World Cup match(es) with unsettled predictions:\n`);
  for (const m of unsettledWcMatches) {
    console.log(`  ⚽ ${m.homeTeam} ${m.homeScore}–${m.awayScore} ${m.awayTeam} [${unsettledWcMatches.indexOf(m)+1}/${unsettledWcMatches.length}]`);
    console.log(`     Tournament: ${m.tournament.name}`);
    console.log(`     Unsettled predictions: ${m.predictions.length}`);
  }

  console.log("\n🔢 Settling XP...\n");

  let totalSettled = 0;

  for (const match of unsettledWcMatches) {
    const homeScore = match.homeScore;
    const awayScore = match.awayScore;

    console.log(`\n📌 ${match.homeTeam} ${homeScore}–${awayScore} ${match.awayTeam}`);

    for (const pred of match.predictions) {
      // ── 1. Determine outcome ─────────────────────────────
      const correctResult =
        (pred.homeScore > pred.awayScore  && homeScore > awayScore)  ||
        (pred.homeScore < pred.awayScore  && homeScore < awayScore)  ||
        (pred.homeScore === pred.awayScore && homeScore === awayScore);
      const trueExactScore = pred.homeScore === homeScore && pred.awayScore === awayScore;
      const exactScore     = trueExactScore || (pred.isShield && correctResult);
      const correctScorer  =
        !!pred.firstGoalScorer &&
        !!match.firstGoalScorer &&
        pred.firstGoalScorer.trim().toLowerCase() === match.firstGoalScorer.trim().toLowerCase();

      // ── 2. Base XP ───────────────────────────────────────
      let baseXp = 0;
      if (correctResult) baseXp += 50;
      if (exactScore)    baseXp += 150;
      if (correctScorer) baseXp += 150;

      // ── 3. Confidence multiplier ─────────────────────────
      const multiplier = 1 + ((pred.confidence - 50) / 50);
      let xp = Math.round(baseXp * multiplier);

      // ── 4. Penalties ─────────────────────────────────────
      if (!correctResult)                        xp -= Math.round(50 * (pred.confidence / 100));
      if (pred.firstGoalScorer && !correctScorer) xp -= 100;

      // ── 5. BTTS bonus ────────────────────────────────────
      const actualBtts = homeScore > 0 && awayScore > 0;
      if (pred.btts !== null && pred.btts !== undefined && pred.btts === actualBtts) xp += 75;

      // ── 6. Total Goals bucket bonus ──────────────────────
      const actualTotal  = homeScore + awayScore;
      const actualBucket = actualTotal >= 5 ? 5 : actualTotal;
      const predBucket   = (pred.totalGoals ?? -1) >= 5 ? 5 : (pred.totalGoals ?? -1);
      if (pred.totalGoals !== null && pred.totalGoals !== undefined && predBucket === actualBucket) xp += 75;

      // ── 7. Double joker ──────────────────────────────────
      if (pred.isDouble && xp > 0) xp *= 2;

      // ── 8. Streak ────────────────────────────────────────
      const newStreak    = correctResult ? pred.user.streak + 1 : 0;
      const newBest      = Math.max(pred.user.bestStreak, newStreak);
      const newPredCount = pred.user.predictionCount + 1;
      const newCorrect   = pred.user.correctCount + (correctResult ? 1 : 0);

      let streakBonus = 0;
      if (correctResult) {
        if (newStreak === 10)      streakBonus = 500;
        else if (newStreak === 5)  streakBonus = 150;
        else if (newStreak === 3)  streakBonus = 50;
      }
      xp += streakBonus;

      // ── 9. Persist ───────────────────────────────────────
      await prisma.prediction.update({
        where: { id: pred.id },
        data:  { xpEarned: xp, status: correctResult ? "correct" : "wrong" },
      });

      await prisma.user.update({
        where: { id: pred.userId },
        data: {
          xp:              { increment: xp },
          streak:          newStreak,
          bestStreak:      newBest,
          predictionCount: newPredCount,
          correctCount:    newCorrect,
        },
      });

      const icon = correctResult ? (exactScore ? "🎯" : "✅") : "❌";
      console.log(`  ${icon} ${pred.user.name ?? pred.userId}: predicted ${pred.homeScore}-${pred.awayScore} → ${correctResult ? "correct" : "wrong"} | XP: ${xp >= 0 ? "+" : ""}${xp}${streakBonus > 0 ? ` (incl. +${streakBonus} streak bonus 🔥)` : ""}`);

      totalSettled++;
    }
  }

  console.log(`\n✅ Done! Settled ${totalSettled} prediction(s) across ${unsettledWcMatches.length} match(es).`);
  console.log("🏆 Mini league XP rankings will now show correct scores.");
}

main()
  .catch(e => { console.error("❌ Error:", e); process.exit(1); })
  .finally(() => prisma.$disconnect());
