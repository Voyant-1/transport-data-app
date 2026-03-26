import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import prisma from "./prisma";

export const authConfig: NextAuthConfig = {
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        code: { label: "2FA Code", type: "text" },
      },
      async authorize(credentials) {
        const email = credentials?.email as string;
        const password = credentials?.password as string;
        const code = credentials?.code as string;

        if (!email || !password) return null;

        const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
        if (!user) return null;
        if (!user.isActive) return null;

        const valid = await bcrypt.compare(password, user.password);
        if (!valid) return null;

        // If MFA enabled, verify the code
        if (user.mfaEnabled) {
          if (!code) {
            throw new Error("2FA_REQUIRED");
          }

          const emailLower = email.toLowerCase();

          // Debug: check what codes exist for this email
          const allCodes = await prisma.verificationCode.findMany({
            where: { email: emailLower },
          });
          console.log(`[2FA DEBUG] Looking for code="${code}" for email="${emailLower}"`);
          console.log(`[2FA DEBUG] Found ${allCodes.length} codes in DB:`, allCodes.map(c => ({ code: c.code, expires: c.expiresAt, now: new Date() })));

          const verification = await prisma.verificationCode.findFirst({
            where: {
              email: emailLower,
              code,
              expiresAt: { gt: new Date() },
            },
            orderBy: { createdAt: "desc" },
          });

          if (!verification) {
            console.log(`[2FA DEBUG] No matching verification found!`);
            throw new Error("INVALID_CODE");
          }

          // Delete used code
          await prisma.verificationCode.delete({ where: { id: verification.id } });
        }

        return { id: user.id, email: user.email, name: user.name, role: user.role };
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnLogin = nextUrl.pathname.startsWith("/login");
      const isAuthApi = nextUrl.pathname.startsWith("/api/auth");
      const isForgotPassword = nextUrl.pathname.startsWith("/forgot-password");
      const isResetPassword = nextUrl.pathname.startsWith("/reset-password");

      if (isAuthApi) return true;
      if (isOnLogin) return true;
      if (isForgotPassword) return true;
      if (isResetPassword) return true;
      if (!isLoggedIn) return false;
      return true;
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role;
      }
      return token;
    },
    session({ session, token }) {
      if (token?.id) {
        session.user.id = token.id as string;
      }
      if (token?.role) {
        (session.user as { role?: string }).role = token.role as string;
      }
      return session;
    },
  },
  session: { strategy: "jwt" },
};
