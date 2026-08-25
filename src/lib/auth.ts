import { NextAuthOptions, DefaultSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { normalizeEmail } from "@/lib/email";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      isSuperAdmin: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    role: string;
    isSuperAdmin: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: string;
    id?: string;
    isSuperAdmin: boolean;
  }
}

export async function authenticateWithCredentials(emailRaw: string, password: string) {
  const email = normalizeEmail(emailRaw);
  const user = await prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
  });
  if (!user?.passwordHash) return null;

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return null;

  if (user.isSuperAdmin) {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: "SUPER_ADMIN",
      isSuperAdmin: true,
    };
  }

  const membership = await prisma.membership.findFirst({
    where: { userId: user.id, status: "ACTIVE", tenant: { status: "ACTIVE" } },
    orderBy: { createdAt: "asc" },
  });
  if (!membership) return null;

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: membership.role,
    isSuperAdmin: false,
  };
}

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "admin@nexus.ai" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        return authenticateWithCredentials(credentials.email, credentials.password);
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.id = user.id;
        token.isSuperAdmin = user.isSuperAdmin;
      }
      return token;
    },
    async session({ session, token }) {
      if (session?.user) {
        session.user.role = token.role;
        session.user.id = (token.id as string) || (token.sub as string);
        session.user.isSuperAdmin = token.isSuperAdmin ?? false;
      }
      return session;
    },
  },
  pages: {
    signIn: "/admin/login",
  },
  session: {
    strategy: "jwt",
  },
};
