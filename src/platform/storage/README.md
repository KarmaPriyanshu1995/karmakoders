# platform/storage

Private Cloudflare R2 client with AES-256-GCM envelope encryption for drafts and signed PDFs.
UploadThing is never used for Sign files; metadata (iv, tag, key version) lives in Prisma.
