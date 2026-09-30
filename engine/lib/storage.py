"""Evidence storage seam. Local/DB text for MVP; R2 later."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class StoredEvidence:
    redacted_text: str | None
    storage_pointer: str | None


class Storage:
    """Abstract place to keep large evidence blobs.

    MVP: keep short redacted text in Postgres only.
    # TODO: drop in Cloudflare R2 behind this interface.
    """

    def store_text(self, *, kind: str, text: str) -> StoredEvidence:
        # Cap so we never dump huge HTML bodies into the DB.
        clipped = text if len(text) <= 4000 else text[:4000] + "\n…[truncated]"
        return StoredEvidence(redacted_text=clipped, storage_pointer=None)


default_storage = Storage()
