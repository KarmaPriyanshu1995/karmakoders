import { describe, expect, it } from "vitest";
import { getSignFlags, isSignAppEnabled } from "@/platform/env/flags";

describe("SIGN_APP_ENABLED", () => {
  it("defaults to false when unset or empty", () => {
    expect(isSignAppEnabled({})).toBe(false);
    expect(isSignAppEnabled({ SIGN_APP_ENABLED: "" })).toBe(false);
  });

  it('is true only for "true", false for "false"', () => {
    expect(isSignAppEnabled({ SIGN_APP_ENABLED: "true" })).toBe(true);
    expect(isSignAppEnabled({ SIGN_APP_ENABLED: " true " })).toBe(true);
    expect(isSignAppEnabled({ SIGN_APP_ENABLED: "false" })).toBe(false);
  });

  it("throws a clear error naming the variable for any other value", () => {
    for (const bad of ["1", "yes", "TRUE", "on"]) {
      expect(() => getSignFlags({ SIGN_APP_ENABLED: bad })).toThrow(/SIGN_APP_ENABLED/);
    }
  });

  it("reads process.env at call time, not import time", () => {
    const previous = process.env.SIGN_APP_ENABLED;
    try {
      process.env.SIGN_APP_ENABLED = "true";
      expect(isSignAppEnabled()).toBe(true);
      process.env.SIGN_APP_ENABLED = "false";
      expect(isSignAppEnabled()).toBe(false);
    } finally {
      if (previous === undefined) delete process.env.SIGN_APP_ENABLED;
      else process.env.SIGN_APP_ENABLED = previous;
    }
  });
});
