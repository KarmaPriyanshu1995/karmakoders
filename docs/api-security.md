# API Security — Phase 3A foundation + Phase 3B passive analysis

> **Phase 3A established the foundation. Phase 3B adds API specification intelligence and
> deterministic passive checks.** Neither phase sends API requests or performs active,
> exploitation or authorization-bypass testing. Phase 3B findings are specification
> concerns, inventory observations, token-structure observations or observations from
> existing evidence — never confirmed vulnerabilities.

## Architecture

```
KarmaKoders platform (worker, stages, DB, UI)
        │
        ▼
modules/api_security/adapters/karmakoders/   ← the ONLY code that imports lib.* / psycopg
        │   attack surface → ApiScanInput, ownership, scope, limits, redaction, findings, stage
        ▼
modules/api_security/                         ← core: pure Python, no DB / web framework
   contracts/   parsers/   inventory/   registry/   runner/   ports.py   redaction.py
   analysis/  (3B: name rules, endpoint classification, JWT structure, spec-import plan, context)
   passive/   (3B: the eight passive checks)
```

Dependency direction is one-way: platform → adapter → core. The core never imports
`lib`, `psycopg`, Next.js or React. `tests/test_isolation.py` enforces this both
statically (AST scan of every core file) and dynamically (a clean interpreter imports
the core, runs scans, and asserts no `lib`/`psycopg` module was loaded).

### Public interface

Platforms use only `modules.api_security`:

```python
from modules.api_security import ApiSecurityScanner, input_from_openapi

result = await ApiSecurityScanner(scope_policy=policy).scan(input_from_openapi(text))
result.to_dict()   # redacted, JSON-serialisable, platform-independent
```

Exports: `ApiSecurityScanner`, `input_from_curl / input_from_openapi / input_from_graphql /
input_from_endpoints / input_from_sources` (3B), `supplied_token` (3B), `plan_spec_imports` (3B), the contracts, `CheckRegistry` / `default_registry`, the
`ApiSecurityRepository` port with `InMemoryApiSecurityRepository`, `AllowListScopePolicy`,
and `ApiInputError`.

## Contracts (`contracts/`)

| Contract | Purpose |
|---|---|
| `ApiTarget` | Input origin: `curl`, `openapi`, `swagger`, `graphql`, `discovered_api`, `manual_endpoint` (an enum: add `postman`/`har`/`sdk` without redesign) |
| `ApiScanInput` | target, endpoints, requests, specifications, graphql, authentication, scope, ownership, config |
| `ApiEndpoint` | method, host, path, source, parameters, headers (names), body, responses, content type, auth requirement, operationId, tags, metadata |
| `ApiRequest` / `ApiResponse` | Structured HTTP data. Credentials held as `SecretValue`; `to_dict()` is always redacted |
| `ApiAuthenticationContext` | scheme (bearer/basic/api_key/cookie/oauth2/oidc/custom), carrier, profile. Credential never serialised |
| `ApiScanConfig` / `ApiLimits` | Single configuration boundary: mode, limits, enabled checks |
| `OwnershipContext` | `verified`, `active_testing_allowed` (false in 3A/3B; in 3C true only when ownership is verified AND `API_SECURITY_ACTIVE_ENABLED` is on) |
| `ActiveTestPlan` / `TestIdentity` / `TestObject` (3C) | Operator-supplied authorized active-testing inputs: identities (role + credential as `SecretValue`) and the specific test objects to request. Never persisted |
| `HttpTransport` port / `TransportResult` (3C) | The only way the core sends a request, and only when a platform injects an implementation. A denied/unsent request is "not observed", never evidence |
| `ScopePolicy` / `ScopeDecision` | "Is this URL in the approved scope?" |
| `ApiCoverage` | discovered / tested / not_tested / skipped / inconclusive / error |
| `CheckDefinition` / `ApiCheckResult` | Check metadata; result statuses pass / vulnerable / potential / inconclusive / not_tested / error |
| `ApiScanResult` | status, coverage, endpoints, check results, errors (kept separate from findings), statistics |
| `EvidenceBasis` (3B) | `specification` / `inventory` / `token_structure` / `live_observation` / `confirmed` — what a result rests on |
| `ApiObservation` (3B) | A response an existing authorized platform component already received (never produced by the API core) |
| `DiscoveredResource` (3B) | Documentation / GraphQL IDE / debug URL from existing inventory, with the status discovery recorded |
| `SpecImportCandidate` (3B) | A discovered spec URL classified for a later, explicitly authorized import (never fetched) |

