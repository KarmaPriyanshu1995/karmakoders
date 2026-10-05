import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  dnsRecordNameFor,
  expectedTxtValue,
  txtRecordsContain,
  verificationHostnameFor,
} from "../src/lib/ownership-dns.mjs";
import { instructionsFor, verifyDnsTxt } from "../src/lib/ownership.ts";

const here = dirname(fileURLToPath(import.meta.url));
const cases = JSON.parse(readFileSync(join(here, "ownership-dns-cases.json"), "utf8"));
const TOKEN = "vhBBMpicuwOENI2KPUIjqvJNPoDWh2ngNEWTOKEN0123456789";
const EXPECTED = expectedTxtValue(TOKEN);

// Fake resolver: TXT data keyed by exact FQDN; records every name queried.
function fakeDns(zone) {
  const queried = [];
  const resolveTxt = async (name) => {
    queried.push(name);
    if (!(name in zone)) {
      const err = new Error("queryTxt ENOTFOUND");
      err.code = "ENOTFOUND";
      throw err;
    }
    return zone[name].map((v) => [v]);
  };
  return { queried, resolveTxt };
}

// Tests 1–3 (+ extra): hostname derivation from the claimed host.
for (const c of cases) {
  test(`derives verification hostname for ${c.claimedHost}`, () => {
    assert.equal(verificationHostnameFor(c.claimedHost), c.verificationHostname);
    assert.equal(dnsRecordNameFor(c.claimedHost), c.dnsRecordName);
  });
}

test("TEST 4/6: www claim verifies via _karmakoders-verify.www even though www is a CNAME", async () => {
  const { queried, resolveTxt } = fakeDns({ "_karmakoders-verify.www.karmakoders.com": [EXPECTED] });
  const out = await verifyDnsTxt({ claimedHost: "www.karmakoders.com", token: TOKEN, resolveTxt });
  assert.equal(out.ok, true);
  assert.deepEqual(queried, ["_karmakoders-verify.www.karmakoders.com"]);
});

test("TEST 5: TXT only at apex does NOT verify a www claim (diagnostic hint only)", async () => {
  const { queried, resolveTxt } = fakeDns({ "_karmakoders-verify.karmakoders.com": [EXPECTED] });
  const logs = [];
  const out = await verifyDnsTxt({
    claimedHost: "www.karmakoders.com",
    token: TOKEN,
    resolveTxt,
    log: (e) => logs.push(e),
  });
  assert.equal(out.ok, false);
  assert.equal(out.reason, "dns_nxdomain");
  // Verification queried ONLY the www name; the apex name is a diagnostic second look.
  assert.equal(queried[0], "_karmakoders-verify.www.karmakoders.com");
  assert.equal(out.misplacedAt, "_karmakoders-verify.karmakoders.com");
  assert.match(out.hint, /Change the record Name .* to _karmakoders-verify\.www/);
  assert.match(out.message, /_karmakoders-verify\.www\.karmakoders\.com does not currently exist/);
  for (const text of [out.message, out.hint, JSON.stringify(logs)]) {
    assert.ok(!text.includes(TOKEN), "messages/logs must not leak the token");
  }
  assert.equal(logs.length, 1);
  assert.equal(logs[0].matched, false);
  assert.equal(logs[0].verificationHostname, "_karmakoders-verify.www.karmakoders.com");
});

function failingDns(code) {
  let calls = 0;
  const resolveTxt = async () => {
    calls++;
    const err = new Error(`queryTxt ${code}`);
    err.code = code;
    throw err;
  };
  return { resolveTxt, calls: () => calls };
}
const noSleep = async () => {};

test("error classification: NXDOMAIN / NODATA / timeout / SERVFAIL / REFUSED", async () => {
  const cases = [
    ["ENOTFOUND", "dns_nxdomain", 1],
    ["ENODATA", "txt_record_not_found", 1],
    ["ETIMEOUT", "dns_timeout", 3],
    ["ESERVFAIL", "dns_servfail", 3],
    ["EREFUSED", "dns_permission_error", 1],
    ["ECONNREFUSED", "dns_resolution_error", 3],
  ];
  for (const [code, expected, attempts] of cases) {
    const f = failingDns(code);
    const out = await verifyDnsTxt({
      claimedHost: "karmakoders.com",
      token: TOKEN,
      resolveTxt: f.resolveTxt,
      sleep: noSleep,
      log: () => {},
    });
    assert.equal(out.ok, false);
    assert.equal(out.reason, expected, code);
    assert.equal(f.calls(), attempts, `${code}: bounded retries only for transient errors`);
    assert.ok(out.message && !out.message.includes(TOKEN));
  }
});

test("transient error then success passes after a bounded retry", async () => {
  let n = 0;
  const resolveTxt = async () => {
    if (n++ === 0) {
      const err = new Error("timeout");
      err.code = "ETIMEOUT";
      throw err;
    }
    return [[EXPECTED]];
  };
  const out = await verifyDnsTxt({ claimedHost: "karmakoders.com", token: TOKEN, resolveTxt, sleep: noSleep, log: () => {} });
  assert.equal(out.ok, true);
  assert.equal(n, 2);
});

