import { describe, expect, it } from "vitest";
import { metricsFromText, parseProjectDetails, stringifyProjectDetails } from "./projectDetails";

describe("projectDetails", () => {
  it("parses optional case-study fields and ignores empty metrics", () => {
    const details = parseProjectDetails({
      industry: "Fintech",
      metrics: [{ label: "Checkout", value: "−35%" }, { label: "", value: "x" }],
      challenge: "Slow settlements",
    });
    expect(details.industry).toBe("Fintech");
    expect(details.metrics).toEqual([{ label: "Checkout", value: "−35%" }]);
    expect(details.challenge).toBe("Slow settlements");
    expect(stringifyProjectDetails({ ...details, country: undefined })).toContain("Fintech");
  });

  it("returns empty details for invalid JSON and omits blank stringify", () => {
    expect(parseProjectDetails("not-json").metrics).toEqual([]);
    expect(stringifyProjectDetails({ metrics: [] })).toBeNull();
    expect(metricsFromText("Wait time|<8 min\n\nBad line")).toEqual([{ label: "Wait time", value: "<8 min" }]);
  });
});
