"""Phase G GitHub package."""

from .fetch import SnapshotResult, fetch_repo_snapshot, materialize_from_directory
from .gate import RepoAuthz, assert_repo_authorized
from .settings import GitHubAppSettings, get_github_settings
from .tokens import AccessToken, mint_installation_token
from .webhook import parse_installation_event, verify_webhook_signature

__all__ = [
    "AccessToken",
    "GitHubAppSettings",
    "RepoAuthz",
    "SnapshotResult",
    "assert_repo_authorized",
    "fetch_repo_snapshot",
    "get_github_settings",
    "materialize_from_directory",
    "mint_installation_token",
    "parse_installation_event",
    "verify_webhook_signature",
]
