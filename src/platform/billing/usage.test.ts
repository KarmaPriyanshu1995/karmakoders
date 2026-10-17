import { beforeEach, describe, expect, it, vi } from "vitest";

const findUnique = vi.fn();
vi.mock("@/platform/db", () => ({
  prisma: { platformUsage: { findUnique: (args: unknown) => findUnique(args) } },
  withDbRetry: <T>(fn: () => Promise<T>) => fn(),
}));

const { getFreeSignUsage } = await import("./usage");

beforeEach(() => findUnique.mockReset());

describe("getFreeSignUsage", () => {
  it("reads this UTC month's Sign usage row", async () => {
    findUnique.mockResolvedValue({ freeUsed: 2 });
    expect(await getFreeSignUsage("c1", new Date("2026-10-31T23:30:00.000Z"))).toBe(2);
    expect(findUnique).toHaveBeenCalledWith({
      where: { customerId_tool_period: { customerId: "c1", tool: "SIGN", period: "2026-10" } },
      select: { freeUsed: true },
    });
  });

  it("is 0 when nothing was sent this month", async () => {
    findUnique.mockResolvedValue(null);
    expect(await getFreeSignUsage("c1")).toBe(0);
  });
});
