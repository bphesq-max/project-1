import type { NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";

import {
  ensureOAuthAccount,
  findAccountByEmail,
  verifyPassword,
} from "@/lib/memberAccounts";

const providers: NextAuthOptions["providers"] = [
  Credentials({
    name: "Email",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials) {
      const email = credentials?.email?.trim();
      const password = credentials?.password;

      if (!email || !password) {
        return null;
      }

      const account = await findAccountByEmail(email);
      if (!account?.passwordHash) {
        return null;
      }

      const isValid = await verifyPassword(password, account.passwordHash);
      if (!isValid) {
        return null;
      }

      return {
        id: account.id,
        email: account.email,
        name: account.fullName,
        role: account.role,
      };
    },
  }),
];

if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) {
  providers.push(
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    })
  );
}

export const authOptions: NextAuthOptions = {
  secret: process.env.AUTH_SECRET || "development-only-auth-secret-change-me",
  session: {
    strategy: "jwt",
  },
  providers,
  pages: {
    signIn: "/members",
  },
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google" && user.email) {
        await ensureOAuthAccount({
          email: user.email,
          fullName: user.name,
          provider: "google",
        });
      }

      return true;
    },
    async jwt({ token, user }) {
      if (user?.email) {
        const account = await findAccountByEmail(user.email);
        token.role = account?.role ?? "member";
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
        session.user.role = (token.role as "member" | "admin" | undefined) ?? "member";
      }

      return session;
    },
  },
};
