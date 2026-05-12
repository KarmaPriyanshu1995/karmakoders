
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import "dotenv/config";

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Testing contactSubmission.create with phone field...');
  try {
    const test = await (prisma.contactSubmission as any).create({
      data: {
        name: "Test User",
        email: "test@example.com",
        phone: "1234567890",
        message: "Test message"
      }
    });
    console.log('Success:', test);
  } catch (error) {
    console.error('Error:', error);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
