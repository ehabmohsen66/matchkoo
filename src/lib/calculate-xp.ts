/**
 * calculate-xp.ts
 *
 * Single source of truth for XP calculation.
 * Used by every backend scoring path AND tested by the audit script.
 *
 * Rules (in order):
 *  1. Correct outcome:  Math.round(50 × multiplier)   where multiplier = 1 + (conf-50)/50
 *  2. Exact scoreline bonus:  +200 XP flat  (or Shield: correct outcome but wrong score → still +200)
 *  3. First goalscorer bonus: +150 XP flat
 *  4. Wrong outcome penalty:  −Math.round(50 × conf/100)
 *  5. Wrong goalscorer penalty: −100 XP flat
 *  6. BTTS bonus:        +75 XP flat
 *  7. Total goals bonus: +75 XP flat  (bucket: ≥5 all map to 5)
 *  8. Double Joker:      ×2 if xp > 0 (rewards only, never amplifies penalties)
 *
 * NOTE: Streak bonuses are NOT included here — they are order-dependent and
 * are handled at settlement time only (never on re-calculation).
 */

import { scorerMatch } from "@/lib/scorer-match";

export interface PredictionInput {
  homeScore:       number;
  awayScore:       number;
  confidence:      number;
  isShield:        boolean;
  isDouble:        boolean;
  firstGoalScorer: string | null;
  btts:            boolean | null;
  totalGoals:      number | null;
}

export interface MatchResult {
  homeScore:       number;
  awayScore:       number;
  firstGoalScorer: string | null;
}

export interface XpBreakdown {
  correctResult:     boolean;
  trueExactScore:    boolean;
  shieldActivated:   boolean;
  exactScore:        boolean;
  correctScorer:     boolean;
  correctBtts:       boolean | null;  // null if btts was not predicted
  correctTotalGoals: boolean | null;  // null if totalGoals was not predicted
  multiplier:        number;
  outcomeXp:         number;   // contribution from outcome (positive or negative)
  exactScoreXp:      number;
  scorerXp:          number;   // positive (bonus) or negative (penalty) or 0
  bttsXp:            number;
  totalGoalsXp:      number;
  beforeDouble:      number;
  xp:                number;   // final XP (after double joker)
}

export function calculateXp(
  pred: PredictionInput,
  match: MatchResult,
): XpBreakdown {
  const hs = match.homeScore;
  const as = match.awayScore;

  // ── 1. Outcome ──────────────────────────────────────────────────────────
  const correctResult =
    (pred.homeScore > pred.awayScore && hs > as) ||
    (pred.homeScore < pred.awayScore && hs < as) ||
    (pred.homeScore === pred.awayScore && hs === as);

  // ── 2. Exact scoreline (incl. Shield) ───────────────────────────────────
  const trueExactScore  = pred.homeScore === hs && pred.awayScore === as;
  const shieldActivated = !!(pred.isShield && correctResult && !trueExactScore);
  const exactScore      = trueExactScore || shieldActivated;

  // ── 3. Goalscorer ───────────────────────────────────────────────────────
  const correctScorer =
    !!pred.firstGoalScorer &&
    !!match.firstGoalScorer &&
    scorerMatch(pred.firstGoalScorer, match.firstGoalScorer);

  // ── 4. BTTS ─────────────────────────────────────────────────────────────
  const actualBtts = hs > 0 && as > 0;
  const correctBtts =
    pred.btts !== null && pred.btts !== undefined
      ? pred.btts === actualBtts
      : null;

  // ── 5. Total goals bucket ───────────────────────────────────────────────
  const actualTotal  = hs + as;
  const actualBucket = actualTotal >= 5 ? 5 : actualTotal;
  const predBucket   = (pred.totalGoals ?? -1) >= 5 ? 5 : (pred.totalGoals ?? -1);
  const correctTotalGoals =
    pred.totalGoals !== null && pred.totalGoals !== undefined
      ? predBucket === actualBucket
      : null;

  // ── 6. XP calculation ───────────────────────────────────────────────────
  const multiplier = 1 + ((pred.confidence - 50) / 50);

  // Outcome (positive or negative)
  const outcomeXp = correctResult
    ? Math.round(50 * multiplier)
    : -Math.round(50 * (pred.confidence / 100));

  // Flat bonuses/penalties
  const exactScoreXp = exactScore ? 200 : 0;
  const scorerXp     = pred.firstGoalScorer
    ? (correctScorer ? 150 : -100)
    : 0;
  const bttsXp       = correctBtts === true ? 75 : 0;
  const totalGoalsXp = correctTotalGoals === true ? 75 : 0;

  const beforeDouble = outcomeXp + exactScoreXp + scorerXp + bttsXp + totalGoalsXp;

  // Double Joker (rewards only, never amplifies penalties)
  const xp = pred.isDouble && beforeDouble > 0
    ? beforeDouble * 2
    : beforeDouble;

  return {
    correctResult,
    trueExactScore,
    shieldActivated,
    exactScore,
    correctScorer,
    correctBtts,
    correctTotalGoals,
    multiplier,
    outcomeXp,
    exactScoreXp,
    scorerXp,
    bttsXp,
    totalGoalsXp,
    beforeDouble,
    xp,
  };
}
