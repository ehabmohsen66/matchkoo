import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { NextRequest } from "next/server";
import * as React from "react";
import { sendEmail, sendAdminAlert } from "@/lib/email";
import VerifyEmailEmail from "@/emails/VerifyEmailEmail";
import AdminAlertEmail from "@/emails/AdminAlertEmail";

export async function POST(req: NextRequest) {
  try {
    const { name, email, password, referrerId, preferredLeagues } = await req.json();

    if (!email || !password || !name) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
    }

    // ── Invite-only gate ────────────────────────────────────────────────────────
    const inviteOnly = process.env.INVITE_ONLY === "true";
    if (inviteOnly) {
      if (!referrerId) {
        return NextResponse.json(
          { message: "Registration is currently invite-only. You need a referral link from an existing member." },
          { status: 403 }
        );
      }
      // Verify referrer actually exists
      const referrer = await prisma.user.findUnique({ where: { id: referrerId }, select: { id: true } });
      if (!referrer) {
        return NextResponse.json(
          { message: "Invalid invite link. Please ask your friend to share their invite link again." },
          { status: 403 }
        );
      }
    }

    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) {
      return NextResponse.json({ message: "User already exists" }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationToken = crypto.randomBytes(32).toString("hex");

    // Create user, optionally linking referrer and persisting league preferences
    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        verificationToken,
        preferredLeagues: Array.isArray(preferredLeagues) ? preferredLeagues : [],
        ...(referrerId ? { referredById: referrerId } : {}),
      },
    });

    // Log referral record (XP awarded later on first prediction)
    if (referrerId) {
      try {
        await prisma.referral.create({
          data: { referrerId, referredId: newUser.id },
        });
      } catch {
        // Ignore duplicate — referral already exists
      }
    }

    const base = process.env.NEXTAUTH_URL ?? "https://matchkoo.com";
    const verifyUrl = `${base}/api/auth/verify-email?token=${verificationToken}`;

    console.log("[register] Sending verification email to:", email);
    console.log("[register] FROM env:", process.env.RESEND_FROM ?? "(not set, using default)");
    console.log("[register] RESEND_API_KEY set:", !!process.env.RESEND_API_KEY);

    const verifyResult = await sendEmail({
      to: email,
      subject: "Verify your Matchkoo email ✉️",
      react: React.createElement(VerifyEmailEmail, { name, verifyUrl }),
    });
    console.log("[register] Verify email result:", JSON.stringify(verifyResult));

    // Admin ping (non-blocking)
    void sendAdminAlert(
      `🆕 New signup: ${name}`,
      React.createElement(AdminAlertEmail, { type: "new_user", newUserName: name, newUserEmail: email })
    );

    return NextResponse.json(
      { message: "Registration successful. Please check your email to verify your account." },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json({ message: "An error occurred while registering the user." }, { status: 500 });
  }
}