Phase 3B extended existing contracts additively (all new fields default to empty, so
Phase 3A callers are unaffected): `ApiCheckResult` gained `rule_id`, `evidence_basis`,
`location`, `description`, `impact`, `remediation`, `verification`; `ApiResponseSpec`
gained `properties`, `headers`, `header_values`; `SecurityScheme` gained `http_scheme`,
`flow_urls`; `ApiSpecification` gained `extensions`; `GraphQLTarget` gained `fields`,
`input_types`, `root_types`; `ApiScanInput` gained `observations`,
`discovered_resources`, `input_errors`.

## Inputs

### cURL (`parsers/curl.py`)
The pasted text is **parsed, never executed**. Nothing is passed to a shell, a subprocess
or `eval`. A small quote-aware lexer handles single and double quotes, backslash escapes and `\`/`^`
line continuations. It rejects shell operators and expansions (`;` `&` `|` `<` `>` `(` `)` `` ` `` `$`)
outside single quotes with an `unsupported_shell_syntax` error.

Supported: `-X/--request`, `-H/--header`, `-d/--data/--data-raw/--data-binary/--data-ascii`,
`--data-urlencode`, `--json`, `--url`, `-b/--cookie`, `-A/--user-agent`, `-u/--user`,
`-e/--referer`, `-G/--get`, `-I/--head`; methods GET/POST/PUT/PATCH/DELETE/HEAD/OPTIONS.

Refused: local file reads (`-d @file`, cookie files, `-K`, `-T`, `-F`), output files
(`-o`, `-O`, `-c`, `-D`), proxies, `--resolve`/`--connect-to`, unix sockets, non-http(s)
URLs, credentials embedded in URLs, and unknown options.

### OpenAPI / Swagger (`parsers/openapi.py`)
Swagger 2.0, OpenAPI 3.0.x and 3.1.x, in JSON or YAML. YAML uses PyYAML `SafeLoader` with
aliases disabled. Specs are treated as untrusted input:
size limit, nesting depth (64), node count, duplicate keys rejected, invalid methods/paths
warned, local `$ref`s resolved with cycle bounds. **External `$ref`s are recorded in
`unresolved_refs` and never fetched.** Extracted: version, servers / host+basePath,
paths, methods, operationId, tags, summaries, parameters (path-level merged), request
bodies (shallow property names), responses, security schemes and requirements
(`[]` and `[{}]` mean public).

Phase 3B additions (still offline): response-schema property paths (nested through local
`$ref`s, arrays and `allOf/oneOf/anyOf`, depth 4, 300 paths, cycle-safe; `writeOnly`
properties excluded), documented response header names and documented literal values of
`Access-Control-*` headers, the raw HTTP auth scheme and OAuth2 flow URLs, per-operation
`security_requirements` / `security_source` (`operation` | `global` | `none`) /
`undefined_security_schemes`, operation description, path API version (`/v2/...`),
per-operation provenance (source, spec label, spec version, spec path, operationId) and the
allow-listed vendor extension `x-amazon-apigateway-cors`. `input_from_sources` parses
several specifications; one that fails to parse becomes an `input_error` (with its label
and error code) and the rest of the scan continues.

