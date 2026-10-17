// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { isSignAppPath } from "@/modules/sign/app-paths";

let pathname = "/";
vi.mock("next/navigation", () => ({ usePathname: () => pathname }));
vi.mock("@/lib/analytics", () => ({ trackEvent: vi.fn() }));
vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

const { ConversionWidgets } = await import("./ConversionWidgets");

afterEach(() => {
  pathname = "/";
});

function widgetsShown(path: string): boolean {
  pathname = path;
  const { unmount } = render(<ConversionWidgets />);
  const shown = screen.queryByText("Book a call") !== null && screen.queryByText("WhatsApp") !== null;
  unmount();
  return shown;
}

const APP_PAGES = [
  "/tools/sign/dashboard",
  "/tools/sign/new/mutual-nda",
  "/tools/sign/new/upload",
  "/tools/sign/documents/doc_123",
  "/tools/sign/billing",
  "/tools/sign/settings",
  "/tools/sign/dev/ui",
];
const SIGNER_PAGES = ["/tools/sign/s/raw-token", "/tools/sign/s/invalid", "/tools/sign/s/not-yet", "/tools/sign/sign"];
const MARKETING_AND_LOGIN = [
  "/",
  "/tools/sign",
  "/tools/sign/pricing",
  "/tools/sign/templates",
  "/tools/sign/templates/mutual-nda",
  "/legal/terms",
  "/legal/esign-disclosure",
  "/tools/sign/login",
];

describe("Book a call / WhatsApp widgets", () => {
  it.each(APP_PAGES)("are hidden on the logged-in app page %s", (path) => {
    expect(widgetsShown(path)).toBe(false);
  });

  it.each(SIGNER_PAGES)("are hidden on the signer page %s", (path) => {
    expect(widgetsShown(path)).toBe(false);
  });

  it.each(MARKETING_AND_LOGIN)("are still shown on %s", (path) => {
    expect(widgetsShown(path)).toBe(true);
  });
});

describe("isSignAppPath", () => {
  it("matches whole path segments only", () => {
    expect(isSignAppPath("/tools/sign/new")).toBe(true);
    expect(isSignAppPath("/tools/sign/newsletter")).toBe(false);
    expect(isSignAppPath("/tools/sign/login")).toBe(false);
    expect(isSignAppPath("/tools/sign")).toBe(false);
    expect(isSignAppPath(null)).toBe(false);
  });
});
