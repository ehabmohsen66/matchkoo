import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import * as React from "react";
import { sendEmail } from "@/lib/email";
import ForgotPasswordEmail from "@/emails/ForgotPasswordEmail";

// POST /api/auth/forgot-password  { email }
export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email) return NextResponse.json({ message: "Email required" }, { status: 400 });

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, name: true, email: true },
    });

    // Always return 200 — never confirm if email exists (security)
    if (!user || !user.email) {
      return NextResponse.json({ message: "If that email exists, you'll receive a reset link shortly." });
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.user.update({
      where: { id: user.id },
      data: { resetPasswordToken: token, resetPasswordExpiry: expiry },
    });

    const base = process.env.NEXTAUTH_URL ?? "https://matchkoo.com";
    const resetUrl = `${base}/reset-password?token=${token}`;

    void sendEmail({
      to: user.email,
      subject: "Reset your Matchkoo password",
      react: React.createElement(ForgotPasswordEmail, { name: user.name ?? "there", resetUrl }),
    });

    return NextResponse.json({ message: "If that email exists, you'll receive a reset link shortly." });
  } catch (err) {
    console.error("[forgot-password]", err);
    return NextResponse.json({ message: "Something went wrong" }, { status: 500 });
  }
}