### GraphQL (`parsers/graphql.py`)
`GraphQLTarget` holds the endpoint, operations (query/mutation/subscription and their names), and the
schema source (SDL or a user-supplied introspection result). GraphQL calls in cURL
bodies are recognised. No GraphQL requests are made. Phase 3B also extracts output-type
field names, input type names and root operation types from SDL or a supplied
introspection result. SDL type bodies are matched with a depth-aware brace scan, and
argument lists and nested `{…}` default values are removed before field names are read,
so fields after `f: Filter = {limit: 1}` are not lost. Unbalanced SDL stops safely with
what was parsed so far. This is a metadata extractor, not a full GraphQL grammar.

### Discovered APIs (Phase 2)
`adapters/karmakoders/attack_surface.py` converts `SurfaceItem`s or `scan_attack_surface`
rows into endpoints. It keeps parameter names only, dropping observed values. It lists spec URLs
(such as `/openapi.json`) for a later phase to import, and does not fetch them. Phase 3B
also emits `DiscoveredResource`s for documentation, GraphQL IDE and debug URLs together with
the HTTP status discovery already recorded (a debug URL that is not an API endpoint is
reported once, as a resource).

## Inventory and coverage
`ApiInventory` deduplicates by `METHOD host[:port] /canonical/path`, where
`{id}`, `:id` and `<id>` all become `{param}`, while concrete IDs are not collapsed. Every contributing
source is kept in `metadata["sources"]`, and (3B) every source's own record — spec label,
discovery source, observed status — is kept in `metadata["provenance"]`. Coverage never
reports an untested endpoint as secure. Endpoints outside scope are `skipped`; endpoints
with no known host are `not_tested` (`host_unknown`); every other endpoint stays
`not_tested` — with reason `passive_analysis_only` once passive checks ran — because
passive analysis is not live testing. `ApiCoverage.tested` is therefore always 0 in 3B.

## Check registry
`registry/catalog.py` lists the planned check ids with OWASP API Top 10 (2023) and CWE
metadata, mode, safety level and requirements: API_INVENTORY, API_AUTHENTICATION,
API_JWT, API_BOLA, API_BFLA, API_BOPLA, API_DATA_EXPOSURE, API_MASS_ASSIGNMENT,
API_RATE_LIMIT, API_CORS, API_GRAPHQL, API_SSRF, API_CONFIGURATION, API_BUSINESS_FLOWS.
Phase 3B replaces the passive entries with implemented definitions (ids unchanged) and adds
API_SPEC_SECURITY, API_CORS_CONFIG and API_GRAPHQL_SCHEMA, so the *active* ids
API_AUTHENTICATION, API_CORS and API_GRAPHQL remain reserved for later phases. Every active
check (and the passive API_SSRF) is still unimplemented and reported `not_tested`.

## Phase 3B — passive checks

All checks are pure functions of an `AnalysisContext` built by the runner (inventory,
specifications, server scope, GraphQL metadata, supplied tokens, existing observations,
discovered resources, endpoint sensitivity classes). Each check runs in its own
`try/except`: a crash becomes an `error` result plus a `scanner_error`, and the other checks
continue. No check sends a request.

