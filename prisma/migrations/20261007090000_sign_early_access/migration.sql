-- Task: sign_early_access table for landing-page early-access signups.
-- ADDITIVE ONLY: creates one table and its unique index. No DROP, no change to existing tables.
-- Generated offline with `prisma migrate diff` (previous schema -> schema with SignEarlyAccess).

-- CreateTable
CREATE TABLE "sign_early_access" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "company" TEXT,
    "role" TEXT,
    "source" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sign_early_access_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sign_early_access_email_key" ON "sign_early_access"("email");
