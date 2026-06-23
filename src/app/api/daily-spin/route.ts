import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

/**
 * Prize table — server is the single source of truth.
 * Order/index MUST match spinPrizes array in public/js/data.js exactly.
 * Weights: 50+30+10+5+4+1 = 100 (treated as percentages).
 */
const SPIN_PRIZES = [
  { index: 0, label: "Bad Luck :(",  xp: 0,   weight: 50 },
  { index: 1, label: "+50 XP",       xp: 50,  weight: 30 },
  { index: 2, label: "+100 XP",      xp: 100, weight: 10 },
  { index: 3, label: "+150 XP",      xp: 150, weight: 5  },
  { index: 4, label: "+250 XP",      xp: 250, weight: 4  },
  { index: 5, label: "+500 XP",      xp: 500, weight: 1  },
];

function pickPrize() {
  const totalWeight = SPIN_PRIZES.reduce((sum, p) => sum + p.weight, 0);
  let rand = Math.random() * totalWeight;
  for (const prize of SPIN_PRIZES) {
    rand -= prize.weight;
    if (rand <= 0) return prize;
  }
  return SPIN_PRIZES[0]; // fallback
}

// GET /api/daily-spin — check if user has spun today
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as any).id;
  const today = new Date().toISOString().split("T")[0];

  const existing = await prisma.dailySpin.findUnique({
    where: { userId_spinDate: { userId, spinDate: today } },
  });

  return NextResponse.json({
    spunToday: !!existing,
    prize: existing?.prize ?? null,
    prizeIndex: existing
      ? (SPIN_PRIZES.find((p) => p.label === existing.prize)?.index ?? 0)
      : null,
  });
}

// POST /api/daily-spin — server picks the prize, records it, and awards XP
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as any).id;
  const today = new Date().toISOString().split("T")[0];

  // Guard: reject if already spun today
  const existing = await prisma.dailySpin.findUnique({
    where: { userId_spinDate: { userId, spinDate: today } },
  });
  if (existing) {
    return NextResponse.json({ error: "Already spun today" }, { status: 409 });
  }

  // ── Server-side prize selection (client has no say) ──────────────────
  const selected = pickPrize();

  try {
    const updatedUser = await prisma.$transaction(async (tx) => {
      await tx.dailySpin.create({
        data: { userId, spinDate: today, prize: selected.label, xpAwarded: selected.xp },
      });
      return tx.user.update({
        where: { id: userId },
        data: { xp: { increment: selected.xp } },
        select: { email: true, name: true, xp: true },
      });
    });

    return NextResponse.json({
      success: true,
      prize: selected.label,
      prizeIndex: selected.index,
      xpAwarded: selected.xp,
    });
  } catch (e: any) {
    if (e.code === "P2002") {
      return NextResponse.json({ error: "Already spun today" }, { status: 409 });
    }
    return NextResponse.json({ error: "Spin failed" }, { status: 500 });
  }
}
