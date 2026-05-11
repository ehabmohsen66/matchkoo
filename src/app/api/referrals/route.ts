import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST /api/referrals — log a referral when a new user registers via an invite link
// Body: { referralCode: string } — the referrer's userId
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const referredId = (session.user as any).id;
  const { referrerId } = await req.json();

  if (!referrerId || referrerId === referredId) {
    return NextResponse.json({ error: "Invalid referral" }, { status: 400 });
  }

  try {
    // Check not already referred
    const existing = await prisma.referral.findUnique({ where: { referredId } });
    if (existing) return NextResponse.json({ error: "Already referred" }, { status: 409 });

    await prisma.referral.create({ data: { referrerId, referredId } });

    // Update referredById on the user record
    await prisma.user.update({
      where: { id: referredId },
      data: { referredById: referrerId },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Referral failed" }, { status: 500 });
  }
}

// Called after new user makes their first prediction — awards XP to referrer
export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const referredId = (session.user as any).id;

  const referral = await prisma.referral.findUnique({ where: { referredId } });
  if (!referral || referral.xpAwarded) {
    return NextResponse.json({ alreadyAwarded: true });
  }

  // Award 200 XP to referrer
  await prisma.$transaction([
    prisma.referral.update({
      where: { referredId },
      data: { xpAwarded: true },
    }),
    prisma.user.update({
      where: { id: referral.referrerId },
      data: { xp: { increment: 200 } },
    }),
  ]);

  return NextResponse.json({ success: true, xpAwarded: 200 });
}
