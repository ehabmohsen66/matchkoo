import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import * as React from "react";
import { sendEmail } from "@/lib/email";
import MatchResultEmail from "@/emails/MatchResultEmail";
import StreakMilestoneEmail from "@/emails/StreakMilestoneEmail";
import LevelUpEmail from "@/emails/LevelUpEmail";
import {
  getFixturesByDate,
  getFixturesByLeague,
  toMatchStatus,
  LEAGUE_CONTINENT_MAP,
  type ApiFixture,
} from "@/lib/football-api";
import { scorerMatch } from "@/lib/scorer-match";

/** XP level thresholds — module-level so POST handler + upsertFixtures both use it */
const LEVELS = [
  { name: "Silver",   threshold: 3000,  next: "Gold" as string | undefined,    nextXp: 10000  as number | undefined },
  { name: "Gold",     threshold: 10000, next: "Platinum" as string | undefined, nextXp: 20000  as number | undefined },
  { name: "Platinum", threshold: 20000, next: "Legend" as string | undefined,   nextXp: 50000  as number | undefined },
  { name: "Legend",   threshold: 50000, next: undefined as string | undefined,  nextXp: undefined as number | undefined },
];


/**
 * Agreed-upon leagues — ONLY these 5 are ever synced or shown to users.
 *  39  = English Premier League
 *  140 = La Liga
 *  2   = UEFA Champions League
 *  233 = Egyptian Premier League
 *  1   = FIFA World Cup
 */
const ALLOWED_LEAGUES = new Set([39, 140, 2, 233, 1]);

/**
 * POST /api/admin/sync-fixtures
 *
 * Body options:
 *   { mode: "today" }                       → sync today only (whitelisted leagues)
 *   { mode: "week" }                        → sync today + 7 days (whitelisted leagues)
 *   { mode: "month" }                       → sync today + 30 days (whitelisted leagues)
 *   { mode: "league", leagueId: 39 }       → sync one specific allowed league (30 days)
 *   { mode: "update-live" }                 → update scores for LIVE matches
 *
 * Also callable from Vercel CRON (no session required if CRON_SECRET header matches)
 */
