import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "./prisma";
import bcrypt from "bcryptjs";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as any,
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          select: { id: true, email: true, name: true, password: true, role: true, xp: true, streak: true, predictionCount: true, gender: true, emailVerified: true, country: true },
        });

        if (!user || !user.password) return null;

        const isPasswordValid = await bcrypt.compare(credentials.password, user.password);
        if (!isPasswordValid) return null;

        // Block login until email is verified
        if (!user.emailVerified) {
          throw new Error("EMAIL_NOT_VERIFIED");
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          xp: user.xp,
          streak: (user as any).streak ?? 0,
          predictionCount: (user as any).predictionCount ?? 0,
          gender: (user as any).gender ?? "male",
          country: (user as any).country ?? "EG",
        };
      },
    }),
  ],
  callbacks: {
    async session({ token, session }) {
      if (token && session.user) {
        session.user.id   = token.id as string;
        session.user.role = token.role as string;
        session.user.name = token.name as string;
        session.user.email = token.email as string;
        session.user.image = token.image as string;
        (session.user as any).xp              = token.xp as number;
        (session.user as any).streak          = token.streak as number ?? 0;
        (session.user as any).bestStreak      = token.bestStreak as number ?? 0;
        (session.user as any).predictionCount = token.predictionCount as number ?? 0;
        (session.user as any).correctCount    = token.correctCount as number ?? 0;
        (session.user as any).gender          = token.gender as string ?? "male";
        (session.user as any).country         = token.country as string ?? "EG";
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id              = user.id;
        token.role            = (user as any).role;
        token.xp              = (user as any).xp ?? 0;
        token.streak          = (user as any).streak ?? 0;
        token.bestStreak      = (user as any).bestStreak ?? 0;
        token.predictionCount = (user as any).predictionCount ?? 0;
        token.correctCount    = (user as any).correctCount ?? 0;
        token.gender          = (user as any).gender ?? "male";
        token.country         = (user as any).country ?? "EG";
      }
      // Refresh user fields from DB on every token refresh (so it stays current)
      if (token.id && !user) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: { name: true, image: true, xp: true, role: true, streak: true, bestStreak: true, predictionCount: true, correctCount: true, gender: true, country: true },
          });
          if (dbUser) {
            token.name            = dbUser.name;
            token.image           = dbUser.image;
            token.xp              = dbUser.xp;
            token.role            = dbUser.role;
            token.streak          = dbUser.streak;
            token.bestStreak      = dbUser.bestStreak;
            token.predictionCount = dbUser.predictionCount;
            token.correctCount    = dbUser.correctCount;
            token.gender          = dbUser.gender ?? "male";
            token.country         = dbUser.country ?? "EG";
          }
        } catch {}
      }
      return token;
    },
    async redirect({ url, baseUrl }) {
      // Allow relative URLs
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      if (url.startsWith(baseUrl)) return url;
      return `${baseUrl}/app`;
    },
  },
};