| Id (OWASP) | What it reads | Rules (sub-rule ids) | Basis |
|---|---|---|---|
| A `API_SPEC_SECURITY` (API2) | security schemes + requirements | `no_security_declared` (one spec-level result), `security_schemes_not_applied`, `no_security_requirement` (only when the spec documents security elsewhere), `sensitive_operation_declared_public`, `undefined_security_scheme`, `incomplete_security_scheme`, `basic_auth_over_cleartext`, `oauth_url_cleartext`, `deprecated_oauth_flow` (implicit/password, RFC 9700), `api_key_in_query` | specification |
| B `API_JWT` (API2) | explicitly supplied tokens (cURL `Authorization: Bearer`, `input_from_sources(tokens=…)`) | `alg_none`, `alg_missing`, `unexpected_algorithm`, `empty_signature`, `missing_exp`, `long_lifetime` (>30 days), `sensitive_claims`, `unexpected_type`, `header_key_reference` (jku/x5u/jwk). JWE and undecodable tokens are `inconclusive` | token_structure |
| C `API_DATA_EXPOSURE` (API3) | 2xx/default response-schema property paths | `secret_material_in_response`, `token_in_response`, `api_key_in_response`, `payment_data_in_response`, `personal_identifier_in_response`, `internal_field_in_response` — one result per endpoint and category | specification |
| D `API_CORS_CONFIG` (API8) | existing `ApiObservation` headers; documented `Access-Control-*` literals; `x-amazon-apigateway-cors` | live: `reflected_origin_with_credentials`, `null_origin_with_credentials`, `wildcard_with_credentials`, `reflected_origin`; documented: `documented_null_origin`, `documented_wildcard_with_credentials`, `documented_wildcard_on_authenticated_operation`, `gateway_wildcard_with_credentials` | live_observation / specification |
| E `API_CONFIGURATION` (API8) | spec servers + operations; discovered resources; observations; discovered endpoints | `insecure_server_scheme`, `development_server_documented`, `debug_operation_documented`; `api_documentation_reachable`, `graphql_ide_reachable`, `debug_endpoint_reachable` (only with a recorded 2xx), `verbose_error` | specification / live_observation |
| F `API_INVENTORY` (API9) | documented + discovered inventory | `deprecated_operations` (one per spec), `multiple_api_versions`, `version_security_inconsistency`, `undocumented_endpoint`, `undocumented_method` | specification / inventory |
| G `API_GRAPHQL_SCHEMA` (API3) | supplied SDL / introspection result / operation documents | `sensitive_schema_fields`, `internal_schema_exposure`; sensitive mutations → `inconclusive` (needs authorization testing); no schema → `inconclusive` | specification |
| H `API_BUSINESS_FLOWS` (API6) | path, operationId, tags, summary/description, request-body names | classification into authentication, registration, account_recovery, user/organization management, administrative, billing_payment, file_transfer, data_export, role_permission, webhooks, credential_handling. Always `inconclusive` (classification is never a finding); classes are written to `endpoint.metadata["sensitivity"]` | inventory |

**Context rules that avoid false positives.** Sensitive-name rules match token shapes
(`password_hash`, `refresh_token`, `private_key`, …), not substrings, and skip metadata
about a secret (`password_updated_at`, `api_key_id`, `token_type`, `has_password`,
`csrf_token`). Pagination cursors and usage counters (`next_page_token`, `cursor_token`,
`sync_token`, `max_tokens`, `prompt_tokens`, `used_tokens`, a bare `tokens`) are not
credentials, unless an auth word is also present (`page_access_token`, `api_tokens`,
`refresh_tokens` stay sensitive). Endpoint classification treats `card`/`cards` as payment
data only next to a payment word (`/payment/cards`, `/credit-cards`, `addPaymentCard`;
not `/boards/{id}/cards`), and `media` alone is not file transfer. Response tokens are expected on authentication/registration endpoints, keys
and client secrets on key/client-issuing `POST`/`PUT` endpoints. Login, registration,
password reset and webhooks are expected to be public. Error responses are not treated as
data exposure. An absent CORS or security declaration is never itself a finding.

**Documented vs discovered.** Runs only when it is reliable: a specification with a known
host, plus non-spec endpoints on that host under the spec's base path. Concrete paths are
matched against templates (`/v2/users/42` ↔ `/v2/users/{id}`); matches are recorded in
`metadata["documented_by"]`. Mismatches are inventory observations described explicitly
as *not* a confirmed shadow API. Otherwise the comparison is reported as not performed.

