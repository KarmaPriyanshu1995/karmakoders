"""Shared helpers for the Phase 3B audit tests (test-only)."""

from __future__ import annotations

import asyncio
import base64
import contextlib
import json
import os
import socket
import subprocess
import urllib.request
from pathlib import Path
from typing import Iterator
from unittest import mock

from modules.api_security import ApiSecurityScanner, input_from_sources

FIXTURES = Path(__file__).resolve().parents[2] / "modules" / "api_security" / "tests" / "fixtures"


def load(name: str) -> str:
    return (FIXTURES / name).read_text(encoding="utf-8")


def run(coro):  # noqa: ANN001, ANN201
    return asyncio.run(coro)


def scan(policy=None, **sources):  # noqa: ANN001, ANN003, ANN201
    return run(ApiSecurityScanner(scope_policy=policy).scan(input_from_sources(**sources)))


def results(res, check_id: str):  # noqa: ANN001, ANN201
    return [r for r in res.check_results if r.check_id == check_id]


def jwt(header: dict, payload: dict, signature: str = "c2ln") -> str:
    enc = lambda d: base64.urlsafe_b64encode(json.dumps(d).encode()).decode().rstrip("=")  # noqa: E731
    return f"{enc(header)}.{enc(payload)}.{signature}"


def spec(paths: dict, **extra) -> str:  # noqa: ANN003
    doc = {"openapi": "3.0.3", "info": {"title": "T", "version": "1"}, "servers": [{"url": "https://t.example"}], "paths": paths}
    doc.update(extra)
    return json.dumps(doc)


def response_schema(props: dict, status: str = "200") -> dict:
    return {"responses": {status: {"description": "x", "content": {"application/json": {"schema": {
        "type": "object", "properties": {k: {"type": "string"} for k in props}}}}}}}


class NetworkAttempt(AssertionError):
    pass


@contextlib.contextmanager
def no_network_or_processes() -> Iterator[list[str]]:
    """Fail on any DNS/socket/HTTP/subprocess/shell use; yields the list of attempts."""
    attempts: list[str] = []

    def deny(name):  # noqa: ANN001, ANN202
        def _f(*a, **k):  # noqa: ANN002, ANN003, ANN202
            attempts.append(f"{name}{a[:1]}")
            raise NetworkAttempt(f"{name} attempted")
        return _f

    patches = [
        mock.patch.object(socket, "getaddrinfo", deny("getaddrinfo")),
        mock.patch.object(socket, "gethostbyname", deny("gethostbyname")),
        mock.patch.object(socket, "create_connection", deny("create_connection")),
        mock.patch.object(urllib.request, "urlopen", deny("urlopen")),
        mock.patch.object(subprocess, "Popen", deny("Popen")),
        mock.patch.object(subprocess, "run", deny("subprocess.run")),
        mock.patch.object(os, "system", deny("os.system")),
        mock.patch.object(os, "popen", deny("os.popen")),
    ]
    for p in patches:
        p.start()
    try:
        yield attempts
    finally:
        for p in reversed(patches):
            p.stop()
