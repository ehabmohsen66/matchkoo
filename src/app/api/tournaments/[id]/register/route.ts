import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ message: "Must be logged in to register" }, { status: 401 });
    }

    const { id: tournamentId } = await params;
    const userId = (session.user as any).id;
    const body = await req.json().catch(() => ({}));
    const { inviteCode } = body;

    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: { _count: { select: { registrations: true } } },
    });

    if (!tournament) {
      return NextResponse.json({ message: "Tournament not found" }, { status: 404 });
    }

    // Enforce invite-only
    if (tournament.registrationMode === "INVITE_ONLY") {
      if (!inviteCode || inviteCode.trim().toLowerCase() !== tournament.inviteCode?.trim().toLowerCase()) {
        return NextResponse.json({ message: "Invalid invite code. This league requires an invitation." }, { status: 403 });
      }
    }

    // Check capacity
    if (tournament._count.registrations >= tournament.maxPlayers) {
      return NextResponse.json({ message: "Tournament is full" }, { status: 400 });
    }

    const registration = await prisma.registration.create({
      data: { userId, tournamentId },
    });

    return NextResponse.json(registration, { status: 201 });
  } catch (error: any) {
    if (error.code === "P2002") {
      return NextResponse.json({ message: "Already registered for this tournament" }, { status: 400 });
    }
    console.error("Failed to register:", error);
    return NextResponse.json({ message: "An error occurred" }, { status: 500 });
  }
}

// DELETE /api/tournaments/[id]/register — leave an OPEN league
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ message: "Must be logged in" }, { status: 401 });
    }

    const { id: tournamentId } = await params;
    const userId = (session.user as any).id;

    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      select: { registrationMode: true },
    });

    if (!tournament) {
      return NextResponse.json({ message: "Tournament not found" }, { status: 404 });
    }

    // Only allow leaving OPEN leagues — INVITE_ONLY leagues are managed separately
    if (tournament.registrationMode === "INVITE_ONLY") {
      return NextResponse.json({ message: "Cannot leave an invite-only league this way" }, { status: 403 });
    }

    await prisma.registration.deleteMany({
      where: { userId, tournamentId },
    });

    return NextResponse.json({ message: "Left league successfully" });
  } catch (error) {
    console.error("Failed to unregister:", error);
    return NextResponse.json({ message: "An error occurred" }, { status: 500 });
  }
}