**Result states.** `potential` = a rule matched (the only status a 3B rule produces);
`pass` = the rules ran on available evidence and matched nothing (the evidence says what
was examined, and that live behaviour was not tested); `inconclusive` = analysis ran but
evidence is insufficient (no response schemas, no GraphQL schema, encrypted token,
classification); `not_tested` = no applicable input, or an active / unimplemented check;
`error` = the check crashed. `vulnerable` is reserved for later phases that can
demonstrate a failure.

**Deduplication.** Within a scan the runner keeps one result per (check, sub-rule,
subject), the most severe one. Checks own disjoint concerns (deprecated → F, security
declarations → A, transport/debug → E). Website CORS and per-endpoint CORS probes stay with
the existing website checks and Phase F fuzzing; 3B does not re-derive them.

**Spec server scope.** Every documented server URL is classified (`in_scope`,
`out_of_scope`, `relative`, `invalid`, `not_evaluated`) with the injected scope policy
and reported in `statistics.specifications_detail`. Endpoints on out-of-scope servers are
`skipped` and are never the subject of endpoint findings.

**Scope of existing evidence.** The same scope policy applies to `DiscoveredResource`s and
`ApiObservation`s: out-of-scope items are dropped before any check runs, so they cannot
produce findings. Only counts are kept (`coverage_by_basis.live.excluded_out_of_scope` and a
warning); the excluded URLs are never echoed. A policy that raises excludes the item.
Without a scope policy (standalone core use) all evidence is analysed, as before.

**Input validation.** An unsupported `target_type` makes the scan an `input_error`. An
endpoint whose method is not GET/POST/PUT/PATCH/DELETE/HEAD/OPTIONS/TRACE, or whose path
contains whitespace or control characters, is skipped with an `input_error` entry; the
rest of the scan continues.

**Coverage by basis.** `statistics.coverage_by_basis` separates `specification` (operations
documented/analysed, with declared auth, explicitly public, without a requirement,
deprecated, with response schemas, GraphQL schemas, parsing errors), `inventory`
(endpoints, analysed, out of scope, classified, by class, documented-vs-observed
comparison) and `live` (always `requests_sent: 0`, `endpoints_tested_live: 0`, plus how much
existing evidence was analysed), and lists checks executed / not tested / with insufficient
evidence / errored.

**Spec import integration point.** `plan_spec_imports(urls, scope_policy, ownership)`
returns `SpecImportCandidate`s: `eligible_pending_authorization` only when the URL is in
scope and ownership is verified. It never fetches. A later explicitly authorized workflow
fetches eligible URLs and passes the text to `input_from_openapi(raw, source_label=…)`.

**Source labels are sanitised.** Labels are persisted (finding `location` such as
`spec:<label>`, provenance, explanations, error messages), so `redaction.sanitize_source_label`
strips URL userinfo, query strings and fragments (and `?…`/`#…` from non-URL labels) at the
input boundary: in `parse_openapi`, in builder error messages, and again in
`ApiSpecification` itself. `https://u:pw@e.com/openapi.json?token=…#x` becomes
`https://e.com/openapi.json`. Callers should still pass a credential-free label; never rely
on a label to carry authentication.

## Platform integration (KarmaKoders adapter)

