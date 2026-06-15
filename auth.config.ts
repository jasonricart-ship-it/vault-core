import type { NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth";

export const authConfig = {
  secret: process.env.NEXTAUTH_SECRET,
  providers: [],
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }
      return session;
    },
  },
} satisfies NextAuthOptions;

export function getSession() {
  return getServerSession(authConfig);
}
