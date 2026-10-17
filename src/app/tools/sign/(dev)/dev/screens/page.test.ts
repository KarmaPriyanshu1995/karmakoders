import { afterEach, describe, expect, it, vi } from "vitest";
import { isValidElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
  usePathname: () => "/tools/sign/dev/screens",
}));

// Imported once under NODE_ENV=test (see dev/ui/page.test.ts for why).
const index = await import("./page");
const screenPage = await import("./[screen]/page");
const { PREVIEW_SCREENS } = await import("./registry");

afterEach(() => vi.unstubAllEnvs());

const props = (screen: string, state?: string) => ({
  params: Promise.resolve({ screen }),
  searchParams: Promise.resolve(state ? { state } : {}),
});

describe("/tools/sign/dev/screens", () => {
  it.each(["production", "test"])("index and screen pages are a 404 when NODE_ENV=%s", async (env) => {
    vi.stubEnv("NODE_ENV", env);
    expect(() => index.default()).toThrow("NEXT_NOT_FOUND");
    await expect(screenPage.default(props("dashboard"))).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("is noindex and rendered per request", () => {
    for (const mod of [index, screenPage]) {
      expect(mod.metadata.robots).toMatchObject({ index: false, follow: false });
      expect(mod.dynamic).toBe("force-dynamic");
    }
  });

  it("covers every sender and signer screen", () => {
    expect(PREVIEW_SCREENS.filter((s) => s.group === "sender").map((s) => s.id)).toEqual([
      "dashboard",
      "documents",
      "document",
      "templates",
      "builder",
      "upload",
      "billing",
      "settings",
    ]);
    expect(PREVIEW_SCREENS.filter((s) => s.group === "signer").map((s) => s.id)).toEqual([
      "signer-verify",
      "signer-consent",
      "signer-review",
      "signer-sign",
      "signer-done",
      "signer-decline",
      "signer-states",
    ]);
  });

  it("previews every signer state screen", async () => {
    const { SIGNER_STATE_KINDS } = await import("@/modules/sign/ui/fixtures/signer");
    const states = PREVIEW_SCREENS.find((s) => s.id === "signer-states")!.states.map((s) => s.id);
    expect(states).toEqual(SIGNER_STATE_KINDS.map((k) => k.id));
    expect(states).toEqual(["invalid", "not-yet", "expired", "voided", "already-signed", "network"]);
  });

  it("in development, lists every screen and renders every state", async () => {
    vi.stubEnv("NODE_ENV", "development");
    expect(isValidElement(index.default())).toBe(true);
    for (const screen of PREVIEW_SCREENS) {
      for (const state of screen.states) {
        const html = renderToStaticMarkup(await screenPage.default(props(screen.id, state.id)));
        expect(html, `${screen.id}/${state.id}`).toContain(`data-preview-state="${state.id}"`);
      }
    }
    await expect(screenPage.default(props("nope"))).rejects.toThrow("NEXT_NOT_FOUND");
  });
});
