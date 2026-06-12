import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

// Compute the start of a period in UTC
function periodStart(period: string | null): Date | null {
  const now = new Date();
  if (period === "week") {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() - d.getUTCDay()); // start of this week (Sunday)
    d.setUTCHours(0, 0, 0, 0);
    return d;
  }
  if (period === "month") {
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  }
  return null; // alltime — no filter
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const tournamentId = searchParams.get("tournamentId");
    const myLeagues    = searchParams.get("myLeagues") === "true";
    const miniLeagues  = searchParams.get("miniLeagues") === "true";
    const period       = searchParams.get("period") || "alltime"; // week | month | alltime
    const session      = await getServerSession(authOptions);
    const userId       = (session?.user as any)?.id;
    const since        = periodStart(period);

    // ── My Leagues: rank per each registered tournament ───────────────
    if (myLeagues && userId) {
      const registrations = await prisma.registration.findMany({
        where: { userId },
        include: { tournament: { select: { id: true, name: true, type: true } } },
      });

      const results = await Promise.all(
        registrations.map(async (reg) => {
          const dateFilter = since ? { match: { tournamentId: reg.tournamentId, matchDate: { gte: since } } } : { match: { tournamentId: reg.tournamentId } };
          const rows = await prisma.prediction.groupBy({
            by: ["userId"],
            where: { ...dateFilter, xpEarned: { not: null } },
            _sum: { xpEarned: true },
            orderBy: { _sum: { xpEarned: "desc" } },
          });
          const myRow = rows.find((r) => r.userId === userId);
          const rank  = rows.findIndex((r) => r.userId === userId) + 1;
          return {
            id: reg.tournamentId,
            name: reg.tournament.name,
            type: reg.tournament.type,
            rank: rank || rows.length + 1,
            xp: myRow?._sum.xpEarned ?? 0,
            totalParticipants: rows.length,
          };
        })
      );
      return NextResponse.json(results);
    }

    // ── Mini Leagues: rank per each joined mini league ────────────────
    if (miniLeagues && userId) {
      const memberships = await prisma.miniLeagueMember.findMany({
        where: { userId },
        include: {
          miniLeague: {
            include: {
              members: { include: { user: { select: { id: true, xp: true } } } },
            },
          },
        },
      });

      const results = memberships.map((m) => {
        const sorted = [...m.miniLeague.members].sort(
          (a, b) => (b.user.xp ?? 0) - (a.user.xp ?? 0)
        );
        const rank  = sorted.findIndex((mem) => mem.userId === userId) + 1;
        const myXp  = sorted.find((mem) => mem.userId === userId)?.user.xp ?? 0;
        return {
          id: m.miniLeagueId,
          name: m.miniLeague.name,
          code: m.miniLeague.code,
          rank,
          xp: myXp,
          members: m.miniLeague.members.length,
        };
      });
      return NextResponse.json(results);
    }

    // ── Per-tournament leaderboard ────────────────────────────────────
    if (tournamentId) {
      const dateFilter = since ? { matchDate: { gte: since } } : {};
      let rows = await prisma.prediction.groupBy({
        by: ["userId"],
        where: { match: { tournamentId, ...dateFilter } },
        _sum: { xpEarned: true },
      });
      // Sort in JS to handle nulls correctly (b._sum - a._sum) instead of DB NULLS FIRST
      rows.sort((a, b) => (b._sum.xpEarned ?? 0) - (a._sum.xpEarned ?? 0));
      const userIds = rows.map((r) => r.userId);
      const users   = await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, name: true, image: true, streak: true, country: true },
      });
      const userMap = Object.fromEntries(users.map((u) => [u.id, u]));

      // Get past leaderboard for trend (7 days ago)
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const pastDateFilter = since ? { matchDate: { gte: since, lt: oneWeekAgo } } : { matchDate: { lt: oneWeekAgo } };
      let pastRows = await prisma.prediction.groupBy({
        by: ["userId"],
        where: { match: { tournamentId, ...pastDateFilter } },
        _sum: { xpEarned: true },
      });
      pastRows.sort((a, b) => (b._sum.xpEarned ?? 0) - (a._sum.xpEarned ?? 0));
      const pastRankMap = new Map(pastRows.map((r, i) => [r.userId, i + 1]));

      // Get per-league accuracy — use status='correct' (score-derived, not xpEarned)
      const totalPreds = await prisma.prediction.groupBy({
        by: ["userId"],
        where: { userId: { in: userIds }, match: { tournamentId, status: "COMPLETED" }, status: { not: null } },
        _count: { id: true },
      });
      const correctPreds = await prisma.prediction.groupBy({
        by: ["userId"],
        where: { userId: { in: userIds }, match: { tournamentId, status: "COMPLETED" }, status: "correct" },
        _count: { id: true },
      });
      const totalMap = Object.fromEntries(totalPreds.map((r) => [r.userId, r._count.id]));
      const correctMap = Object.fromEntries(correctPreds.map((r) => [r.userId, r._count.id]));

      return NextResponse.json(
        rows.map((r, i) => {
          const total = totalMap[r.userId] || 0;
          const correct = correctMap[r.userId] || 0;
          const acc = total > 0 ? Math.round((correct / total) * 100) : 0;
          
          const currentRank = i + 1;
          const pastRank = pastRankMap.get(r.userId);
          let trend = "same";
          if (pastRank) {
            if (currentRank < pastRank) trend = "up";
            else if (currentRank > pastRank) trend = "down";
          } else {
            // New entry
            trend = "same";
          }

          return {
            rank: currentRank,
            userId: r.userId,
            name:   userMap[r.userId]?.name ?? "Unknown",
            image:  userMap[r.userId]?.image ?? null,
            country: userMap[r.userId]?.country ?? "EG",
            xp:     r._sum.xpEarned ?? 0,
            streak: userMap[r.userId]?.streak ?? 0,
            accuracy: acc,
            trend:  trend,
            isMe: r.userId === userId,
          };
        })
      );
    }

    // ── Global leaderboard — period-aware ─────────────────────────────
    if (since) {
      // Weekly / monthly: sum xpEarned from predictions in the period
      const rows = await prisma.prediction.groupBy({
        by: ["userId"],
        where: {
          xpEarned:    { not: null },
          match:       { matchDate: { gte: since }, status: "COMPLETED" },
        },
        _sum: { xpEarned: true },
        orderBy: { _sum: { xpEarned: "desc" } },
        take: 100,
      });
      const userIds = rows.map((r) => r.userId);
      const users   = await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, name: true, image: true, streak: true, country: true },
      });
      const userMap = Object.fromEntries(users.map((u) => [u.id, u]));
      // Live accuracy — status='correct' is set from score comparison, not xpEarned
      const [accTotal, accCorrect] = await Promise.all([
        prisma.prediction.groupBy({ by: ["userId"], where: { userId: { in: userIds }, match: { status: "COMPLETED", matchDate: { gte: since! } }, status: { not: null } }, _count: { id: true } }),
        prisma.prediction.groupBy({ by: ["userId"], where: { userId: { in: userIds }, match: { status: "COMPLETED", matchDate: { gte: since! } }, status: "correct" }, _count: { id: true } }),
      ]);
      const accTotalMap   = Object.fromEntries(accTotal.map(r => [r.userId, r._count.id]));
      const accCorrectMap = Object.fromEntries(accCorrect.map(r => [r.userId, r._count.id]));
      return NextResponse.json(
        rows.map((r, i) => {
          const t = accTotalMap[r.userId] || 0;
          const c = accCorrectMap[r.userId] || 0;
          return {
            rank:     i + 1,
            userId:   r.userId,
            name:     userMap[r.userId]?.name ?? "Unknown",
            image:    userMap[r.userId]?.image ?? null,
            country:  userMap[r.userId]?.country ?? "EG",
            xp:       r._sum.xpEarned ?? 0,
            streak:   userMap[r.userId]?.streak ?? 0,
            accuracy: t > 0 ? Math.round((c / t) * 100) : 0,
            isMe: r.userId === userId,
          };
        })
      );
    }

    // ── Global all-time leaderboard ───────────────────────────────────
    const users = await prisma.user.findMany({
      where: {},
      select: { id: true, name: true, image: true, xp: true, streak: true, country: true },
      orderBy: { xp: "desc" },
      take: 100,
    });
    const allUserIds = users.map(u => u.id);
    // Live accuracy — status='correct' is score-derived, avoids stale correctCount
    const [allTotal, allCorrect] = await Promise.all([
      prisma.prediction.groupBy({ by: ["userId"], where: { userId: { in: allUserIds }, match: { status: "COMPLETED" }, status: { not: null } }, _count: { id: true } }),
      prisma.prediction.groupBy({ by: ["userId"], where: { userId: { in: allUserIds }, match: { status: "COMPLETED" }, status: "correct" }, _count: { id: true } }),
    ]);
    const allTotalMap   = Object.fromEntries(allTotal.map(r => [r.userId, r._count.id]));
    const allCorrectMap = Object.fromEntries(allCorrect.map(r => [r.userId, r._count.id]));
    return NextResponse.json(
      users.map((u, i) => {
        const t = allTotalMap[u.id] || 0;
        const c = allCorrectMap[u.id] || 0;
        return {
          rank:     i + 1,
          userId:   u.id,
          name:     u.name ?? "Unknown",
          image:    u.image ?? null,
          country:  u.country ?? "EG",
          xp:       u.xp,
          streak:   u.streak,
          accuracy: t > 0 ? Math.round((c / t) * 100) : 0,
          isMe: u.id === userId,
        };
      })
    );
  } catch (error) {
    console.error("Leaderboard error:", error);
    return NextResponse.json({ message: "Failed to fetch leaderboard" }, { status: 500 });
  }
}
