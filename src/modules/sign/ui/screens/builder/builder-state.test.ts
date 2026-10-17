import { describe, expect, it } from "vitest";
import { getTemplateBySlug } from "@/modules/sign/templates/catalog";
import {
  builderReducer,
  initialBuilderState,
  normalizeEmail,
  validateDetails,
  validateSigners,
  type BuilderState,
  type SignerDraft,
} from "./builder-state";

const nda = getTemplateBySlug("mutual-nda")!;

function signers(...emails: string[]): SignerDraft[] {
  return emails.map((email, i) => ({ id: `s${i + 1}`, name: `Signer ${i + 1}`, email, role: "Party A" }));
}

function stateWith(list: SignerDraft[]): BuilderState {
  return { ...initialBuilderState(nda, { defaultExpiryDays: 14, maxSigners: 10 }), signers: list };
}

describe("initialBuilderState", () => {
  it("starts on Details with one signer per template role, 14-day expiry and reminders on", () => {
    const state = initialBuilderState(nda, { defaultExpiryDays: 14, maxSigners: 2 });
    expect(state.step).toBe(0);
    expect(state.signers.map((s) => s.role)).toEqual(["Party A", "Party B"]);
    expect(state.expiryDays).toBe(14);
    expect(state.reminders).toBe(true);
    expect(Object.keys(state.values)).toEqual(nda.fields.map((f) => f.key));
  });
});

describe("validateSigners", () => {
  it("accepts unique, valid emails within the plan limit", () => {
    expect(validateSigners(signers("a@example.com", "b@example.com"), 2)).toEqual({ errors: {}, limitError: null, valid: true });
  });

  it("rejects duplicate emails, ignoring case and spaces", () => {
    const result = validateSigners(signers("jordan@acme.com", " JORDAN@acme.com "), 10);
    expect(result.valid).toBe(false);
    expect(result.errors.s1).toBeUndefined();
    expect(result.errors.s2?.email).toMatch(/already uses this email/);
  });

  it("requires a name and a valid email", () => {
    const result = validateSigners([{ id: "x", name: " ", email: "not-an-email", role: "Party A" }], 10);
    expect(result.errors.x).toEqual({
      name: "Enter the signer's name.",
      email: "Enter a valid email address, like name@example.com.",
    });
  });

  it("enforces max signers per plan: 2 on Free, 10 with credits or Pro", () => {
    const three = signers("a@x.com", "b@x.com", "c@x.com");
    expect(validateSigners(three, 2).limitError).toBe("Your plan allows up to 2 signers per document. Remove 1 or upgrade.");
    expect(validateSigners(three, 10).limitError).toBeNull();
    const eleven = signers(...Array.from({ length: 11 }, (_, i) => `p${i}@x.com`));
    expect(validateSigners(eleven, 10).valid).toBe(false);
    expect(validateSigners(eleven.slice(0, 10), 10).valid).toBe(true);
  });
});

describe("validateDetails", () => {
  it("requires required fields and checks email and number fields", () => {
    const errors = validateDetails(nda.fields, { party_a_email: "nope", term_months: "twelve" });
    expect(errors.party_a_name).toBe("Enter the party a legal name.");
    expect(errors.party_a_email).toMatch(/valid email/);
    expect(errors.term_months).toMatch(/whole number/);
  });
});

describe("builderReducer", () => {
  it("moves signers up and down within bounds", () => {
    const start = stateWith(signers("a@x.com", "b@x.com", "c@x.com"));
    const down = builderReducer(start, { type: "move_signer", id: "s1", direction: "down" });
    expect(down.signers.map((s) => s.id)).toEqual(["s2", "s1", "s3"]);
    expect(builderReducer(start, { type: "move_signer", id: "s1", direction: "up" })).toBe(start);
    expect(builderReducer(start, { type: "move_signer", id: "s3", direction: "down" })).toBe(start);
  });

  it("reorders by drag (from → to)", () => {
    const start = stateWith(signers("a@x.com", "b@x.com", "c@x.com"));
    expect(builderReducer(start, { type: "reorder_signers", fromId: "s3", toId: "s1" }).signers.map((s) => s.id)).toEqual(["s3", "s1", "s2"]);
  });

  it("adds signers with fresh ids and never removes the last one", () => {
    let state = stateWith(signers("a@x.com"));
    state = builderReducer(state, { type: "add_signer", role: "Party B" });
    expect(new Set(state.signers.map((s) => s.id)).size).toBe(2);
    state = builderReducer(state, { type: "remove_signer", id: state.signers[1].id });
    expect(builderReducer(state, { type: "remove_signer", id: "s1" }).signers).toHaveLength(1);
  });

  it("caps the message length", () => {
    const state = builderReducer(stateWith([]), { type: "set_message", message: "x".repeat(5000) });
    expect(state.message).toHaveLength(1000);
  });
});

describe("normalizeEmail", () => {
  it("lowercases and trims valid addresses, rejects the rest", () => {
    expect(normalizeEmail("  Jane@Example.COM ")).toBe("jane@example.com");
    for (const bad of ["", "jane", "jane@", "@example.com", "jane@example", "ja ne@example.com", `${"a".repeat(250)}@x.com`]) {
      expect(normalizeEmail(bad), bad).toBeNull();
    }
  });
});
