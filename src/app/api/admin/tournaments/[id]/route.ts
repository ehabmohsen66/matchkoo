import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

// PATCH /api/admin/tournaments/[id] — update status, type, prizes, registrationMode
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== "ADMIN")
    return NextResponse.json({ message: "Unauthorized" }, { status: 403 });

  const { id } = await params;
  const body = await req.json();

  const allowed = ["name", "status", "type", "prizes", "prizePool", "maxPlayers", "registrationMode", "inviteCode", "description"];
  const data: Record<string, any> = {};
  allowed.forEach(k => { if (body[k] !== undefined) data[k] = body[k]; });

  const tournament = await prisma.tournament.update({ where: { id }, data });
  return NextResponse.json(tournament);
}

// DELETE /api/admin/tournaments/[id]
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== "ADMIN")
    return NextResponse.json({ message: "Unauthorized" }, { status: 403 });

  const { id } = await params;
  await prisma.tournament.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
