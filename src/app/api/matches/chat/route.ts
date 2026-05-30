import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

const MAX_MESSAGE_LENGTH = 280;

/**
 * GET /api/matches/chat?matchId=<id>&since=<isoTimestamp>
 *
 * Returns up to 50 chat messages for the match, optionally only those
 * created after `since` (ISO timestamp) for incremental polling.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const matchId = searchParams.get("matchId");
  const since   = searchParams.get("since");

  if (!matchId) {
    return NextResponse.json({ error: "matchId required" }, { status: 400 });
  }

  try {
    const messages = await prisma.matchChat.findMany({
      where: {
        matchId,
        ...(since ? { createdAt: { gt: new Date(since) } } : {}),
      },
      orderBy: { createdAt: "asc" },
      take: 50,
      select: {
        id:        true,
        userId:    true,
        userName:  true,
        userImage: true,
        message:   true,
        createdAt: true,
      },
    });

    return NextResponse.json(messages, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    console.error("[chat GET]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

/**
 * POST /api/matches/chat?matchId=<id>
 * Body: { message: string }
 *
 * Creates a new chat message. Requires authentication.
 * Rate-limited: one message per 5 seconds per user (checked via DB).
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const matchId = searchParams.get("matchId");

  if (!matchId) {
    return NextResponse.json({ error: "matchId required" }, { status: 400 });
  }

  let body: { message?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const message = (body.message ?? "").trim();
  if (!message) {
    return NextResponse.json({ error: "Message cannot be empty" }, { status: 400 });
  }
  if (message.length > MAX_MESSAGE_LENGTH) {
    return NextResponse.json({ error: "Message too long" }, { status: 400 });
  }

  const userId = (session.user as any).id as string;

  // Rate limit: at most 1 message per 5 seconds per user per match
  const fiveSecondsAgo = new Date(Date.now() - 5000);
  const recent = await prisma.matchChat.findFirst({
    where: { matchId, userId, createdAt: { gt: fiveSecondsAgo } },
    select: { id: true },
  });
  if (recent) {
    return NextResponse.json({ error: "Slow down — one message per 5 seconds" }, { status: 429 });
  }

  try {
    const created = await prisma.matchChat.create({
      data: {
        matchId,
        userId,
        userName:  session.user.name  ?? "Anonymous",
        userImage: session.user.image ?? null,
        message,
      },
      select: {
        id:        true,
        userId:    true,
        userName:  true,
        userImage: true,
        message:   true,
        createdAt: true,
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    console.error("[chat POST]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
