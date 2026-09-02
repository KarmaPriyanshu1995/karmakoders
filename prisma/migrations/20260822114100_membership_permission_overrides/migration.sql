-- Hand-authored (see 20260821220000_multitenant_foundation for why: the
-- shadow-database replay of the historical 20260509141623_init migration
-- fails on Postgres). Applied directly via `prisma migrate deploy`.

ALTER TABLE "Membership" ADD COLUMN "permissionOverrides" JSONB;
