import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

// GET /api/challenges — return real progress for weekly challenges
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as any).id;

  // Start of current week (Monday 00:00:00)
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon, ...
  const diffToMonday = (dayOfWeek === 0 ? -6 : 1 - dayOfWeek);
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() + diffToMonday);
  weekStart.setHours(0, 0, 0, 0);

  // Next Monday — used for reset display
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);

  // ── Challenge 1: Scoreline Sniper — 3 exact correct scorelines this week ──
  const sniperPreds = await prisma.prediction.findMany({
    where: {
      userId,
      createdAt: { gte: weekStart },
      status: "correct",
    },
    include: {
      match: { select: { homeScore: true, awayScore: true } },
    },
  });

  const sniper = sniperPreds.filter(
    (p) =>
      p.match.homeScore !== null &&
      p.match.awayScore !== null &&
      p.homeScore === p.match.homeScore &&
      p.awayScore === p.match.awayScore
  ).length;

  // ── Challenge 2: Confidence King — 5 correct outcomes with 100% confidence ──
  // Fetch week predictions that are settled correct AND had confidence=100
  const confidenceKingCount = await prisma.prediction.count({
    where: {
      userId,
      createdAt: { gte: weekStart },
      status: "correct",
      confidence: 100,
    },
  });

  // ── Challenge 3: Crystal Baller — correct first goalscorer in 3 matches ──
  // Fetch settled predictions this week where user provided a firstGoalScorer
  const fgsPreds = await prisma.prediction.findMany({
    where: {
      userId,
      createdAt: { gte: weekStart },
      firstGoalScorer: { not: null },
      status: { not: null }, // settled
    },
    include: {
      match: { select: { firstGoalScorer: true } },
    },
  });

  const crystalBallerCount = fgsPreds.filter(
    (p) =>
      p.firstGoalScorer &&
      p.match.firstGoalScorer &&
      p.firstGoalScorer.trim().toLowerCase() ===
        p.match.firstGoalScorer.trim().toLowerCase()
  ).length;

  // ── Check already-rewarded challenges to prevent double XP ──────────
  const rewardedChallenges = await prisma.challengeReward.findMany({
    where: { userId, weekStart },
    select: { challengeKey: true },
  });
  const alreadyRewarded = new Set(rewardedChallenges.map((r) => r.challengeKey));

  // ── Award XP for newly completed challenges ─────────────────────────
  const toReward: { key: string; xp: number }[] = [];
  if (sniper >= 3 && !alreadyRewarded.has("scoreline_sniper")) {
    toReward.push({ key: "scoreline_sniper", xp: 750 });
  }
  if (confidenceKingCount >= 5 && !alreadyRewarded.has("confidence_king")) {
    toReward.push({ key: "confidence_king", xp: 500 });
  }
  if (crystalBallerCount >= 3 && !alreadyRewarded.has("crystal_baller")) {
    toReward.push({ key: "crystal_baller", xp: 600 });
  }

  if (toReward.length > 0) {
    await prisma.$transaction([
      ...toReward.map((r) =>
        prisma.challengeReward.create({
          data: { userId, weekStart, challengeKey: r.key, xpAwarded: r.xp },
        })
      ),
      prisma.user.update({
        where: { id: userId },
        data: { xp: { increment: toReward.reduce((sum, r) => sum + r.xp, 0) } },
      }),
    ]);
  }

  // ── Compute time until next Monday ──────────────────────────────────
  const msLeft = weekEnd.getTime() - now.getTime();
  const daysLeft = Math.floor(msLeft / (1000 * 60 * 60 * 24));
  const hoursLeft = Math.floor((msLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  return NextResponse.json({
    resetIn: `${daysLeft}d ${hoursLeft}h`,
    challenges: [
      {
        key: "scoreline_sniper",
        name: "Scoreline Sniper",
        desc: "Get 3 correct exact scorelines this week",
        icon: "🎯",
        xp: 750,
        progress: Math.min(sniper, 3),
        goal: 3,
        completed: alreadyRewarded.has("scoreline_sniper") || sniper >= 3,
        justCompleted: toReward.some((r) => r.key === "scoreline_sniper"),
      },
      {
        key: "confidence_king",
        name: "Confidence King",
        desc: "Predict 5 match outcomes correctly at 100% confidence",
        icon: "👑",
        xp: 500,
        progress: Math.min(confidenceKingCount, 5),
        goal: 5,
        completed: alreadyRewarded.has("confidence_king") || confidenceKingCount >= 5,
        justCompleted: toReward.some((r) => r.key === "confidence_king"),
      },
      {
        key: "crystal_baller",
        name: "Crystal Baller",
        desc: "Predict the first goalscorer correctly in 3 matches",
        icon: "🔮",
        xp: 600,
        progress: Math.min(crystalBallerCount, 3),
        goal: 3,
        completed: alreadyRewarded.has("crystal_baller") || crystalBallerCount >= 3,
        justCompleted: toReward.some((r) => r.key === "crystal_baller"),
      },
    ],
  });
}
