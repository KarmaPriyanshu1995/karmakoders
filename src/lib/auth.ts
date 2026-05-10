import { NextAuthOptions, DefaultSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
    } & DefaultSession["user"]
  }

  interface User {
    role: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: string;
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "admin@nexus.ai" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        const adminEmail = process.env.ADMIN_EMAIL ?? "karmakoders@gmail.com";
        const adminPassword = process.env.ADMIN_PASSWORD ?? "karmakoders@admin";
        
        const superAdminEmail = process.env.SUPER_ADMIN_EMAIL ?? "priyanshu@karmakoders.com";
        const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD ?? "priyanshu@super";

        if (
          credentials?.email === superAdminEmail &&
          credentials?.password === superAdminPassword
        ) {
          return { id: "0", name: "Super Admin", email: superAdminEmail, role: "SUPER_ADMIN" };
        }

        if (
          credentials?.email === adminEmail &&
          credentials?.password === adminPassword
        ) {
          return { id: "1", name: "Admin", email: adminEmail, role: "ADMIN" };
        }
        return null;
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session?.user) {
        session.user.role = token.role;
      }
      return session;
    }
  },
  pages: {
    signIn: "/admin/login",
  },
  session: {
    strategy: "jwt",
  },
};
