-- AlterTable
ALTER TABLE "Post" ADD COLUMN IF NOT EXISTS "blocks" JSONB;
ALTER TABLE "Post" ADD COLUMN IF NOT EXISTS "formatMeta" JSONB;
ALTER TABLE "Post" ADD COLUMN IF NOT EXISTS "readTimeMinutes" INTEGER;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Post_tenantId_type_idx" ON "Post"("tenantId", "type");
