-- CreateTable
CREATE TABLE "sign_signer_sessions" (
    "id" UUID NOT NULL,
    "signer_id" UUID NOT NULL,
    "document_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "ip" TEXT,
    "user_agent" TEXT,
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sign_signer_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sign_signer_sessions_token_hash_key" ON "sign_signer_sessions"("token_hash");

-- CreateIndex
CREATE INDEX "sign_signer_sessions_signer_id_idx" ON "sign_signer_sessions"("signer_id");

-- CreateIndex
CREATE INDEX "sign_signer_sessions_document_id_idx" ON "sign_signer_sessions"("document_id");

-- AddForeignKey
ALTER TABLE "sign_signer_sessions" ADD CONSTRAINT "sign_signer_sessions_signer_id_fkey" FOREIGN KEY ("signer_id") REFERENCES "sign_signers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sign_signer_sessions" ADD CONSTRAINT "sign_signer_sessions_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "sign_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

