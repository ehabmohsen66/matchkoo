import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

// DELETE /api/tournaments/[id] — only the creator of a mini league can delete it
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;
    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const tournament = await prisma.tournament.findUnique({
      where: { id },
      select: { createdByUserId: true, registrationMode: true },
    });

    if (!tournament) {
      return NextResponse.json({ message: "League not found" }, { status: 404 });
    }

    // Only the creator can delete their own mini league
    if (tournament.createdByUserId !== userId) {
      return NextResponse.json({ message: "Only the creator can delete this league" }, { status: 403 });
    }

    // Only allow deleting INVITE_ONLY (mini) leagues — not official tournaments
    if (tournament.registrationMode !== "INVITE_ONLY") {
      return NextResponse.json({ message: "Official leagues cannot be deleted here" }, { status: 403 });
    }

    await prisma.tournament.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete tournament error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
