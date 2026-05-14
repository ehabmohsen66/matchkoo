import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

// GET /api/friends              → list people I follow + their XP rank
// GET /api/friends?search=xxx   → search users by name/email
// POST /api/friends { followingId } → follow
// DELETE /api/friends { followingId } → unfollow

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search");

  if (search) {
    // Search users by name (for "Add Friends" feature)
    const users = await prisma.user.findMany({
      where: {
        AND: [
          { id: { not: userId ?? "none" } },
          { role: "USER" },
          {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
            ],
          },
        ],
      },
      select: { id: true, name: true, image: true, xp: true, streak: true },
      take: 10,
    });

    // If logged in, mark which ones are already followed
    let followedIds = new Set<string>();
    if (userId) {
      const existing = await prisma.friendship.findMany({
        where: { followerId: userId, followingId: { in: users.map((u) => u.id) } },
        select: { followingId: true },
      });
      followedIds = new Set(existing.map((f) => f.followingId));
    }

    return NextResponse.json(
      users.map((u) => ({ ...u, isFollowing: followedIds.has(u.id) }))
    );
  }

  // List my friends (people I follow) sorted by XP desc
  if (!userId) return NextResponse.json([]);

  const friendships = await prisma.friendship.findMany({
    where: { followerId: userId },
    include: {
      following: {
        select: {
          id: true,
          name: true,
          image: true,
          xp: true,
          streak: true,
          correctCount: true,
          predictionCount: true,
        },
      },
    },
    orderBy: { following: { xp: "desc" } },
  });

  const friends = friendships.map((f, i) => ({
    rank: i + 1,
    userId: f.following.id,
    name: f.following.name ?? "Unknown",
    image: f.following.image ?? null,
    xp: f.following.xp,
    streak: f.following.streak,
    accuracy: f.following.predictionCount
      ? Math.round((f.following.correctCount / f.following.predictionCount) * 100)
      : 0,
    isMe: f.following.id === userId,
  }));

  // Add the current user at their correct rank among friends
  const me = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, image: true, xp: true, streak: true, correctCount: true, predictionCount: true },
  });
  if (me) {
    const allWithMe = [...friends, {
      rank: 0,
      userId: me.id,
      name: me.name ?? "You",
      image: me.image ?? null,
      xp: me.xp,
      streak: me.streak,
      accuracy: me.predictionCount ? Math.round((me.correctCount / me.predictionCount) * 100) : 0,
      isMe: true,
    }].sort((a, b) => b.xp - a.xp).map((u, i) => ({ ...u, rank: i + 1 }));
    return NextResponse.json(allWithMe);
  }

  return NextResponse.json(friends);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { followingId } = await req.json();
  if (!followingId || followingId === userId)
    return NextResponse.json({ error: "Invalid" }, { status: 400 });

  try {
    await prisma.friendship.create({ data: { followerId: userId, followingId } });
    return NextResponse.json({ ok: true });
  } catch {
    // Already following — ignore unique constraint
    return NextResponse.json({ ok: true });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { followingId } = await req.json();
  await prisma.friendship.deleteMany({ where: { followerId: userId, followingId } });
  return NextResponse.json({ ok: true });
}
