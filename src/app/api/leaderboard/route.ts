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
        select: { id: true, name: true, image: true, streak: true, correctCount: true, predictionCount: true, country: true },
      });
      const userMap = Object.fromEntries(users.map((u) => [u.id, u]));
      return NextResponse.json(
        rows.map((r, i) => ({
          rank: i + 1,
          userId: r.userId,
          name:   userMap[r.userId]?.name ?? "Unknown",
          image:  userMap[r.userId]?.image ?? null,
          country: userMap[r.userId]?.country ?? "EG",
          xp:     r._sum.xpEarned ?? 0,
          streak: userMap[r.userId]?.streak ?? 0,
          accuracy: userMap[r.userId]?.predictionCount
            ? Math.round((userMap[r.userId].correctCount / userMap[r.userId].predictionCount) * 100)
            : 0,
          isMe: r.userId === userId,
        }))
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
        where: { id: { in: userIds }, role: "USER" },
        select: { id: true, name: true, image: true, streak: true, correctCount: true, predictionCount: true, country: true },
      });
      const userMap = Object.fromEntries(users.map((u) => [u.id, u]));
      return NextResponse.json(
        rows.map((r, i) => ({
          rank:     i + 1,
          userId:   r.userId,
          name:     userMap[r.userId]?.name ?? "Unknown",
          image:    userMap[r.userId]?.image ?? null,
          country:  userMap[r.userId]?.country ?? "EG",
          xp:       r._sum.xpEarned ?? 0,
          streak:   userMap[r.userId]?.streak ?? 0,
          accuracy: userMap[r.userId]?.predictionCount
            ? Math.round((userMap[r.userId].correctCount / userMap[r.userId].predictionCount) * 100)
            : 0,
          isMe: r.userId === userId,
        }))
      );
    }

    // ── Global all-time leaderboard ───────────────────────────────────
    const users = await prisma.user.findMany({
      where: { role: "USER" },
      select: { id: true, name: true, image: true, xp: true, streak: true, correctCount: true, predictionCount: true, country: true },
      orderBy: { xp: "desc" },
      take: 100,
    });
    return NextResponse.json(
      users.map((u, i) => ({
        rank:     i + 1,
        userId:   u.id,
        name:     u.name ?? "Unknown",
        image:    u.image ?? null,
        country:  u.country ?? "EG",
        xp:       u.xp,
        streak:   u.streak,
        accuracy: u.predictionCount
          ? Math.round((u.correctCount / u.predictionCount) * 100)
          : 0,
        isMe: u.id === userId,
      }))
    );
  } catch (error) {
    console.error("Leaderboard error:", error);
    return NextResponse.json({ message: "Failed to fetch leaderboard" }, { status: 500 });
  }
}