test("empty TXT set fails; other-token value is wrong_token", async () => {
  const empty = await verifyDnsTxt({
    claimedHost: "karmakoders.com",
    token: TOKEN,
    resolveTxt: async () => [],
    log: () => {},
  });
  assert.equal(empty.ok, false);
  assert.equal(empty.reason, "txt_record_not_found");
  const wrong = await verifyDnsTxt({
    claimedHost: "karmakoders.com",
    token: TOKEN,
    resolveTxt: async () => [[expectedTxtValue("anotherChallenge")]],
    log: () => {},
  });
  assert.equal(wrong.ok, false);
  assert.equal(wrong.reason, "wrong_token");
});

test("TXT only at www verification host does NOT verify an apex claim", async () => {
  const { queried, resolveTxt } = fakeDns({ "_karmakoders-verify.www.karmakoders.com": [EXPECTED] });
  const out = await verifyDnsTxt({ claimedHost: "karmakoders.com", token: TOKEN, resolveTxt });
  assert.equal(out.ok, false);
  assert.deepEqual(queried, ["_karmakoders-verify.karmakoders.com"]);
});

test("TEST 7: wrong / partial / bare token fails", async () => {
  for (const value of [
    expectedTxtValue("someOtherToken"),
    EXPECTED.slice(0, -4),
    `${EXPECTED}extra`,
    TOKEN,
    `prefix ${EXPECTED}`,
  ]) {
    const { resolveTxt } = fakeDns({ "_karmakoders-verify.www.karmakoders.com": [value] });
    const out = await verifyDnsTxt({ claimedHost: "www.karmakoders.com", token: TOKEN, resolveTxt });
    assert.equal(out.ok, false, `should reject ${JSON.stringify(value)}`);
  }
});

test("TEST 11: multiple TXT records pass when the exact value is present", async () => {
  const { resolveTxt } = fakeDns({
    "_karmakoders-verify.www.karmakoders.com": ["google-site-verification=abc", ` "${EXPECTED}" `, "other-record=x"],
  });
  const out = await verifyDnsTxt({ claimedHost: "www.karmakoders.com", token: TOKEN, resolveTxt });
  assert.equal(out.ok, true);
});

test("split TXT strings are joined before comparing", () => {
  assert.equal(txtRecordsContain([[EXPECTED.slice(0, 10), EXPECTED.slice(10)]], EXPECTED), true);
});

test("TEST 10: stored hostname bound to a different claim is rejected without lookup", async () => {
  const { queried, resolveTxt } = fakeDns({ "_karmakoders-verify.karmakoders.com": [EXPECTED] });
  const out = await verifyDnsTxt({
    claimedHost: "www.karmakoders.com",
    token: TOKEN,
    storedVerificationHostname: "_karmakoders-verify.karmakoders.com",
    resolveTxt,
  });
  assert.equal(out.ok, false);
  assert.equal(out.reason, "verification_hostname_mismatch");
  assert.deepEqual(queried, []);
});

test("TEST 12/14: API instructions = full token, and hostname matches the lookup hostname", async () => {
  const ins = instructionsFor({ method: "dns_txt", claimedHost: "www.karmakoders.com", token: TOKEN, claimedHostIsCname: true });
  assert.equal(ins.txtValue, EXPECTED);
  assert.equal(ins.txtRecord, EXPECTED);
  assert.ok(!ins.txtValue.includes("…") && !ins.txtValue.includes("..."));
  assert.equal(ins.dnsRecordName, "_karmakoders-verify.www");
  assert.equal(ins.verificationHostname, "_karmakoders-verify.www.karmakoders.com");
  assert.ok(ins.steps.includes(`Value: ${EXPECTED}`));
  assert.ok(ins.steps.includes("Name: _karmakoders-verify.www"));
  assert.match(ins.cnameNote, /CNAME/);

  const { queried, resolveTxt } = fakeDns({ [ins.verificationHostname]: [ins.txtValue] });
  const out = await verifyDnsTxt({
    claimedHost: ins.claimedHost,
    token: TOKEN,
    storedVerificationHostname: ins.verificationHostname,
    resolveTxt,
  });
  assert.equal(out.ok, true);
  assert.deepEqual(queried, [ins.verificationHostname]);
  assert.equal(out.verificationHostname, ins.verificationHostname);
});

test("TEST 12/13 (static): UI renders and copies the API value verbatim", () => {
  const ui = readFileSync(join(here, "..", "src", "components", "ScanLiveView.tsx"), "utf8");
  assert.match(ui, /\{ownershipInstructions\.txtValue\}/, "value rendered directly from API");
  assert.match(ui, /copyExact\("value", ownershipInstructions\.txtValue/, "clipboard gets the API value");
  assert.match(ui, /navigator\.clipboard\.writeText\(value\)/);
  const block = ui.slice(ui.indexOf('data-testid="dns-txt-value"') - 200, ui.indexOf('data-testid="dns-txt-value"') + 300);
  assert.doesNotMatch(block, /truncate|text-ellipsis|\.slice\(|\.substring\(/, "no truncation near the token");
});
