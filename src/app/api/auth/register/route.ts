import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { NextRequest } from "next/server";
import * as React from "react";
import { sendEmail, sendAdminAlert } from "@/lib/email";
import VerifyEmailEmail from "@/emails/VerifyEmailEmail";
import AdminAlertEmail from "@/emails/AdminAlertEmail";
import ReferralConvertedEmail from "@/emails/ReferralConvertedEmail";
import ReferralWelcomeBonusEmail from "@/emails/ReferralWelcomeBonusEmail";

export async function POST(req: NextRequest) {
  try {
    const { name, email, password, gender, referrerId, preferredLeagues, dateOfBirth } = await req.json();

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

    // Parse DOB — accept "YYYY-MM-DD" string, store as UTC midnight DateTime
    const parsedDob = dateOfBirth ? new Date(dateOfBirth) : undefined;
    const validDob = parsedDob && !isNaN(parsedDob.getTime()) ? parsedDob : undefined;

    // Create user, optionally linking referrer and persisting league preferences
    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        verificationToken,
        gender: gender === "female" ? "female" : "male", // validate input
        preferredLeagues: Array.isArray(preferredLeagues) ? preferredLeagues : [],
        ...(validDob ? { dateOfBirth: validDob } : {}),
        // Give new user their +200 XP welcome bonus immediately if referred
        xp: referrerId ? 200 : 0,
        ...(referrerId ? { referredById: referrerId } : {}),
      },
    });

    // ── Referral XP — fires on registration (not first prediction) ───────────
    if (referrerId) {
      try {
        // Create referral record and mark as already awarded
        await prisma.referral.create({
          data: { referrerId, referredId: newUser.id, xpAwarded: true },
        });
      } catch {
        // Ignore duplicate — referral already exists
      }

      // Award +200 XP to the referrer
      const referrer = await prisma.user.update({
        where: { id: referrerId },
        data: { xp: { increment: 200 } },
        select: { name: true, email: true, xp: true },
      });

      // Notify referrer (fire-and-forget)
      if (referrer.email) {
        sendEmail({
          to: referrer.email,
          subject: `🎉 ${name} just joined Matchkoo using your invite link — +200 XP earned!`,
          react: React.createElement(ReferralConvertedEmail, {
            name: referrer.name ?? "there",
            friendName: name,
            xpAwarded: 200,
            newTotalXp: referrer.xp,
          }),
        }).catch((err) => console.error("[email] Referral converted email failed:", err));
      }

      // Notify new user of their welcome bonus (fire-and-forget)
      sendEmail({
        to: email,
        subject: `🎁 Welcome bonus! ${referrer.name ?? "A friend"}'s invite earned you +200 XP`,
        react: React.createElement(ReferralWelcomeBonusEmail, {
          name,
          referrerName: referrer.name ?? "Your friend",
          xpAwarded: 200,
          newTotalXp: 200,
        }),
      }).catch((err) => console.error("[email] Referral welcome bonus email failed:", err));
    }

    const base = process.env.NEXTAUTH_URL ?? "https://matchkoo.com";
    const verifyUrl = `${base}/api/auth/verify-email?token=${verificationToken}`;

    console.log("[register] Sending verification email to:", email);
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
