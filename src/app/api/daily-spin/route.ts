import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

// GET /api/daily-spin — check if user has spun today
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as any).id;
  const today = new Date().toISOString().split("T")[0];

  const existing = await prisma.dailySpin.findUnique({
    where: { userId_spinDate: { userId, spinDate: today } },
  });

  return NextResponse.json({ spunToday: !!existing, prize: existing?.prize ?? null });
}

// POST /api/daily-spin — record the spin and award XP
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as any).id;
  const today = new Date().toISOString().split("T")[0];
  const { prize, xp } = await req.json();

  if (!prize || xp == null) {
    return NextResponse.json({ error: "Missing prize or xp" }, { status: 400 });
  }

  try {
    // Check already spun today
    const existing = await prisma.dailySpin.findUnique({
      where: { userId_spinDate: { userId, spinDate: today } },
    });
    if (existing) {
      return NextResponse.json({ error: "Already spun today" }, { status: 409 });
    }

    await prisma.$transaction([
      prisma.dailySpin.create({
        data: { userId, spinDate: today, prize, xpAwarded: xp },
      }),
      prisma.user.update({
        where: { id: userId },
        data: { xp: { increment: xp } },
      }),
    ]);

    return NextResponse.json({ success: true, xpAwarded: xp });
  } catch (e: any) {
    if (e.code === "P2002") {
      return NextResponse.json({ error: "Already spun today" }, { status: 409 });
    }
    return NextResponse.json({ error: "Spin failed" }, { status: 500 });
  }
}
