import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

let connectionString = process.env.DATABASE_URL;

// Fix PostgreSQL SSL warnings by treating aliases as verify-full
if (connectionString) {
  connectionString = connectionString.replace(
    /sslmode=(require|prefer|verify-ca)/g,
    "sslmode=verify-full"
  );
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function createPrismaClient() {
  // During build time on Vercel, DATABASE_URL might be missing.
  // We avoid throwing at build time to allow static generation (where DB is not used) to pass.
  if (!connectionString) {
    console.warn("DATABASE_URL is not set. Prisma will only work if provided at runtime.");
    return new PrismaClient(); 
  }

  try {
    const pool = new Pool({ connectionString });
    const adapter = new PrismaPg(pool);
    return new PrismaClient({ adapter });
  } catch (error) {
    console.error("Failed to initialize Prisma with PostgreSQL adapter:", error);
    return new PrismaClient();
  }
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
