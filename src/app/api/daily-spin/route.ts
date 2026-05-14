import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import * as React from "react";
import { sendEmail } from "@/lib/email";
import DailyBonusEmail from "@/emails/DailyBonusEmail";

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

    const updatedUser = await prisma.$transaction(async (tx) => {
      await tx.dailySpin.create({
        data: { userId, spinDate: today, prize, xpAwarded: xp },
      });
      return tx.user.update({
        where: { id: userId },
        data: { xp: { increment: xp } },
        select: { email: true, name: true, xp: true },
      });
    });

    // Send daily bonus email (non-blocking)
    if (updatedUser.email) {
      sendEmail({
        to: updatedUser.email,
        subject: `🎡 You won ${prize} on today's Daily Spin!`,
        react: React.createElement(DailyBonusEmail, {
          name: updatedUser.name ?? "there",
          prize,
          xpAwarded: xp,
          newTotalXp: updatedUser.xp,
        }),
      }).catch((err) => console.error(`[email] Failed to send daily bonus email to ${updatedUser.email}:`, err));
    }

    return NextResponse.json({ success: true, xpAwarded: xp });
  } catch (e: any) {
    if (e.code === "P2002") {
      return NextResponse.json({ error: "Already spun today" }, { status: 409 });
    }
    return NextResponse.json({ error: "Spin failed" }, { status: 500 });
  }
}