| Concern | Reuses |
|---|---|
| Scope | `KarmaKodersScopePolicy` → `lib.ownership.ssrf` (private/loopback/metadata blocking, DNS check) + `lib.discovery.urls.is_same_origin`; loopback only with `OWNERSHIP_ALLOW_LOOPBACK`. Order: static host checks → same-origin check → DNS resolution, so an off-origin host (e.g. from an untrusted spec) is rejected without any DNS lookup |
| Ownership | `ownership_context_for` → `lib.ownership.gate.assert_ownership_verified` |
| Limits | `limits_from_platform` → `lib.discovery.limits.DiscoveryLimits` (no second limit system) |
| Redaction | Core does structural redaction (which fields are sensitive); free text goes through `lib.redact.bound_evidence` |
| Findings | `to_finding_drafts` → `lib.findings.FindingDraft` → existing `normalize_finding`/`save_findings`. Only `vulnerable`/`potential` results become findings |
| Categories (3B) | Explicit entries in `lib/categories.FINDING_TYPE_CATEGORY` (`api_spec_security`/`api_jwt` → authentication, `api_cors_config` → cors, `api_configuration` → configuration, others → api_security). No generic `api_` prefix rule, so no existing type changes category |
| Confidence (3B) | `lib/confidence.score_finding` branch for `scanner_source == "api_security"` only, scored by evidence basis: specification 0.60/candidate, inventory 0.55/candidate, token_structure 0.80/unverified, live_observation 0.85/not_applicable; `verified` only for a `confirmed` basis |
| Pipeline | One optional call in `lib/stages.py`, made after the Phase 2 inventory is persisted |

### Finding mapping (3B)
`finding_type = api_<check>`; `location` = endpoint identity, or a stable subject
(`spec:<label>`, `api:<host>`, `token:<sha256-prefix>`, a URL without its query);
`param` = the sub-rule id. With the unchanged v1 fingerprint
(`type | location | param`), different rules on one endpoint stay distinct and the same
rule on the same subject fingerprints identically across scans (existing
`first_seen_scan_id` history applies). `rule_id = "<rule>@<evidence_basis>"` lets
`lib.confidence` score by basis without a schema change. `explanation` carries
description, impact, remediation, verification guidance and the basis note; `evidence_text`
is redacted JSON (expected vs observed, OWASP/CWE, basis), passed through
`lib.redact.bound_evidence`. Evidence holds property/claim *names*, never values; JWT
evidence holds a one-way fingerprint, never the token.

### Feature flag
`API_SECURITY_ENABLED` (engine env, default **off**).
- **Off:** the stage returns immediately with no DB access, no events and no behaviour change.
- **On:** for verified-ownership URL scans (the only scans that run Phase 2 discovery),
  `run_api_security_stage` converts the in-memory inventory (plus discovered resources),
  classifies scope, runs the passive checks, saves `potential` results through
  `save_findings`, plans spec imports (never fetching) and writes **one** scan event with
  the counts (`api_security.inventory (N analysis error(s)) — …` when checks errored). It sends
  no API requests. Findings are saved one at a time through the existing `save_findings`
  (which commits each finding in its own transaction), so the stage knows exactly how many
  rows were committed even if a later save fails; that count is added to the active-stage
  `saved` count in `lib/stages.py`, so the existing grade recalculation runs only when rows
  were committed. A persistence failure is logged and recorded as
  `api_security.persistence_failed — <type> after X of N finding(s) saved`. If the scanner
  itself returns `failed` or `input_error`, the event is
  `api_security.failed — status=…; N error(s) [kinds]` (counts and error kinds only, never
  messages) and no findings are saved. Any exception is caught, logged and recorded as an
  `api_security.failed` event; the website scan continues. The grade algorithm is unchanged.
  `run_api_security_foundation_stage` (3A name) remains as a compatible wrapper.
- With discovery data alone, the checks that can produce findings in the pipeline are
  API_CONFIGURATION (reachable documentation / GraphQL IDE / debug resources). Spec, token
  and GraphQL-schema checks report `not_tested` / `inconclusive` there until a later phase
  supplies those inputs.

### Persistence
No migration in Phase 3A or 3B. Findings use `findings` + `evidence`; the event uses
`scan_events`; categories used are already allowed by the `findings_category_check`
constraint. There is no `api_findings` table. Not persisted (documented gap, by design
for 3B): non-finding results (`pass` / `inconclusive` / `not_tested`), per-endpoint
sensitivity classes and `coverage_by_basis` live only in the in-memory `ApiScanResult`
and in the scan event summary. Persisting them needs a later, approved schema change or
an `ApiSecurityRepository` implementation.

