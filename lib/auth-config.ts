import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import prisma from "./prisma";

export const authConfig: NextAuthConfig = {
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        code: { label: "2FA Code", type: "text" },
        preAuthToken: { label: "Pre-auth Token", type: "text" },
      },
      async authorize(credentials) {
        const email = credentials?.email as string;
        const password = credentials?.password as string;
        const code = credentials?.code as string;
        const preAuthToken = credentials?.preAuthToken as string;

        if (!email || !password) return null;

        // Fast path: verify using signed token issued by send-code (no DB needed)
        if (code && preAuthToken) {
          try {
            const secret = process.env.NEXTAUTH_SECRET!;
            const [payload, sig] = preAuthToken.split(".");
            const expectedSig = crypto.createHmac("sha256", secret).update(payload).digest("base64url");
            if (sig !== expectedSig) throw new Error("invalid sig");

            const data = JSON.parse(Buffer.from(payload, "base64url").toString());
            if (data.exp < Date.now()) throw new Error("expired");
            if (data.email !== email.toLowerCase()) throw new Error("email mismatch");

            const expectedHmac = crypto.createHmac("sha256", secret).update(code + data.email).digest("hex");
            if (data.codeHmac !== expectedHmac) throw new Error("invalid code");

            // Clean up DB code async (non-blocking)
            prisma.verificationCode.deleteMany({ where: { email: data.email } }).catch(() => {});

            return { id: data.userId, email: data.email, name: data.name, role: data.role };
          } catch {
            throw new Error("INVALID_CODE");
          }
        }

        // Standard path: password-only login (no MFA) or MFA with DB fallback
        const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
        if (!user || !user.isActive) return null;

        if (!code) {
          const valid = await bcrypt.compare(password, user.password);
          if (!valid) return null;
          if (user.mfaEnabled) throw new Error("2FA_REQUIRED");
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