export async function POST(req: NextRequest) {
  // Allow admin session OR internal cron secret
  const cronSecret = req.headers.get("x-cron-secret");
  const isValidCron = cronSecret && cronSecret === process.env.CRON_SECRET;

  if (!isValidCron) {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const body = await req.json().catch(() => ({ mode: "today" }));
  const { mode = "today", leagueId } = body;

  try {
    let fixtures: ApiFixture[] = [];
    const today = new Date().toISOString().split("T")[0];

    if (mode === "today") {
      const raw = await getFixturesByDate(today, today);
      fixtures = raw.filter(f => ALLOWED_LEAGUES.has(f.league.id));
    } else if (mode === "week") {
      const to = new Date();
      to.setDate(to.getDate() + 7);
      const raw = await getFixturesByDate(today, to.toISOString().split("T")[0]);
      fixtures = raw.filter(f => ALLOWED_LEAGUES.has(f.league.id));
    } else if (mode === "month") {
      const to = new Date();
      to.setDate(to.getDate() + 30);
      const raw = await getFixturesByDate(today, to.toISOString().split("T")[0]);
      fixtures = raw.filter(f => ALLOWED_LEAGUES.has(f.league.id));
    } else if (mode === "league" && leagueId) {
      const lid = Number(leagueId);
      if (!ALLOWED_LEAGUES.has(lid)) {
        return NextResponse.json({ error: `League ${lid} is not in the allowed list` }, { status: 400 });
      }
      fixtures = await getFixturesByLeague(lid, new Date().getFullYear(), 30);
    } else if (mode === "update-live") {
      const liveRes = await fetch("https://v3.football.api-sports.io/fixtures?live=all", {
        headers: { "x-apisports-key": process.env.FOOTBALL_API_KEY! },
      });
      const liveData = await liveRes.json();
      fixtures = (liveData.response ?? []).filter((f: any) => ALLOWED_LEAGUES.has(f.league.id));

      // ── Recently-finished sweep ───────────────────────────────────────────
      // ?live=all only returns CURRENTLY live matches. Once a match ends it
      // disappears from that endpoint, so the XP engine in upsertFixtures
      // never sees the COMPLETED transition. Fix: find any DB matches still
      // marked LIVE that aren't in the live API response, then re-fetch them
      // by fixture ID to get their final score + status.
      const liveFixtureExternalIds = new Set(
        fixtures.map((f: ApiFixture) => `apif-${f.fixture.id}`)
      );

      const dbLiveMatches = await prisma.match.findMany({
        where: {
          status: "LIVE",
          externalId: { startsWith: "apif-" },
        },
        select: { id: true, externalId: true },
      });

      // Matches that are LIVE in DB but gone from the live feed → just finished
      const justFinished = dbLiveMatches.filter(
        (m) => !liveFixtureExternalIds.has(m.externalId ?? "")
      );

      if (justFinished.length > 0) {
        const ids = justFinished
          .map((m) => (m.externalId ?? "").replace("apif-", ""))
          .filter(Boolean)
          .join(",");

        console.log(`[sync] Re-fetching ${justFinished.length} recently-finished match(es): ${ids}`);

        const finishedRes = await fetch(
          `https://v3.football.api-sports.io/fixtures?ids=${ids}`,
          { headers: { "x-apisports-key": process.env.FOOTBALL_API_KEY! } }
        );
        const finishedData = await finishedRes.json();
        const finishedFixtures = (finishedData.response ?? []).filter(
          (f: any) => ALLOWED_LEAGUES.has(f.league.id)
        );

        // Merge into the fixtures list so upsertFixtures processes them and
        // fires the XP engine when it sees the LIVE → COMPLETED transition.
        fixtures = [...fixtures, ...finishedFixtures];
      }
      // ─────────────────────────────────────────────────────────────────────
    } else if (mode === "fix-stale") {
      // Find all matches stuck in LIVE or UPCOMING past their match date
      const stale = await prisma.match.findMany({
        where: {
          status: { in: ["LIVE", "UPCOMING"] },
          matchDate: { lt: new Date(new Date().setHours(0, 0, 0, 0)) }, // before today midnight
          externalId: { startsWith: "apif-" },
        },
        select: { id: true, externalId: true },
      });

      if (stale.length === 0) {
        return NextResponse.json({ success: true, message: "No stale matches found", fixed: 0 });
      }

      // Re-fetch each stale match from the API and update its real status
      const fixtureIds = stale.map(m => (m.externalId ?? "").replace("apif-", "")).filter(Boolean).join(",");
      const res = await fetch(
        `https://v3.football.api-sports.io/fixtures?ids=${fixtureIds}`,
        { headers: { "x-apisports-key": process.env.FOOTBALL_API_KEY! } }
      );
      const data = await res.json();
      fixtures = (data.response ?? []).filter((f: any) => ALLOWED_LEAGUES.has(f.league.id));

      // For anything the API didn't return, force-mark as COMPLETED directly
      const returnedIds = new Set(fixtures.map((f: ApiFixture) => `apif-${f.fixture.id}`));
      const missingStale = stale.filter(m => !returnedIds.has(m.externalId ?? ""));
      if (missingStale.length > 0) {
        await prisma.match.updateMany({
          where: { id: { in: missingStale.map(m => m.id) } },
          data: { status: "COMPLETED" },
        });
      }
    }

    // Always close stale LIVE/UPCOMING from previous days on any sync mode
    // AND run the XP+email engine for any predictions on those matches
    if (["today", "week", "month", "update-live"].includes(mode)) {
      const staleMatches = await prisma.match.findMany({
        where: {
          status: { in: ["LIVE", "UPCOMING"] },
          matchDate: { lt: new Date(new Date().setHours(0, 0, 0, 0)) },
        },
        select: { id: true, homeTeam: true, awayTeam: true, homeScore: true, awayScore: true, firstGoalScorer: true },
      });

      if (staleMatches.length > 0) {
        // Close status
        await prisma.match.updateMany({
          where: { id: { in: staleMatches.map(m => m.id) } },
          data: { status: "COMPLETED" },
        });
        console.log(`[sync] Auto-closed ${staleMatches.length} stale LIVE/UPCOMING matches from previous days`);

        // Run XP + email engine for unsettled predictions on these matches
        for (const staleMatch of staleMatches) {
          if (staleMatch.homeScore === null || staleMatch.awayScore === null) continue;
          const unsettledPreds = await prisma.prediction.findMany({
            where: { matchId: staleMatch.id, status: { equals: null } },
            include: { user: { select: { id: true, email: true, name: true, xp: true, streak: true, bestStreak: true, predictionCount: true, correctCount: true } } },
          });
          for (const pred of unsettledPreds) {
            const hs = staleMatch.homeScore!, as = staleMatch.awayScore!;
            const correctResult =
              (pred.homeScore > pred.awayScore && hs > as) ||
              (pred.homeScore < pred.awayScore && hs < as) ||
              (pred.homeScore === pred.awayScore && hs === as);
            const trueExactScore = pred.homeScore === hs && pred.awayScore === as;
            const exactScore = trueExactScore || (pred.isShield && correctResult);
            const correctScorer = !!pred.firstGoalScorer && !!staleMatch.firstGoalScorer &&
              scorerMatch(pred.firstGoalScorer, staleMatch.firstGoalScorer);

            // Confidence multiplier applies ONLY to match result outcome
            const multiplier = 1 + ((pred.confidence - 50) / 50);
            let xp = correctResult ? Math.round(50 * multiplier) : 0;
            if (exactScore)    xp += 200;  // flat, no multiplier
            if (correctScorer) xp += 150;  // flat, no multiplier

            // Confidence Penalty
            if (!correctResult) xp -= Math.round(50  * (pred.confidence / 100));
            if (pred.firstGoalScorer && !correctScorer) xp -= 100;

            // BTTS bonus — 75 XP flat
            const actualBtts2 = hs > 0 && as > 0;
            if (pred.btts !== null && pred.btts !== undefined && pred.btts === actualBtts2) xp += 75;

            // Total Goals bucket bonus — 75 XP flat
            const actualTotal2  = hs + as;
            const actualBucket2 = actualTotal2 >= 5 ? 5 : actualTotal2;
            const predBucket2   = (pred.totalGoals ?? -1) >= 5 ? 5 : (pred.totalGoals ?? -1);
            if (pred.totalGoals !== null && pred.totalGoals !== undefined && predBucket2 === actualBucket2) xp += 75;

            // Double joker applies to rewards only, not penalties
            if (pred.isDouble && xp > 0) xp *= 2;

            const newStreak = correctResult ? pred.user.streak + 1 : 0;
            const newBest   = Math.max(pred.user.bestStreak, newStreak);
            const newPredCount = pred.user.predictionCount + 1;
            const newCorrect   = pred.user.correctCount + (correctResult ? 1 : 0);
            let streakBonus = 0;
            if (correctResult) {
              if (newStreak === 10) streakBonus = 500;
              else if (newStreak === 5) streakBonus = 150;
              else if (newStreak === 3) streakBonus = 50;
            }
            xp += streakBonus;

            await prisma.prediction.update({
              where: { id: pred.id },
              data: { xpEarned: xp, status: correctResult ? "correct" : "wrong" },
            });
            const oldXp = pred.user.xp ?? 0;
            const updatedUser = await prisma.user.update({
              where: { id: pred.userId },
              data: {
                xp:              { increment: xp },
                streak:          newStreak,
                bestStreak:      newBest,
                predictionCount: newPredCount,
                correctCount:    newCorrect,
              },
              select: { email: true, name: true, xp: true },
            });

            if (updatedUser.email) {
              sendEmail({
                to: updatedUser.email,
                subject: exactScore
                  ? `🎯 Perfect call! ${staleMatch.homeTeam} ${hs}–${as} ${staleMatch.awayTeam}`
                  : correctResult
                  ? `✅ Result correct! ${staleMatch.homeTeam} vs ${staleMatch.awayTeam}`
                  : `⚽ Match result: ${staleMatch.homeTeam} ${hs}–${as} ${staleMatch.awayTeam}`,
                react: React.createElement(MatchResultEmail, {
                  name: updatedUser.name ?? "there",
                  homeTeam: staleMatch.homeTeam,
                  awayTeam: staleMatch.awayTeam,
                  actualScore: `${hs} – ${as}`,
                  predictedScore: `${pred.homeScore} – ${pred.awayScore}`,
                  resultCorrect: correctResult,
                  scoreCorrect: exactScore,
                  xpEarned: xp,
                  newTotalXp: updatedUser.xp,
                  firstGoalScorer: pred.firstGoalScorer ?? undefined,
                  scorerCorrect: correctScorer || undefined,
                }),
              }).catch((err) => console.error(`[email] Failed to send stale-close result email to ${updatedUser.email}:`, err));

              // Streak milestone email
              if (correctResult && [3, 5, 10].includes(newStreak) && streakBonus > 0) {
                sendEmail({
                  to: updatedUser.email,
                  subject: `🔥 ${newStreak}-game streak! +${streakBonus} XP bonus earned`,
                  react: React.createElement(StreakMilestoneEmail, {
                    name: updatedUser.name ?? "there",
                    streak: newStreak,
                    bonusXp: streakBonus,
                    newTotalXp: updatedUser.xp,
                  }),
                }).catch((err) => console.error(`[email] Failed to send streak email to ${updatedUser.email}:`, err));
              }

              // Level-up email
              const levelUp = LEVELS.find(l => oldXp < l.threshold && updatedUser.xp >= l.threshold);
              if (levelUp) {
                sendEmail({
                  to: updatedUser.email,
                  subject: `${levelUp.name === "Legend" ? "👑" : levelUp.name === "Platinum" ? "💎" : levelUp.name === "Gold" ? "🥇" : "🥈"} You've reached ${levelUp.name} on Matchkoo!`,
                  react: React.createElement(LevelUpEmail, {
                    name: updatedUser.name ?? "there",
                    newLevel: levelUp.name,
                    newTotalXp: updatedUser.xp,
                    nextLevel: levelUp.next,
                    nextLevelXp: levelUp.nextXp,
                  }),
                }).catch((err) => console.error(`[email] Failed to send level-up email to ${updatedUser.email}:`, err));
              }
            }
          }
        }
      }
    }

    // ── Unsettled-Prediction Sweep ────────────────────────────────────────────
    // Runs every 30 min (at :00 and :30 of each hour) to settle predictions for
    // COMPLETED matches that were missed by the LIVE→COMPLETED transition.
    // Live score updates still happen every 2 min — only the heavy XP settlement
    // is throttled to reduce DB load.
    const sweepMinute = new Date().getMinutes();
    const shouldRunSweep = sweepMinute < 2 || (sweepMinute >= 30 && sweepMinute < 32);
    if (mode === "update-live" && shouldRunSweep) {

      const completedWithUnsettled = await prisma.match.findMany({
        where: {
          status: "COMPLETED",
          homeScore: { not: null },
          awayScore: { not: null },
          predictions: { some: { status: null } },
        },
        select: {
          id: true, homeTeam: true, awayTeam: true,
          homeScore: true, awayScore: true, firstGoalScorer: true,
        },
        take: 10, // cap per run to stay within 10s Vercel function timeout
      });

      for (const match of completedWithUnsettled) {
        const hs = match.homeScore!, as = match.awayScore!;
        const unsettled = await prisma.prediction.findMany({
          where: { matchId: match.id, status: null },
          include: { user: { select: { id: true, email: true, name: true, xp: true, streak: true, bestStreak: true, predictionCount: true, correctCount: true } } },
        });

        console.log(`[unsettled-sweep] Settling ${unsettled.length} predictions for ${match.homeTeam} ${hs}–${as} ${match.awayTeam}`);

        for (const pred of unsettled) {
          const correctResult =
            (pred.homeScore > pred.awayScore && hs > as) ||
            (pred.homeScore < pred.awayScore && hs < as) ||
            (pred.homeScore === pred.awayScore && hs === as);
          const trueExactScore = pred.homeScore === hs && pred.awayScore === as;
          const exactScore = trueExactScore || (pred.isShield && correctResult);
          const correctScorer = !!pred.firstGoalScorer && !!match.firstGoalScorer &&
            scorerMatch(pred.firstGoalScorer, match.firstGoalScorer);

          const multiplier = 1 + ((pred.confidence - 50) / 50);
          let xp = correctResult ? Math.round(50 * multiplier) : 0;
          if (exactScore)    xp += 200;
          if (correctScorer) xp += 150;
          if (!correctResult) xp -= Math.round(50 * (pred.confidence / 100));
          if (pred.firstGoalScorer && !correctScorer) xp -= 100;

          const actualBtts = hs > 0 && as > 0;
          if (pred.btts !== null && pred.btts !== undefined && pred.btts === actualBtts) xp += 75;
          const actualTotal = hs + as;
          const actualBucket = actualTotal >= 5 ? 5 : actualTotal;
          const predBucket = (pred.totalGoals ?? -1) >= 5 ? 5 : (pred.totalGoals ?? -1);
          if (pred.totalGoals !== null && pred.totalGoals !== undefined && predBucket === actualBucket) xp += 75;
          if (pred.isDouble && xp > 0) xp *= 2;

          const newStreak = correctResult ? pred.user.streak + 1 : 0;
          const newBest   = Math.max(pred.user.bestStreak, newStreak);
          const newPredCount = pred.user.predictionCount + 1;
          const newCorrect   = pred.user.correctCount + (correctResult ? 1 : 0);
          let streakBonus = 0;
          if (correctResult) {
            if (newStreak === 10) streakBonus = 500;
            else if (newStreak === 5) streakBonus = 150;
            else if (newStreak === 3) streakBonus = 50;
          }
          xp += streakBonus;

          await prisma.prediction.update({
            where: { id: pred.id },
            data: { xpEarned: xp, status: correctResult ? "correct" : "wrong" },
          });

          const oldXp = pred.user.xp ?? 0;
          const updatedUser = await prisma.user.update({
            where: { id: pred.userId },
            data: {
              xp:              { increment: xp },
              streak:          newStreak,
              bestStreak:      newBest,
              predictionCount: newPredCount,
              correctCount:    newCorrect,
            },
            select: { email: true, name: true, xp: true },
          });

          // Send result email
          if (updatedUser.email && !pred.emailSent) {
            await new Promise(r => setTimeout(r, 300));
            const emailResult = await sendEmail({
              to: updatedUser.email,
              subject: exactScore
                ? `🎯 Perfect call! ${match.homeTeam} ${hs}–${as} ${match.awayTeam}`
                : correctResult
                ? `✅ Result correct! ${match.homeTeam} vs ${match.awayTeam}`
                : `⚽ Match result: ${match.homeTeam} ${hs}–${as} ${match.awayTeam}`,
              react: React.createElement(MatchResultEmail, {
                name:           updatedUser.name ?? "there",
                homeTeam:       match.homeTeam,
                awayTeam:       match.awayTeam,
                actualScore:    `${hs} – ${as}`,
                predictedScore: `${pred.homeScore} – ${pred.awayScore}`,
                resultCorrect:  correctResult,
                scoreCorrect:   exactScore,
                xpEarned:       xp,
                newTotalXp:     updatedUser.xp,
                firstGoalScorer: pred.firstGoalScorer ?? undefined,
                scorerCorrect:   correctScorer || undefined,
              }),
            }).catch(err => { console.error(`[unsettled-sweep] Email failed for ${updatedUser.email}:`, err); return null; });
            if (emailResult && (emailResult as any).success !== false) {
              await prisma.prediction.update({ where: { id: pred.id }, data: { emailSent: true } });
            }
            // Streak milestone email
            if (correctResult && [3, 5, 10].includes(newStreak) && streakBonus > 0) {
              sendEmail({
                to: updatedUser.email,
                subject: `🔥 ${newStreak}-game streak! +${streakBonus} XP bonus earned`,
                react: React.createElement(StreakMilestoneEmail, {
                  name: updatedUser.name ?? "there",
                  streak: newStreak,
                  bonusXp: streakBonus,
                  newTotalXp: updatedUser.xp,
                }),
              }).catch(err => console.error(`[unsettled-sweep] Streak email failed:`, err));
            }
            // Level-up email
            const levelUp = LEVELS.find(l => oldXp < l.threshold && updatedUser.xp >= l.threshold);
            if (levelUp) {
              sendEmail({
                to: updatedUser.email,
                subject: `${levelUp.name === "Legend" ? "👑" : levelUp.name === "Platinum" ? "💎" : levelUp.name === "Gold" ? "🥇" : "🥈"} You've reached ${levelUp.name} on Matchkoo!`,
                react: React.createElement(LevelUpEmail, {
                  name: updatedUser.name ?? "there",
                  newLevel: levelUp.name,
                  newTotalXp: updatedUser.xp,
                  nextLevel: levelUp.next,
                  nextLevelXp: levelUp.nextXp,
                }),
              }).catch(err => console.error(`[unsettled-sweep] Level-up email failed:`, err));
            }
          }
        }
      }
    }
    // ─────────────────────────────────────────────────────────────────────────

    // ── Email Retry Sweep: re-send result emails that failed on first attempt ──
    // Runs on every update-live cycle. Finds settled predictions where emailSent
    // is still false (email failed or was skipped) and re-attempts delivery.
    if (mode === "update-live") {

      const unsentPreds = await prisma.prediction.findMany({
        where: { emailSent: false, status: { not: null }, xpEarned: { not: null } },
        include: {
          user:  { select: { email: true, name: true, xp: true } },
          match: { select: { homeTeam: true, awayTeam: true, homeScore: true, awayScore: true } },
        },
        take: 20, // cap per run to avoid timeouts
      });

      for (const pred of unsentPreds) {
        const m = pred.match;
        if (!pred.user.email || m.homeScore === null || m.awayScore === null) continue;

        const hs = m.homeScore!, as_ = m.awayScore!;
        const correctResult =
          (pred.homeScore > pred.awayScore && hs > as_) ||
          (pred.homeScore < pred.awayScore && hs < as_) ||
          (pred.homeScore === pred.awayScore && hs === as_);
        const exactScore = pred.homeScore === hs && pred.awayScore === as_;

        await new Promise(r => setTimeout(r, 300)); // stagger
        const emailResult = await sendEmail({
          to: pred.user.email,
          subject: exactScore
            ? `🎯 Perfect call! ${m.homeTeam} ${hs}–${as_} ${m.awayTeam}`
            : correctResult
            ? `✅ Result correct! ${m.homeTeam} vs ${m.awayTeam}`
            : `⚽ Match result: ${m.homeTeam} ${hs}–${as_} ${m.awayTeam}`,
          react: React.createElement(MatchResultEmail, {
            name:           pred.user.name ?? "there",
            homeTeam:       m.homeTeam,
            awayTeam:       m.awayTeam,
            actualScore:    `${hs} – ${as_}`,
            predictedScore: `${pred.homeScore} – ${pred.awayScore}`,
            resultCorrect:  correctResult,
            scoreCorrect:   exactScore,
            xpEarned:       pred.xpEarned ?? 0,
            newTotalXp:     pred.user.xp,
            firstGoalScorer: pred.firstGoalScorer ?? undefined,
          }),
        }).catch((err) => { console.error(`[email-retry] Failed for ${pred.user.email}:`, err); return null; });

        if (emailResult) {
          await prisma.prediction.update({ where: { id: pred.id }, data: { emailSent: true } });
          console.log(`[email-retry] Sent result email to ${pred.user.email} for ${m.homeTeam} vs ${m.awayTeam}`);
        }
      }
    }

    const results = await upsertFixtures(fixtures);
    return NextResponse.json({ success: true, ...results });
  } catch (err: any) {
    console.error("Sync error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/** GET /api/admin/sync-fixtures — see sync status */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const total = await prisma.match.count();
  const upcoming = await prisma.match.count({ where: { status: "UPCOMING" } });
  const live = await prisma.match.count({ where: { status: "LIVE" } });
  const completed = await prisma.match.count({ where: { status: "COMPLETED" } });
  const lastAdded = await prisma.match.findFirst({ orderBy: { createdAt: "desc" }, select: { createdAt: true } });

  return NextResponse.json({ total, upcoming, live, completed, lastSync: lastAdded?.createdAt });
}

/** Upsert fixtures into the DB */
async function upsertFixtures(fixtures: ApiFixture[]) {
  let created = 0, updated = 0, skipped = 0;

  // Pre-fetch admin once — avoids N+1 inside the fixture loop
  const admin = await prisma.user.findFirst({ where: { role: "ADMIN" } });

  // Level thresholds are defined at module level (above)

  for (const f of fixtures) {
    const externalId = `apif-${f.fixture.id}`;
    const status = toMatchStatus(f.fixture.status.short);
    const matchDate = new Date(f.fixture.date);
    const homeScore = f.goals.home ?? (status === "UPCOMING" ? null : 0);
    const awayScore = f.goals.away ?? (status === "UPCOMING" ? null : 0);
    const round = f.league.round || "Round";

    // Canonical league names — API returns generic names like "Premier League" for multiple countries.
    // We override with unambiguous names so backend_api.js can match them correctly.
    const CANONICAL_NAMES: Record<number, string> = {
      39:  "English Premier League",
      140: "La Liga",
      2:   "UEFA Champions League",
      233: "Egyptian Premier League",
      1:   "FIFA World Cup",
    };
    const leagueName = CANONICAL_NAMES[f.league.id] || f.league.name;
    const tournamentName = `${leagueName} ${f.league.season} [${f.league.id}]`;

    // Find or create a tournament for this league+season
    let tournament = await prisma.tournament.findFirst({
      where: { name: tournamentName },
    });

    if (!tournament) {
      // Use pre-fetched admin
      if (!admin) { skipped++; continue; }

      const seasonStr = f.league.season.toString();
      tournament = await prisma.tournament.create({
        data: {
          name: tournamentName,
          game: "Football",
          type: f.league.id === 2 || f.league.id === 3 || f.league.id === 848 ? "Cup" : "League",
          description: `${f.league.country} · Season ${f.league.season}`,
          prizePool: "TBD",
          maxPlayers: 10000,
          startDate: matchDate,
          status: "ONGOING",
          registrationMode: "OPEN",
          season: seasonStr,
          createdByUserId: admin.id,
        },
      });

      // ── Auto-register returning users from previous season ──────────
      const prevSeason = (f.league.season - 1).toString();
      const prevTournament = await prisma.tournament.findFirst({
        where: {
          name: { contains: `[${f.league.id}]` },
          season: prevSeason,
          registrationMode: "OPEN",
        },
        select: { id: true },
      });
      if (prevTournament) {
        const prevRegs = await prisma.registration.findMany({
          where: { tournamentId: prevTournament.id },
          select: { userId: true },
        });
        if (prevRegs.length > 0) {
          const newRegs = prevRegs.map(r => ({
            userId: r.userId,
            tournamentId: tournament!.id,
          }));
          await prisma.registration.createMany({ data: newRegs, skipDuplicates: true });
          console.log(`[sync] Auto-registered ${prevRegs.length} users from season ${prevSeason} → ${seasonStr} for league ${f.league.id}`);
        }
      }
    }

    // Upsert match by externalId
    const existing = await prisma.match.findFirst({ where: { externalId } });

    const matchData = {
      externalId,
      homeTeam: f.teams.home.name,
      awayTeam: f.teams.away.name,
      homeLogo: f.teams.home.logo || null,
      awayLogo: f.teams.away.logo || null,
      matchDate,
      status,
      round,
      season: f.league.season.toString(),
      homeScore: status !== "UPCOMING" ? homeScore : null,
      awayScore: status !== "UPCOMING" ? awayScore : null,
      tournamentId: tournament.id,
    };

    if (existing) {
      await prisma.match.update({ where: { id: existing.id }, data: matchData });
      
      // ── XP Engine: fires when match transitions to COMPLETED ──────────────
      if (status === "COMPLETED" && existing.status !== "COMPLETED" && homeScore !== null && awayScore !== null) {

        // ── Auto-derive firstGoalScorer from API events ───────────────────
        let derivedScorer: string | null = existing.firstGoalScorer ?? null;
        if (!derivedScorer && externalId.startsWith("apif-")) {
          try {
            const fixtureId = externalId.replace("apif-", "");
            const eventsRes = await fetch(
              `https://v3.football.api-sports.io/fixtures/events?fixture=${fixtureId}`,
              { headers: { "x-apisports-key": process.env.FOOTBALL_API_KEY! } }
            );
            const eventsData = await eventsRes.json();
            const firstGoalEvent = (eventsData.response ?? []).find(
              (e: any) => e.type === "Goal" && e.detail !== "Own Goal"
            );
            if (firstGoalEvent?.player?.name) {
              derivedScorer = firstGoalEvent.player.name;
              await prisma.match.update({
                where: { id: existing.id },
                data: { firstGoalScorer: derivedScorer },
              });
              console.log(`[sync] Auto-set firstGoalScorer for ${existing.id}: ${derivedScorer}`);
            }
          } catch (e) {
            console.error(`[sync] Failed to fetch events for ${externalId}:`, e);
          }
        }

        const predictions = await prisma.prediction.findMany({
          where: {
            matchId: existing.id,
            status: null, // only unsettled — admin PATCH may have already processed some
          },
          include: { user: { select: { id: true, xp: true, streak: true, bestStreak: true, predictionCount: true, correctCount: true } } },
        });

        for (const pred of predictions) {
// ── 1. Determine outcome ─────────────────────────────────────────
          const correctResult =
            (pred.homeScore > pred.awayScore  && homeScore > awayScore)  ||
            (pred.homeScore < pred.awayScore  && homeScore < awayScore)  ||
            (pred.homeScore === pred.awayScore && homeScore === awayScore);
          const trueExactScore = pred.homeScore === homeScore && pred.awayScore === awayScore;
          const exactScore    = trueExactScore || (pred.isShield && correctResult);
          const correctScorer = !!pred.firstGoalScorer &&
            !!derivedScorer && scorerMatch(pred.firstGoalScorer, derivedScorer);

          const predStatus = correctResult ? "correct" : "wrong";

          // ── 2. BTTS (Both Teams to Score) — 75 XP flat, no confidence multiplier ─
          const actualBtts = homeScore > 0 && awayScore > 0;
          const correctBtts = pred.btts !== null && pred.btts !== undefined && pred.btts === actualBtts;

          // ── 3. Total Goals bucket — 75 XP flat ───────────────────────────────
          const actualTotal = homeScore + awayScore;
          const actualBucket = actualTotal >= 5 ? 5 : actualTotal; // 5+ bucket = 5
          const predBucket   = (pred.totalGoals ?? -1) >= 5 ? 5 : (pred.totalGoals ?? -1);
          const correctTotalGoals = pred.totalGoals !== null && pred.totalGoals !== undefined && predBucket === actualBucket;

          // ── 4. Confidence multiplier applies ONLY to match result outcome ──────
          const multiplier = 1 + ((pred.confidence - 50) / 50);
          let xp = correctResult ? Math.round(50 * multiplier) : 0;
          if (exactScore)        xp += 200;  // flat, no multiplier
          if (correctScorer)     xp += 150;  // flat, no multiplier

          // ── 6. Confidence Penalty (Risk vs Reward) ───────────────────────────
          if (!correctResult) xp -= Math.round(50  * (pred.confidence / 100));
          if (pred.firstGoalScorer && !correctScorer) xp -= 100;

          // ── 7. Bonus predictions (flat, no confidence multiplier/penalty) ────
          if (correctBtts)       xp += 75;
          if (correctTotalGoals) xp += 75;

          // ── 8. Double marker (rewards only, never amplifies penalties) ────────
          if (pred.isDouble && xp > 0) xp *= 2;

          // ── 9. Streak update ─────────────────────────────────────────────────
          const newStreak    = correctResult ? pred.user.streak + 1 : 0;
          const newBest      = Math.max(pred.user.bestStreak, newStreak);
          const newPredCount = pred.user.predictionCount + 1;
          const newCorrect   = pred.user.correctCount + (correctResult ? 1 : 0);

          // Streak bonus XP (awarded on top of penalty-adjusted XP)
          let streakBonus = 0;
          if (correctResult) {
            if (newStreak === 10) streakBonus = 500;
            else if (newStreak === 5) streakBonus = 150;
            else if (newStreak === 3) streakBonus = 50;
          }
          xp += streakBonus;

          // ── 6. Persist prediction ────────────────────────────────────────
          await prisma.prediction.update({
            where: { id: pred.id },
            data:  { xpEarned: xp, status: predStatus },
          });

          // ── 7. Persist user XP + stats ───────────────────────────────────
          const oldXp = pred.user.xp ?? 0; // capture before increment
          const updatedUser = await prisma.user.update({
            where: { id: pred.userId },
            data: {
              xp:              { increment: xp },
              streak:          newStreak,
              bestStreak:      newBest,
              predictionCount: newPredCount,
              correctCount:    newCorrect,
            },
            select: { email: true, name: true, xp: true },
          });

          // ── 8. Send match result email (guarded by emailSent to prevent duplicates) ──
          if (updatedUser.email && !pred.emailSent) {
            // Small stagger to avoid Resend rate-limit when many matches complete at once
            await new Promise(r => setTimeout(r, 400));
            const emailResult = await sendEmail({
              to: updatedUser.email,
              subject: exactScore
                ? `🎯 Perfect call! ${existing.homeTeam} ${homeScore}–${awayScore} ${existing.awayTeam}`
                : correctResult
                ? `✅ Result correct! ${existing.homeTeam} vs ${existing.awayTeam}`
                : `⚽ Match result: ${existing.homeTeam} ${homeScore}–${awayScore} ${existing.awayTeam}`,
              react: React.createElement(MatchResultEmail, {
                name:          updatedUser.name ?? "there",
                homeTeam:      existing.homeTeam,
                awayTeam:      existing.awayTeam,
                actualScore:   `${homeScore} – ${awayScore}`,
                predictedScore:`${pred.homeScore} – ${pred.awayScore}`,
                resultCorrect: correctResult,
                scoreCorrect:  exactScore,
                xpEarned:      xp,
                newTotalXp:    updatedUser.xp,
                firstGoalScorer: pred.firstGoalScorer ?? undefined,
                scorerCorrect:   correctScorer || undefined,
              }),
            }).catch((err) => { console.error(`[email] Failed to send result email to ${updatedUser.email}:`, err); return null; });
            // Mark email as sent only if it succeeded — allows retry on next cron run
            if (emailResult && (emailResult as any).success !== false) {
              await prisma.prediction.update({ where: { id: pred.id }, data: { emailSent: true } });
            }

            // ── 9. Streak milestone email ────────────────────────────────
            if (correctResult && [3, 5, 10].includes(newStreak) && streakBonus > 0) {
              sendEmail({
                to: updatedUser.email,
                subject: `🔥 ${newStreak}-game streak! +${streakBonus} XP bonus earned`,
                react: React.createElement(StreakMilestoneEmail, {
                  name:        updatedUser.name ?? "there",
                  streak:      newStreak,
                  bonusXp:     streakBonus,
                  newTotalXp:  updatedUser.xp,
                }),
              }).catch((err) => console.error(`[email] Failed to send streak email to ${updatedUser.email}:`, err));
            }

            // ── 10. Level-up email ───────────────────────────────────────
            const newXp = updatedUser.xp;
            const levelUp = LEVELS.find(l => oldXp < l.threshold && newXp >= l.threshold);
            if (levelUp) {
              sendEmail({
                to: updatedUser.email,
                subject: `${levelUp.name === "Legend" ? "👑" : levelUp.name === "Platinum" ? "💎" : levelUp.name === "Gold" ? "🥇" : "🥈"} You've reached ${levelUp.name} on Matchkoo!`,
                react: React.createElement(LevelUpEmail, {
                  name:        updatedUser.name ?? "there",
                  newLevel:    levelUp.name,
                  newTotalXp:  newXp,
                  nextLevel:   levelUp.next,
                  nextLevelXp: levelUp.nextXp,
                }),
              }).catch((err) => console.error(`[email] Failed to send level-up email to ${updatedUser.email}:`, err));
            }
          }
        }
      }
      
      updated++;
    } else {
      await prisma.match.create({ data: matchData });
      created++;
    }
  }

  // ── Auto-mark completed seasons ─────────────────────────────────────────
  // If all matches in an ONGOING official tournament are COMPLETED and the
  // most recent match was >7 days ago, mark the tournament as COMPLETED.
  const ongoingTournaments = await prisma.tournament.findMany({
    where: { status: "ONGOING", registrationMode: "OPEN" },
    select: { id: true, name: true },
  });
  for (const t of ongoingTournaments) {
    const matchStats = await prisma.match.aggregate({
      where: { tournamentId: t.id },
      _count: { id: true },
      _max: { matchDate: true },
    });
    if (!matchStats._count.id || matchStats._count.id === 0) continue; // no matches yet

    const nonCompletedCount = await prisma.match.count({
      where: { tournamentId: t.id, status: { not: "COMPLETED" } },
    });

    const lastMatchDate = matchStats._max.matchDate;
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    if (nonCompletedCount === 0 && lastMatchDate && lastMatchDate < sevenDaysAgo) {
      await prisma.tournament.update({
        where: { id: t.id },
        data: { status: "COMPLETED" },
      });
      console.log(`[sync] Auto-completed tournament: ${t.name}`);
    }
  }

  return { created, updated, skipped, total: fixtures.length };
}
