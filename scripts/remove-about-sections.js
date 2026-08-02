const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");
require("dotenv/config");

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🧹 Deleting team and testimonials sections from the About page in the DB...");

  // Delete section-about-team
  const deleteTeam = await prisma.section.deleteMany({
    where: { id: "section-about-team" }
  });
  console.log(`   ✅ Deleted team section count: ${deleteTeam.count}`);

  // Delete section-about-testimonials
  const deleteTestimonials = await prisma.section.deleteMany({
    where: { id: "section-about-testimonials" }
  });
  console.log(`   ✅ Deleted testimonials section count: ${deleteTestimonials.count}`);

  console.log("🎉 Database sections successfully updated!");
}

main()
  .catch((e) => {
    console.error("❌ Error updating database:", e);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
