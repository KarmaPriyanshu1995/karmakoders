# sign/documents

Document lifecycle: draft → send → in progress → completed / voided / declined / expired.
Owns content snapshots, hashes, and sender-facing status queries for the dashboard.

## Access rule

Every Sign API route, page and Server Action that reads or changes a document goes through
`access.ts` (`getDocumentForOwner`, `listDocumentsForOwner`) — or, for signers, the
`sign/signing` access modules. Never query `prisma.signDocument` / `prisma.signSigner` from
`src/app/tools/sign`, `src/app/api/tools/sign` or a Server Action:
`src/modules/sign/access-boundary.test.ts` fails the build if you do.

A document that doesn't exist, belongs to another customer or is soft-deleted throws
`NotFoundError` (→ 404, never 403), so other people's documents are never revealed to exist.
