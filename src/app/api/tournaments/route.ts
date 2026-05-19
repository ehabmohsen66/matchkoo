import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    const tournaments = await prisma.tournament.findMany({
      orderBy: [{ startDate: "asc" }],
      include: {
        _count: { select: { registrations: true, matches: true } },
        ...(session?.user?.id
          ? { registrations: { where: { userId: session.user.id }, select: { id: true } } }
          : {}),
      },
    });

    // Sort: UPCOMING → ONGOING → COMPLETED
    const statusOrder: Record<string, number> = { UPCOMING: 0, ONGOING: 1, COMPLETED: 2 };
    tournaments.sort((a, b) =>
      (statusOrder[a.status] ?? 3) - (statusOrder[b.status] ?? 3)
    );

    // Attach userRegistered flag, strip raw registrations array
    const enriched = tournaments.map((t: any) => ({
      ...t,
      userRegistered: Array.isArray(t.registrations) && t.registrations.length > 0,
      registrations: undefined,
    }));

    return NextResponse.json(enriched);
  } catch (error) {
    return NextResponse.json({ message: "Failed to fetch tournaments" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ message: "You must be logged in to create a league" }, { status: 401 });
    }

    const { name, game, description, prizePool, prizes, maxPlayers, startDate, type, registrationMode, inviteCode, competition, scoringMode } = await req.json();

    if (!name || !game || !startDate) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
    }

    // Only ADMINS can create public/official tournaments; regular users can only create INVITE_ONLY mini leagues
    const isAdmin = (session.user as any)?.role === "ADMIN";
    const effectiveMode = registrationMode || "INVITE_ONLY";

    if (effectiveMode !== "INVITE_ONLY" && !isAdmin) {
      return NextResponse.json({ message: "Only admins can create public tournaments" }, { status: 403 });
    }

    const tournament = await prisma.tournament.create({
      data: {
        name,
        game,
        description: description || "",
        prizePool: prizePool || "$0",
        prizes: prizes || null,
        maxPlayers: parseInt(maxPlayers) || 100,
        startDate: new Date(startDate),
        type: type || "League",
        registrationMode: effectiveMode,
        inviteCode: effectiveMode === "INVITE_ONLY" ? (inviteCode || null) : null,
        competition: competition || "premier_league",
        scoringMode: scoringMode || "global",
        createdByUserId: (session.user as any).id,
      },
    });

    // Auto-register the creator into their own mini league
    if (effectiveMode === "INVITE_ONLY") {
      await prisma.registration.create({
        data: {
          userId: (session.user as any).id,
          tournamentId: tournament.id,
        },
      });
    }

    return NextResponse.json(tournament, { status: 201 });
  } catch (error) {
    console.error("Failed to create tournament:", error);
    return NextResponse.json({ message: "An error occurred" }, { status: 500 });
  }
}
