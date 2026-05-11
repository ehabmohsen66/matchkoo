import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    const tournaments = await prisma.tournament.findMany({
      // UPCOMING first, then ONGOING, then COMPLETED — all sorted by startDate within group
      orderBy: [{ startDate: "asc" }],
      include: {
        _count: { select: { registrations: true } },
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

    if (!session || (session.user as any)?.role !== "ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
    }

    const { name, game, description, prizePool, prizes, maxPlayers, startDate, type, registrationMode, inviteCode } = await req.json();

    if (!name || !game || !startDate) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
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
        registrationMode: registrationMode || "OPEN",
        inviteCode: registrationMode === "INVITE_ONLY" ? (inviteCode || null) : null,
        createdByUserId: (session.user as any).id,
      },
    });

    return NextResponse.json(tournament, { status: 201 });
  } catch (error) {
    console.error("Failed to create tournament:", error);
    return NextResponse.json({ message: "An error occurred" }, { status: 500 });
  }
}
