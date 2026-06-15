import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
// import GoogleProvider from "next-auth/providers/google";
import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import { authConfig } from "@/auth.config";

export const authOptions: NextAuthOptions = {
  ...authConfig,
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const email = credentials.email.trim().toLowerCase();
        const account = await prisma.account.findUnique({ where: { email } });

        if (
          !account ||
          !verifyPassword(credentials.password, account.password_hash)
        ) {
          return null;
        }

        return {
          id: account.id,
          email: account.email,
          role: account.role,
        };
      },
    }),
    // GoogleProvider({
    //   clientId: process.env.GOOGLE_CLIENT_ID!,
    //   clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    // }),
  ],
};
