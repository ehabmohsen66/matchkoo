import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as React from "react";
import { sendEmail } from "@/lib/email";
import WelcomeEmail from "@/emails/WelcomeEmail";

// GET /api/auth/verify-email?token=xxx
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  const base = process.env.NEXTAUTH_URL ?? "https://matchkoo.com";

  if (!token) {
    return NextResponse.redirect(`${base}/login?error=missing_token`);
  }

  const user = await prisma.user.findUnique({
    where: { verificationToken: token },
    select: { id: true, name: true, email: true, emailVerified: true },
  });

  if (!user) {
    return NextResponse.redirect(`${base}/login?error=invalid_token`);
  }

  if (user.emailVerified) {
    // Already verified — just redirect to login
    return NextResponse.redirect(`${base}/login?verified=1`);
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerified: new Date(),
      verificationToken: null,  // consume the token
    },
  });

  // Send welcome email now that user has verified
  void sendEmail({
    to: user.email!,
    subject: `Welcome to the Arena, ${user.name ?? "Champion"}! ⚽`,
    react: React.createElement(WelcomeEmail, {
      name: user.name ?? "Champion",
      email: user.email!,
    }),
  });

  return NextResponse.redirect(`${base}/login?verified=1`);
}
