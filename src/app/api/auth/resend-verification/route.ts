import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import * as React from "react";
import { sendEmail } from "@/lib/email";
import VerifyEmailEmail from "@/emails/VerifyEmailEmail";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email) return NextResponse.json({ message: "Email required" }, { status: 400 });

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, name: true, emailVerified: true },
    });

    // Silent success — don't reveal whether email exists
    if (!user || user.emailVerified) {
      return NextResponse.json({ message: "ok" }, { status: 200 });
    }

    const verificationToken = crypto.randomBytes(32).toString("hex");
    await prisma.user.update({
      where: { email },
      data: { verificationToken },
    });

    const base = process.env.NEXTAUTH_URL ?? "https://matchkoo.com";
    const verifyUrl = `${base}/api/auth/verify-email?token=${verificationToken}`;

    await sendEmail({
      to: email,
      subject: "Verify your Matchkoo email ✉️",
      react: React.createElement(VerifyEmailEmail, { name: user.name ?? "there", verifyUrl }),
    });

    return NextResponse.json({ message: "ok" }, { status: 200 });
  } catch (err) {
    console.error("[resend-verification]", err);
    return NextResponse.json({ message: "Error" }, { status: 500 });
  }
}
