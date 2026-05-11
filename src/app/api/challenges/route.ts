import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

// GET /api/challenges — return real progress for weekly challenges
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as any).id;

  // Start of current week (Monday)
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon, ...
  const diffToMonday = (dayOfWeek === 0 ? -6 : 1 - dayOfWeek);
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() + diffToMonday);
  weekStart.setHours(0, 0, 0, 0);

  // Next Monday reset
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);

  // All predictions this week
  const weekPreds = await prisma.prediction.findMany({
    where: {
      userId,
      createdAt: { gte: weekStart },
    },
    include: { match: true },
  });

  // ── Challenge 1: Speed Demon — predict 5 matches within 1hr of kickoff
  let speedDemonCount = 0;
  for (const p of weekPreds) {
    const matchTime = new Date(p.match.matchDate).getTime();
    const predTime = new Date(p.createdAt).getTime();
    const diffMs = matchTime - predTime;
    if (diffMs >= 0 && diffMs <= 60 * 60 * 1000) speedDemonCount++;
  }

  // ── Challenge 2: Scoreline Sniper — 3 exact correct scores this week
  const sniper = await prisma.prediction.count({
    where: {
      userId,
      createdAt: { gte: weekStart },
      xpEarned: { gte: 30 }, // exact score = 30+ XP
    },
  });

  // ── Challenge 3: World Traveller — predictions across 4 different leagues
  const leagueSet = new Set<string>();
  for (const p of weekPreds) {
    if (p.match.tournamentId) leagueSet.add(p.match.tournamentId);
  }

  // Check if challenges were already rewarded this week to prevent double XP
  const rewardedChallenges = await prisma.challengeReward.findMany({
    where: { userId, weekStart },
    select: { challengeKey: true },
  });
  const alreadyRewarded = new Set(rewardedChallenges.map((r) => r.challengeKey));

  // Award XP for newly completed challenges
  const toReward: { key: string; xp: number }[] = [];
  if (speedDemonCount >= 5 && !alreadyRewarded.has("speed_demon")) {
    toReward.push({ key: "speed_demon", xp: 500 });
  }
  if (sniper >= 3 && !alreadyRewarded.has("scoreline_sniper")) {
    toReward.push({ key: "scoreline_sniper", xp: 750 });
  }
  if (leagueSet.size >= 4 && !alreadyRewarded.has("world_traveller")) {
    toReward.push({ key: "world_traveller", xp: 400 });
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

  // Compute time until next Monday
  const msLeft = weekEnd.getTime() - now.getTime();
  const daysLeft = Math.floor(msLeft / (1000 * 60 * 60 * 24));
  const hoursLeft = Math.floor((msLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  return NextResponse.json({
    resetIn: `${daysLeft}d ${hoursLeft}h`,
    challenges: [
      {
        key: "speed_demon",
        name: "Speed Demon",
        desc: "Predict 5 matches within 1 hr of kickoff",
        icon: "⏱️",
        xp: 500,
        progress: Math.min(speedDemonCount, 5),
        goal: 5,
        completed: alreadyRewarded.has("speed_demon") || speedDemonCount >= 5,
        justCompleted: toReward.some((r) => r.key === "speed_demon"),
      },
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
        key: "world_traveller",
        name: "World Traveller",
        desc: "Submit predictions in 4 different leagues",
        icon: "🌍",
        xp: 400,
        progress: Math.min(leagueSet.size, 4),
        goal: 4,
        completed: alreadyRewarded.has("world_traveller") || leagueSet.size >= 4,
        justCompleted: toReward.some((r) => r.key === "world_traveller"),
      },
    ],
  });
}
