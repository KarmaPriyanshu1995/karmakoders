ALTER TABLE "tools" ADD COLUMN "twitterTitle" TEXT;
ALTER TABLE "tools" ADD COLUMN "twitterDescription" TEXT;
ALTER TABLE "tools" ADD COLUMN "twitterImage" TEXT;
ALTER TABLE "tools" ADD COLUMN "schemaType" TEXT NOT NULL DEFAULT 'WebApplication';

CREATE TABLE "usage_events" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "toolId" TEXT,
    "toolSlug" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "visitorKey" TEXT NOT NULL,
    "returning" BOOLEAN NOT NULL DEFAULT false,
    "country" TEXT NOT NULL DEFAULT '',
    "city" TEXT NOT NULL DEFAULT '',
    "device" TEXT NOT NULL DEFAULT '',
    "browser" TEXT NOT NULL DEFAULT '',
    "channel" TEXT NOT NULL DEFAULT 'direct',
    "referrerHost" TEXT NOT NULL DEFAULT '',
    "durationMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usage_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "usage_events_tenantId_createdAt_idx" ON "usage_events"("tenantId", "createdAt");
CREATE INDEX "usage_events_tenantId_toolSlug_createdAt_idx" ON "usage_events"("tenantId", "toolSlug", "createdAt");
CREATE INDEX "usage_events_tenantId_eventType_createdAt_idx" ON "usage_events"("tenantId", "eventType", "createdAt");
CREATE INDEX "usage_events_tenantId_visitorKey_idx" ON "usage_events"("tenantId", "visitorKey");
CREATE INDEX "usage_events_toolId_idx" ON "usage_events"("toolId");

ALTER TABLE "usage_events" ADD CONSTRAINT "usage_events_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "usage_events" ADD CONSTRAINT "usage_events_toolId_fkey" FOREIGN KEY ("toolId") REFERENCES "tools"("id") ON DELETE SET NULL ON UPDATE CASCADE;