### Verify Fix / AI
Unchanged. API finding types will be added to `lib/fix_verify.py` dispatch later; until then the existing
"unsupported type → verification_inconclusive" path already handles them honestly. AI
explanations reuse the existing `lib/llm` layer unchanged: it receives only its allow-listed,
secondarily redacted fields, sees the deterministic severity/confidence, and never decides
findings (a test proves supplied JWTs and claim values never reach the LLM context).

## Safety summary
- Pasted cURL is never executed; shell syntax is rejected.
- No API requests in Phase 3A or 3B; tests patch sockets/urlopen to prove it. The only
  network-adjacent operation is the platform scope policy's DNS-resolution check (SSRF
  protection), and it runs only for hosts that already passed the same-origin check.
- JWTs are decoded locally only; no verification, forging, re-signing or brute force.
- External `$ref`s are never fetched. YAML aliases and unsafe tags are rejected.
- Credentials live only in `SecretValue`, which redacts itself in repr/str/format and refuses to pickle.
- Every serialised view is redacted (Authorization, Cookie, Set-Cookie, API-key headers,
  password/secret/token/key fields, sensitive query params).
- Scope reuses the platform's SSRF rules: private, loopback, link-local, metadata and
  IPv6 private/local ranges are blocked. Endpoints, spec servers, discovered resources and
  observations are all scope-checked.
- Specification source labels are sanitised (no userinfo, query or fragment).

## Extraction strategy
To ship API Security standalone: copy `modules/api_security/` without `adapters/karmakoders/`,
then write new adapters for that product's scope policy, ownership, persistence (implement
`ApiSecurityRepository`) and finding sink. The contracts, parsers, inventory, registry, runner and tests move unchanged.

## Phase 3C — active authentication & authorization testing

Behavioural checks that send bounded, authorized requests. They run **only** when every
gate holds: `API_SECURITY_ACTIVE_ENABLED` is on, ownership is verified, an injected
`HttpTransport` is present, and the scan supplies an `ActiveTestPlan` with at least one
identity. Requests go only to operator-supplied test objects on the verified host.

| Id (OWASP) | Checks | Confirms only when |
|---|---|---|
| `API_AUTHENTICATION` (API2) | GET/HEAD anonymous vs authenticated | anonymous receives the **same resource** as the authenticated caller on an auth-expected operation → VULNERABLE; otherwise a reachable-public POTENTIAL |
| `API_BOLA` (API1) | non-owner requests another identity's test object | non-owner gets the **owner's object** (same body fingerprint), owner access confirmed first |
| `API_BFLA` (API5) | lower-privilege identity calls a privileged function | lower-privilege gets 2xx where the privileged identity does; read-only unless opted in |
| `API_BOPLA` (API3) | owner reads an object; protected property names present | protected properties appear in the response (exposure → POTENTIAL) |
| `API_MASS_ASSIGNMENT` (API3) | update with a unique harmless probe property | the probe property is **reflected** back; needs `allow_state_changing` |
| `API_JWT` (API2) | forged-token variants (alg:none, stripped/tampered signature, tampered payload) on a token-gated endpoint | a forged token is accepted where anonymous is rejected |

**Truth rules.** A 2xx alone never confirms anything: authentication needs the
anonymous-vs-authenticated differential, BOLA needs the owner's body fingerprint to match,
BFLA/JWT need the privileged/anonymous baseline. VULNERABLE results carry
`EvidenceBasis.CONFIRMED`; a check that cannot run (missing identity/object, or the flag
off) is `NOT_TESTED`, never PASS. Passive structural `API_JWT` and active validation
`API_JWT` coexist (distinct `rule_id`s). Evidence keeps status codes, property/claim names
and redacted request/response summaries; never tokens or raw bodies.

