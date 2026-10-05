"""Curated safe public-path wordlist (bounded)."""

from __future__ import annotations

SAFE_PUBLIC_PATHS: list[str] = [
    "/login",
    "/logout",
    "/register",
    "/signup",
    "/signin",
    "/admin",
    "/dashboard",
    "/account",
    "/profile",
    "/api",
    "/api/docs",
    "/api/users",
    "/api/search",
    "/api/config",
    "/docs",
    "/swagger",
    "/swagger.json",
    "/openapi.json",
    "/graphql",
    "/health",
    "/status",
    "/robots.txt",
    "/sitemap.xml",
    "/.well-known/security.txt",
    "/.well-known/change-password",
    "/.well-known/assetlinks.json",
    "/.well-known/apple-app-site-association",
    "/favicon.ico",
    "/hidden-page",
    "/about",
    "/contact",
    "/.env",
    "/.env.example",
    "/config.json",
    "/package.json",
    "/server-status",
    "/debug",
]


WELL_KNOWN_PATHS: list[str] = [
    "/.well-known/security.txt",
    "/.well-known/change-password",
    "/.well-known/assetlinks.json",
    "/.well-known/apple-app-site-association",
]
