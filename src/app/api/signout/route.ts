import { NextResponse } from "next/server";

/**
 * GET /api/signout
 * Server-side sign-out: clears all NextAuth session cookies
 * and redirects to the home page.
 * Called directly from static HTML — no CSRF, no JS framework needed.
 */
export async function GET() {
  const base = process.env.NEXTAUTH_URL ?? "https://matchkoo.com";
  const response = NextResponse.redirect(new URL("/", base));

  // Clear every possible NextAuth session cookie variant
  const cookieOpts = {
    path: "/",
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    maxAge: 0, // expire immediately
  };

  response.cookies.set("next-auth.session-token", "", cookieOpts);
  response.cookies.set("__Secure-next-auth.session-token", "", cookieOpts);
  response.cookies.set("next-auth.csrf-token", "", cookieOpts);
  response.cookies.set("__Secure-next-auth.csrf-token", "", cookieOpts);
  response.cookies.set("next-auth.callback-url", "", cookieOpts);
  response.cookies.set("__Host-next-auth.csrf-token", "", cookieOpts);

  return response;
}
