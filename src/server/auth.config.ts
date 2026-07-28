import type { NextAuthConfig } from "next-auth";

/**
 * Runtime-safe auth config (no Prisma, no bcrypt) shared with Proxy.
 * Providers that need the database are added in auth.ts (server-only).
 */
export const authConfig = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      if (user) token.id = user.id;
      return token;
    },
    session({ session, token }) {
      if (session.user && token.id) session.user.id = token.id as string;
      return session;
    },
  },
} satisfies NextAuthConfig;
