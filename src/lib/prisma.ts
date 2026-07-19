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

// Simple retry helper for DB operations (cold-start mitigation)
export async function withDbRetry<T>(fn: () => Promise<T>, retries = 3, delay = 1000): Promise<T> {
  let lastError: any;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err: any) {
      lastError = err;
      
      // Determine if error is connection-related (timeouts, pool exhaustion, Neon wake-up etc.)
      const isConnError =
        err.message?.includes("connection") ||
        err.message?.includes("timeout") ||
        err.message?.includes("Pool") ||
        err.code === "P1001" || // Prisma: Could not reach database
        err.code === "P1002" || // Prisma: Connection timed out
        err.code === "P1008" || // Prisma: Operations timed out
        err.code === "ECONNREFUSED" ||
        err.code === "ETIMEDOUT" ||
        err.code === "EPIPE" ||
        err.code === "ECONNRESET";

      if (!isConnError && i === 0) {
        // If it's a structural DB/programming error, throw immediately
        throw err;
      }

      console.warn(`[DB Connection Retry] Attempt ${i + 1}/${retries} failed. Retrying in ${delay}ms...`, err.message || err);
      if (i < retries - 1) {
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay *= 2; // exponential backoff
      }
    }
  }
  throw lastError;
}

function createPrismaClient() {
  // During build time on Vercel, DATABASE_URL might be missing.
  // We avoid throwing at build time to allow static generation (where DB is not used) to pass.
  if (!connectionString) {
    console.warn("DATABASE_URL is not set. Prisma will only work if provided at runtime.");
    return new PrismaClient(); 
  }

  try {
    const pool = new Pool({
      connectionString,
      max: 10,                 // Limit pool to 10 connections
      idleTimeoutMillis: 30000, // Close idle connections after 30 seconds
      connectionTimeoutMillis: 15000, // Neon cold-start window (up to 15s to establish connection)
    });
    const adapter = new PrismaPg(pool);
    return new PrismaClient({ adapter });
  } catch (error) {
    console.error("Failed to initialize Prisma with PostgreSQL adapter:", error);
    return new PrismaClient();
  }
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
