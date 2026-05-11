import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

function adminOnly(session: any) {
  return !session || session.user?.role !== "ADMIN";
}

// GET /api/admin/users
export async function GET() {
  const session = await getServerSession(authOptions);
  if (adminOnly(session)) return NextResponse.json({ message: "Unauthorized" }, { status: 403 });

  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, xp: true, createdAt: true, _count: { select: { registrations: true, predictions: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(users);
}

// PATCH /api/admin/users  — update role
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (adminOnly(session)) return NextResponse.json({ message: "Unauthorized" }, { status: 403 });

  const { userId, role } = await req.json();
  if (!userId || !["USER", "ADMIN"].includes(role)) {
    return NextResponse.json({ message: "Invalid payload" }, { status: 400 });
  }

  const user = await prisma.user.update({ where: { id: userId }, data: { role } });
  return NextResponse.json({ id: user.id, role: user.role });
}
