import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const tournamentId = searchParams.get("tournamentId");
    const myLeagues    = searchParams.get("myLeagues") === "true";
    const miniLeagues  = searchParams.get("miniLeagues") === "true";
    const session      = await getServerSession(authOptions);
    const userId       = (session?.user as any)?.id;

    // ── My Leagues: rank per each registered tournament ──────────────
    if (myLeagues && userId) {
      const registrations = await prisma.registration.findMany({
        where: { userId },
        include: { tournament: { select: { id: true, name: true, type: true } } },
      });

      const results = await Promise.all(
        registrations.map(async (reg) => {
          // Get XP rank for this tournament
          const rows = await prisma.prediction.groupBy({
            by: ["userId"],
            where: { match: { tournamentId: reg.tournamentId }, xpEarned: { not: null } },
            _sum: { xpEarned: true },
            orderBy: { _sum: { xpEarned: "desc" } },
          });
          const myRow = rows.find((r) => r.userId === userId);
          const rank = rows.findIndex((r) => r.userId === userId) + 1;
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
        const rank = sorted.findIndex((mem) => mem.userId === userId) + 1;
        const myXp = sorted.find((mem) => mem.userId === userId)?.user.xp ?? 0;
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
      const rows = await prisma.prediction.groupBy({
        by: ["userId"],
        where: { match: { tournamentId }, xpEarned: { not: null } },
        _sum: { xpEarned: true },
        orderBy: { _sum: { xpEarned: "desc" } },
      });
      const userIds = rows.map((r) => r.userId);
      const users = await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, name: true, image: true },
      });
      const userMap = Object.fromEntries(users.map((u) => [u.id, u]));
      return NextResponse.json(
        rows.map((r, i) => ({
          rank: i + 1,
          userId: r.userId,
          name: userMap[r.userId]?.name ?? "Unknown",
          image: userMap[r.userId]?.image ?? null,
          xp: r._sum.xpEarned ?? 0,
          isMe: r.userId === userId,
        }))
      );
    }

    // ── Global all-time leaderboard ───────────────────────────────────
    const users = await prisma.user.findMany({
      where: { role: "USER" },
      select: { id: true, name: true, image: true, xp: true },
      orderBy: { xp: "desc" },
      take: 100,
    });
    return NextResponse.json(
      users.map((u, i) => ({
        rank: i + 1,
        userId: u.id,
        name: u.name ?? "Unknown",
        image: u.image ?? null,
        xp: u.xp,
        isMe: u.id === userId,
      }))
    );
  } catch (error) {
    return NextResponse.json({ message: "Failed to fetch leaderboard" }, { status: 500 });
  }
}
