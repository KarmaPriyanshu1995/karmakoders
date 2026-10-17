import type { Metadata } from "next";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ notFound: vi.fn(), redirect: vi.fn(), useRouter: vi.fn() }));

/**
 * Mirrors what src/app/layout.tsx contributes (not imported: it pulls next/font). Its openGraph
 * carries url = site root, which every page inherits unless a nearer segment replaces openGraph.
 */
const ROOT: Metadata = {
  metadataBase: new URL("https://www.karmakoders.com"),
  openGraph: { type: "website", siteName: "karmakoders", url: "https://www.karmakoders.com" },
};

/** Next.js merges segment metadata shallowly: the last segment to define a key replaces it. */
function merged(...segments: Metadata[]): Metadata {
  return Object.assign({}, ...segments);
}

type MetadataModule = {
  metadata?: Metadata;
  generateMetadata?: (props: { params: Promise<Record<string, string>> }) => Promise<Metadata>;
};

async function metadataOf(load: () => Promise<unknown>): Promise<Metadata> {
  const mod = (await load()) as MetadataModule;
  if (mod.metadata) return mod.metadata;
  if (mod.generateMetadata) return mod.generateMetadata({ params: Promise.resolve({ template: "mutual-nda" }) });
  return {};
}

const APP_LAYOUT = () => import("./(app)/layout");
const WORKSPACE_LAYOUT = () => import("./(workspace)/layout");
const SIGNER_LAYOUT = () => import("./(signer)/layout");

const NOINDEX_PAGES = [
  ["/tools/sign/login", APP_LAYOUT, () => import("./(app)/login/page")],
  ["/tools/sign/dashboard", WORKSPACE_LAYOUT, () => import("./(workspace)/dashboard/page")],
  ["/tools/sign/new/[template]", WORKSPACE_LAYOUT, () => import("./(workspace)/new/[template]/page")],
  ["/tools/sign/new/upload", WORKSPACE_LAYOUT, () => import("./(workspace)/new/upload/page")],
  ["/tools/sign/new", WORKSPACE_LAYOUT, () => import("./(workspace)/new/page")],
  ["/tools/sign/documents", WORKSPACE_LAYOUT, () => import("./(workspace)/documents/page")],
  ["/tools/sign/documents/[id]", WORKSPACE_LAYOUT, () => import("./(workspace)/documents/[id]/page")],
  ["/tools/sign/billing", WORKSPACE_LAYOUT, () => import("./(workspace)/billing/page")],
  ["/tools/sign/settings", WORKSPACE_LAYOUT, () => import("./(workspace)/settings/page")],
  ["/tools/sign/dev/screens", () => Promise.resolve({}), () => import("./(dev)/dev/screens/page")],
  ["/tools/sign/dev/screens/[screen]", () => Promise.resolve({}), () => import("./(dev)/dev/screens/[screen]/page")],
  ["/tools/sign/s/invalid", SIGNER_LAYOUT, () => import("./(signer)/s/invalid/page")],
  ["/tools/sign/s/not-yet", SIGNER_LAYOUT, () => import("./(signer)/s/not-yet/page")],
  ["/tools/sign/sign", SIGNER_LAYOUT, () => import("./(signer)/sign/page")],
] as const;

describe("noindex Sign pages: no canonical and no og:url after metadata merging", () => {
  it.each(NOINDEX_PAGES)("%s", async (_path, layout, page) => {
    const result = merged(ROOT, await metadataOf(layout), await metadataOf(page));
    expect(result.robots).toMatchObject({ index: false, follow: false });
    expect(result.alternates?.canonical).toBeUndefined();
    expect(result.openGraph).toBeDefined();
    expect((result.openGraph as { url?: unknown }).url).toBeUndefined();
  });
});