**Transport & safety.** `adapters/karmakoders/transport.py` is the only real
`HttpTransport`. Every request is scope-checked (`KarmaKodersScopePolicy`), budgeted
(`DiscoveryLimits`/`Budget`), sent via `scoped_fetch` with `max_redirects=0` (off-host
redirects blocked), size-/time-bounded, and its body redacted. Read methods are
GET/HEAD/OPTIONS; write methods (POST/PUT/PATCH) are refused unless the plan opts in;
DELETE and others are always refused. Credentials are applied from `SecretValue` and never
logged. **Test identities and objects are held in memory only and never written to the
database.**

**Verify Fix.** `lib/fix_verify.py` recognises `api_*` finding types: active findings →
`api_active_recheck_requires_identities` (re-run with the same test identities, which are
not stored); spec/inventory findings → `api_spec_recheck`. Behaviour for non-API types is
unchanged. Grading is unchanged; confirmed active findings persist (verified=true) through
the existing pipeline.

## Dashboard (project-scoped, read-only)

`GET /api/projects/{id}/dashboard` aggregates existing tables only (no new tables, no second
grade) via the pure `src/lib/scanner/dashboard.ts#summarizeDashboard`. The page at
`/security-scanner/dashboard/{projectId}` (no login; reached by project id like the scan
pages, `robots: noindex`) renders metric cards, the existing security grade, findings by
severity/category, recent scans, and an API Security panel that shows active vs passive
coverage and reports unavailable checks as not tested. Loading/error/empty states included.

## Not implemented yet (later phases)
Active CORS probes on API endpoints, active GraphQL introspection/complexity testing,
rate-limit probing, resource exhaustion, HTTP method tampering, SSRF verification,
business-logic testing, fetching discovered spec URLs, automated re-supply of test
identities for Verify Fix, a dedicated 24-hour purge of active-test results (results follow
existing scan retention today), and DB persistence of full API scan results.

## Tests
`python scripts/test_api_security.py` (from `engine/`): 213 tests — 80 from Phase 3A, 63
from Phase 3B, and 36 from Phase 3C (`test_phase3c_active.py`: all six active checks against
a deterministic vulnerable/secure in-memory app with no network, plus gating; and
`test_phase3c_adapter.py`: transport scope/budget/method/redirect/redaction safety and the
gated active stage). Historical note: the count was 177 before Phase 3C. Earlier Phase 3A/3B
breakdown —
(contracts, cURL, OpenAPI, GraphQL, inventory, coverage, registry, runner, scope, redaction,
adapter, isolation) and 63 from Phase 3B (`test_phase3b_spec.py`, `test_phase3b_checks.py`,
`test_phase3b_inventory.py`, `test_phase3b_integration.py`): OpenAPI 2/3.0/3.1 in JSON and
YAML, response schemas, security metadata, malformed input, external refs offline, server
scope, every check's positive / negative / ambiguous / insufficient-evidence cases,
redaction, result states, provenance, classification, documented-vs-discovered, adapter →
normalize → `save_findings` (fake connection), confidence/category mapping, fingerprints and
dedup, AI-context redaction, flag off, check-failure isolation and the enabled stage with
network calls blocked. Two 3A assertions that encoded "no check is implemented" were
narrowed to "no *active* check is implemented / executed". `test_phase3b_bugfixes.py` (34
tests) covers the fixes for audit findings BUG-01 … BUG-11. All tests run offline, with no
database.

The Phase 3B audit suite lives separately: `python scripts/audit_phase3b/run_audit.py`
(111 tests, including the original `test_BUG_*` reproductions, which now pass).

## Known platform issue found during 3A
`lib/discovery/urls.canonicalize_url` drops IPv6 brackets (`http://[fd00::1]/` → host
`fd00`). Phase 2 still rejects such URLs, but only because the host no longer matches the
origin, not because the SSRF check classifies the address. The API Security scope
adapter avoids this by checking host safety on the original URL. The Phase 2 function itself was left unchanged.
