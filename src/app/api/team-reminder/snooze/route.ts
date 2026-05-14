import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createHmac } from "crypto";

const SECRET = process.env.CRON_SECRET;
if (!SECRET) throw new Error("CRON_SECRET env var is not set");


/** Verify a snooze token — format: userId:clubName:hmac */
function verifyToken(token: string): { userId: string; clubName: string } | null {
  try {
    const parts = token.split(":");
    if (parts.length < 3) return null;
    const clubName = parts.slice(1, -1).join(":"); // club name may contain colons
    const userId = parts[0];
    const sig = parts[parts.length - 1];
    const expected = createHmac("sha256", SECRET!)
      .update(`${userId}:${clubName}`)
      .digest("hex")
      .slice(0, 16);
    if (sig !== expected) return null;
    return { userId, clubName };
  } catch {
    return null;
  }
}

/**
 * GET /api/team-reminder/snooze?token=...&duration=week|month|year|forever
 *
 * Called when user clicks a snooze link in the team reminder email.
 * No auth required — token is HMAC-signed.
 * Redirects to a confirmation page after saving.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token") ?? "";
  const duration = searchParams.get("duration") ?? "week";

  const payload = verifyToken(token);
  if (!payload) {
    return new Response("Invalid or expired link.", { status: 400 });
  }

  const { userId, clubName } = payload;

  // Calculate snoozedUntil
  let snoozedUntil: Date | null = null;
  if (duration !== "forever") {
    snoozedUntil = new Date();
    if (duration === "week")  snoozedUntil.setDate(snoozedUntil.getDate() + 7);
    if (duration === "month") snoozedUntil.setMonth(snoozedUntil.getMonth() + 1);
    if (duration === "year")  snoozedUntil.setFullYear(snoozedUntil.getFullYear() + 1);
  }

  await prisma.teamReminderSnooze.upsert({
    where: { userId_clubName: { userId, clubName } },
    update: { snoozedUntil },
    create: { userId, clubName, snoozedUntil },
  });

  const durationLabel =
    duration === "forever" ? "forever" :
    duration === "year"    ? "1 year" :
    duration === "month"   ? "1 month" : "1 week";

  // Redirect to a simple confirmation page
  const url = new URL("/team-reminder/snoozed", req.url);
  url.searchParams.set("club", clubName);
  url.searchParams.set("for", durationLabel);
  return Response.redirect(url.toString(), 302);
}
