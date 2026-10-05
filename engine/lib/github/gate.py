"""Central authorization gate for Phase G repo scans."""

from __future__ import annotations

from dataclasses import dataclass
from uuid import UUID

import psycopg


@dataclass(frozen=True)
class RepoAuthz:
    allowed: bool
    reason: str
    installation_row_id: UUID | None = None
    github_installation_id: int | None = None
    repo_row_id: UUID | None = None
    owner: str | None = None
    name: str | None = None
    full_name: str | None = None
    default_branch: str | None = None
    private: bool = True
    status: str | None = None


async def assert_repo_authorized(
    conn: psycopg.AsyncConnection,
    *,
    project_id: UUID,
    owner: str | None = None,
    name: str | None = None,
    full_name: str | None = None,
    github_repo_id: UUID | None = None,
) -> RepoAuthz:
    """
    Hard gate: project-scoped installation must be active and cover the repo.
    Never trust caller-supplied owner/name alone without DB grant.
    """
    owner_n = (owner or "").strip().lower()
    name_n = (name or "").strip().lower()
    full = (full_name or "").strip().lower()
    if not full and owner_n and name_n:
        full = f"{owner_n}/{name_n}"

    async with conn.cursor() as cur:
        if github_repo_id is not None:
            await cur.execute(
                """
                SELECT
                  r.id AS repo_id,
                  r.owner,
                  r.name,
                  r.full_name,
                  r.default_branch,
                  r.private,
                  r.selected,
                  i.id AS installation_row_id,
                  i.installation_id,
                  i.status,
                  i.suspended,
                  i.project_id
                FROM github_repos r
                JOIN github_installations i ON i.id = r.installation_id
                WHERE r.id = %s
                LIMIT 1
                """,
                (str(github_repo_id),),
            )
        elif full:
            await cur.execute(
                """
                SELECT
                  r.id AS repo_id,
                  r.owner,
                  r.name,
                  r.full_name,
                  r.default_branch,
                  r.private,
                  r.selected,
                  i.id AS installation_row_id,
                  i.installation_id,
                  i.status,
                  i.suspended,
                  i.project_id
                FROM github_repos r
                JOIN github_installations i ON i.id = r.installation_id
                WHERE r.project_id = %s
                  AND lower(r.full_name) = %s
                LIMIT 1
                """,
                (str(project_id), full),
            )
        else:
            return RepoAuthz(False, "missing_repo_identity")

        row = await cur.fetchone()

    if row is None:
        return RepoAuthz(False, "repo_not_authorized")

    # Cross-project isolation
    if str(row["project_id"]) != str(project_id):
        return RepoAuthz(False, "cross_project_denied")

    status = str(row["status"] or "")
    if row.get("suspended") or status == "suspended":
        return RepoAuthz(False, "installation_suspended", status=status)
    if status in {"uninstalled", "revoked"}:
        return RepoAuthz(False, f"installation_{status}", status=status)
    if status != "active":
        return RepoAuthz(False, "installation_not_active", status=status)
    if not row.get("selected", True):
        return RepoAuthz(False, "repo_not_selected")

    return RepoAuthz(
        True,
        "ok",
        installation_row_id=UUID(str(row["installation_row_id"])),
        github_installation_id=int(row["installation_id"]),
        repo_row_id=UUID(str(row["repo_id"])),
        owner=str(row["owner"]),
        name=str(row["name"]),
        full_name=str(row["full_name"]),
        default_branch=str(row["default_branch"] or "main"),
        private=bool(row["private"]),
        status=status,
    )
