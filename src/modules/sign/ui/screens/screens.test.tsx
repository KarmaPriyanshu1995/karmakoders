// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  BILLING_STATES,
  BUILDER_STATES,
  DASHBOARD_STATES,
  DOCUMENTS_LIST_STATES,
  DOCUMENT_DETAIL_STATES,
  SETTINGS_STATES,
  TEMPLATE_PICKER_STATES,
  UPLOAD_STATES,
} from "../fixtures/screens";
import { SIGN_TEMPLATES } from "@/modules/sign/templates/catalog";
import { BillingScreen } from "./billing-screen";
import { BuilderScreen } from "./builder/builder-screen";
import { DashboardScreen } from "./dashboard-screen";
import { DocumentDetailScreen } from "./document-detail-screen";
import { DocumentsListScreen, DocumentsListSkeleton } from "./documents-list-screen";
import { SettingsScreen } from "./settings-screen";
import { TemplatePickerScreen } from "./template-picker-screen";
import { UploadScreen } from "./upload/upload-screen";

vi.mock("next/navigation", () => ({ usePathname: () => "/tools/sign/dashboard", useRouter: () => ({ push: vi.fn() }) }));

afterEach(cleanup);

const byId = <T extends { id: string }>(list: T[], id: string) => list.find((s) => s.id === id)!;

describe("DashboardScreen", () => {
  it.each(DASHBOARD_STATES.map((s) => [s.label, s] as const))("renders: %s", (_label, state) => {
    render(<DashboardScreen vm={state.vm} />);
    expect(screen.getByRole("heading", { level: 1, name: "Dashboard" })).toBeTruthy();
    // "New document" is in the workspace header (workspace-layout.test.ts), not repeated here.
    expect(screen.getAllByRole("link", { name: /Use this template/ }).length).toBeGreaterThan(0);
  });

  it("guides a first-time sender to the first document", () => {
    render(<DashboardScreen vm={byId(DASHBOARD_STATES, "first-time").vm} />);
    expect(screen.getByRole("heading", { name: "Send your first document" })).toBeTruthy();
    expect(screen.getByRole("link", { name: /New document/ }).getAttribute("href")).toBe("/tools/sign/new");
    expect(screen.getByRole("link", { name: /Upload a PDF/ }).getAttribute("href")).toBe("/tools/sign/new/upload");
    expect(screen.queryByRole("heading", { name: "Recent documents" })).toBeNull();
  });

  it("links each count to a filtered documents list", () => {
    render(<DashboardScreen vm={byId(DASHBOARD_STATES, "many-free").vm} />);
    const counts = screen.getByRole("region", { name: "Document counts" });
    const hrefs = within(counts).getAllByRole("link").map((a) => a.getAttribute("href"));
    expect(hrefs).toEqual([
      "/tools/sign/documents?status=waiting",
      "/tools/sign/documents?status=in_progress",
      "/tools/sign/documents?status=completed&period=month",
      "/tools/sign/documents?status=draft",
    ]);
    expect(screen.getAllByRole("listitem").length).toBeGreaterThan(5);
  });

  it("shows the free usage meter only for free users", () => {
    render(<DashboardScreen vm={byId(DASHBOARD_STATES, "many-free").vm} />);
    expect(screen.getByRole("progressbar", { name: "Free documents this month" }).getAttribute("aria-valuetext")).toBe(
      "2 of 3 free documents this month"
    );
    cleanup();
    render(<DashboardScreen vm={byId(DASHBOARD_STATES, "pro").vm} />);
    expect(screen.queryByRole("progressbar")).toBeNull();
    cleanup();
    render(<DashboardScreen vm={byId(DASHBOARD_STATES, "free-at-limit").vm} />);
    expect(screen.getByText("You've used all your free documents this month")).toBeTruthy();
  });
});

describe("DocumentsListScreen", () => {
  it.each(DOCUMENTS_LIST_STATES.map((s) => [s.label, s] as const))("renders: %s", (_label, state) => {
    render(<DocumentsListScreen vm={state.vm} />);
    expect(screen.getByRole("heading", { level: 1, name: "Documents" })).toBeTruthy();
  });

  it("switches between a desktop table and mobile cards by breakpoint classes", () => {
    const { container } = render(<DocumentsListScreen vm={byId(DOCUMENTS_LIST_STATES, "many").vm} />);
    const table = container.querySelector("table")!;
    expect(table.className).toMatch(/(^|\s)hidden(\s|$)/);
    expect(table.className).toMatch(/(^|\s)md:table(\s|$)/);
    const cards = container.querySelector("ul.md\\:hidden")!;
    expect(cards).toBeTruthy();
    expect(within(table).getAllByRole("row")).toHaveLength(11); // header + 10 per page
    expect(cards.children).toHaveLength(10);
  });

  it("shows x of y signed, filters, search and cursor pagination", () => {
    render(<DocumentsListScreen vm={byId(DOCUMENTS_LIST_STATES, "many").vm} />);
    expect(screen.getAllByText("4 of 10 signed").length).toBeGreaterThan(0);
    const filters = screen.getByRole("navigation", { name: "Filter by status" });
    // The sr-only counts are absolutely positioned: the scroller must be their containing block,
    // or they widen the page on phones (found in the 390px screenshots).
    expect(filters.className).toMatch(/(^|\s)relative(\s|$)/);
    expect(filters.className).toContain("overflow-x-auto");
    expect(within(filters).getByRole("link", { current: "page" }).textContent).toMatch(/^All/);
    expect(screen.getByRole("searchbox", { name: "Search by title or signer email" })).toBeTruthy();
    const next = screen.getByRole("link", { name: "Next" });
    expect(next.getAttribute("href")).toMatch(/^\/tools\/sign\/documents\?cursor=/);
    expect(screen.queryByRole("link", { name: "Previous" })).toBeNull();
  });

  it("has distinct empty and no-results states", () => {
    render(<DocumentsListScreen vm={byId(DOCUMENTS_LIST_STATES, "empty").vm} />);
    expect(screen.getByRole("heading", { name: "No documents yet" })).toBeTruthy();
    cleanup();
    render(<DocumentsListScreen vm={byId(DOCUMENTS_LIST_STATES, "no-results").vm} />);
    expect(screen.getByRole("heading", { name: "No documents match" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Show all documents" })).toBeTruthy();
  });

  it("row menu offers download only for completed and void only for active documents", async () => {
    const user = userEvent.setup();
    render(<DocumentsListScreen vm={byId(DOCUMENTS_LIST_STATES, "one").vm} />);
    const [trigger] = screen.getAllByRole("button", { name: /^Actions for / });
    await user.click(trigger);
    const menu = await screen.findByRole("menu");
    expect(within(menu).getByRole("menuitem", { name: "Download signed PDF" })).toBeTruthy();
    expect(within(menu).queryByRole("menuitem", { name: "Void document" })).toBeNull();
  });

  it("has a loading skeleton that announces itself", () => {
    render(<DocumentsListSkeleton />);
    expect(screen.getByRole("status").textContent).toContain("Loading documents…");
  });
});

describe("DocumentDetailScreen", () => {
  it.each(DOCUMENT_DETAIL_STATES.map((s) => [s.label, s] as const))("renders: %s", (_label, state) => {
    render(<DocumentDetailScreen vm={state.vm} />);
    expect(screen.getByRole("heading", { level: 1, name: state.vm.document.title })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Copy ID" })).toBeTruthy();
    expect(screen.getByRole("figure", { name: `${state.vm.document.title} preview` })).toBeTruthy();
    const signers = screen.getByRole("heading", { name: "Signers" }).closest("section")!;
    expect(within(signers).getAllByRole("listitem")).toHaveLength(state.vm.signers.length);
  });

  it("completed: downloads and verify, no void or remind", () => {
    render(<DocumentDetailScreen vm={byId(DOCUMENT_DETAIL_STATES, "completed").vm} />);
    expect(screen.getByRole("button", { name: "Download signed PDF" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Download audit certificate" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Verify" }).getAttribute("href")).toMatch(/^\/tools\/sign\/verify\//);
    expect(screen.queryByRole("button", { name: "Void document" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Remind all" })).toBeNull();
  });

  it("in progress: remind all, per-signer remind, and void with the consequences", async () => {
    const user = userEvent.setup();
    render(<DocumentDetailScreen vm={byId(DOCUMENT_DETAIL_STATES, "partial").vm} />);
    expect(screen.queryByRole("button", { name: "Download signed PDF" })).toBeNull();
    expect(screen.getByRole("button", { name: "Remind all" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Remind Priya Raman" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Remind Jordan Lee" })).toBeNull(); // already signed
    await user.click(screen.getByRole("button", { name: "Void document" }));
    const dialog = await screen.findByRole("alertdialog", { name: "Void this document?" });
    expect(dialog.textContent).toContain("can't be undone");
    expect(document.activeElement).toBe(within(dialog).getByRole("button", { name: "Cancel" }));
  });

  it("explains declined documents with the reason, and sequential signers waiting their turn", () => {
    render(<DocumentDetailScreen vm={byId(DOCUMENT_DETAIL_STATES, "declined").vm} />);
    // Once in the notice above the signers, once in the activity timeline.
    expect(screen.getAllByText("Priya Raman declined to sign")).toHaveLength(2);
    expect(screen.getAllByText(/The payment terms don't match/).length).toBeGreaterThan(0);
    cleanup();
    render(<DocumentDetailScreen vm={byId(DOCUMENT_DETAIL_STATES, "ten-signers").vm} />);
    expect(screen.getAllByText("Waiting for their turn to sign").length).toBe(5);
  });
});

describe("TemplatePickerScreen", () => {
  it("lists every catalog template plus the upload card, filtered by category", async () => {
    const user = userEvent.setup();
    render(<TemplatePickerScreen vm={TEMPLATE_PICKER_STATES[0].vm} />);
    for (const t of SIGN_TEMPLATES) {
      expect(screen.getByRole("link", { name: new RegExp(t.name.replace(/[()/]/g, ".")) }).getAttribute("href")).toBe(`/tools/sign/new/${t.slug}`);
    }
    expect(screen.getByRole("link", { name: /Upload your own PDF/ }).getAttribute("href")).toBe("/tools/sign/new/upload");
    await user.click(screen.getByRole("button", { name: "NDA" }));
    expect(screen.getByRole("button", { name: "NDA" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.queryByRole("link", { name: /Offer Letter/ })).toBeNull();
    expect(screen.getByRole("link", { name: /Mutual NDA/ })).toBeTruthy();
  });
});

describe("BuilderScreen", () => {
  it.each(BUILDER_STATES.map((s) => [s.label, s] as const))("renders: %s", (_label, state) => {
    render(<BuilderScreen vm={state.vm} />);
    expect(screen.getByRole("heading", { level: 1, name: state.vm.template.name })).toBeTruthy();
    expect(screen.getByRole("listitem", { current: "step" }).textContent).toContain("Details");
  });

  it("generates a field per template field and blocks Continue until required fields are filled", async () => {
    const user = userEvent.setup();
    const vm = BUILDER_STATES[0].vm;
    render(<BuilderScreen vm={vm} />);
    for (const field of vm.template.fields) expect(screen.getByLabelText(field.label, { exact: false })).toBeTruthy();
    await user.click(screen.getByRole("button", { name: /Continue to signers/ }));
    expect(screen.getByText(/Fix \d+ problems to continue/)).toBeTruthy();
    expect(screen.getByRole("listitem", { current: "step" }).textContent).toContain("Details");
  });

  it("has a Form/Preview switch for small screens and a live preview", async () => {
    const user = userEvent.setup();
    render(<BuilderScreen vm={BUILDER_STATES[0].vm} />);
    expect(screen.getByTestId("details-preview").className).toContain("hidden lg:block");
    await user.click(screen.getByRole("button", { name: "Preview" }));
    expect(screen.getByTestId("details-form").className).toContain("hidden lg:block");
    expect(screen.getByTestId("details-preview").className).not.toContain("hidden");
    await user.click(screen.getByRole("button", { name: "Form" }));
    await user.type(screen.getByLabelText(/Party A legal name/), "Acme Studio LLC");
    expect(within(screen.getByRole("figure")).getByText("Acme Studio LLC")).toBeTruthy();
    expect(await screen.findByText("Saved", {}, { timeout: 2000 })).toBeTruthy();
  });

  it.each([
    ["free-new", "Free document 1 of 3 this month"],
    ["free-at-limit", "You're out of free documents"],
    ["credits", "Uses 1 credit"],
    ["pro", "Included in Sign Pro"],
  ])("review shows the cost line for %s", async (id, text) => {
    const { filledBuilderState } = await import("../fixtures/builder");
    const vm = byId(BUILDER_STATES, id).vm;
    render(<BuilderScreen vm={vm} initialState={filledBuilderState(vm.template, 2, 2)} />);
    expect(screen.getByText(text)).toBeTruthy();
    expect(screen.getByText("Not supported in KarmaKoders Sign")).toBeTruthy();
    const send = screen.queryByRole("button", { name: "Send for signature" });
    if (id === "free-at-limit") {
      expect(send).toBeNull();
      expect(screen.getByRole("link", { name: "Buy credits" }).getAttribute("href")).toBe("/tools/sign/billing");
      expect(screen.getByRole("link", { name: "Upgrade to Sign Pro" })).toBeTruthy();
    } else {
      expect(send).toBeTruthy();
    }
  });

  it("requires the eligibility confirmation before sending", async () => {
    const user = userEvent.setup();
    const { filledBuilderState } = await import("../fixtures/builder");
    const vm = BUILDER_STATES[0].vm;
    render(<BuilderScreen vm={vm} initialState={filledBuilderState(vm.template, 2, 2)} />);
    await user.click(screen.getByRole("button", { name: "Send for signature" }));
    expect(screen.getByRole("alert").textContent).toMatch(/Confirm the document can be signed electronically/);
  });
});

describe("UploadScreen", () => {
  it.each(UPLOAD_STATES.map((s) => [s.label, s] as const))("drop zone renders: %s", (_label, state) => {
    render(<UploadScreen vm={state.vm} />);
    expect(screen.getByLabelText(/Drop your PDF here/)).toBeTruthy();
    expect(screen.getByText(/PDF only, up to 10 MB/)).toBeTruthy();
  });

  it("rejects a non-PDF and a too-large PDF with what to do", async () => {
    const user = userEvent.setup({ applyAccept: false });
    render(<UploadScreen vm={UPLOAD_STATES[0].vm} />);
    const input = screen.getByLabelText(/Drop your PDF here/) as HTMLInputElement;
    await user.upload(input, new File(["x"], "notes.txt", { type: "text/plain" }));
    expect(screen.getByRole("alert").textContent).toMatch(/Only PDF files/);
    const big = new File(["x"], "big.pdf", { type: "application/pdf" });
    Object.defineProperty(big, "size", { value: 11 * 1024 * 1024 });
    await user.upload(input, big);
    expect(screen.getByRole("alert").textContent).toMatch(/The limit is 10 MB/);
  });

  it("places fields per signer by tap/keyboard, with initials on each field and a legend", async () => {
    const user = userEvent.setup();
    const vm = UPLOAD_STATES[0].vm;
    const { container } = render(<UploadScreen vm={vm} initialFile={{ name: "contract.pdf", size: 1000, pages: 2 }} />);
    expect(screen.getAllByRole("group", { name: /^Page \d$/ })).toHaveLength(2);
    await user.click(screen.getByRole("button", { name: "Signature" }));
    expect(screen.getByRole("button", { name: "Signature" }).getAttribute("aria-pressed")).toBe("true");
    await user.click(screen.getByRole("button", { name: "Place signature on page 1" }));
    const chip = container.querySelector("[data-field-id]")!;
    expect(chip.textContent).toContain("JL");
    expect(chip.textContent).toContain("Signature field for Jordan Lee");
    expect(chip.className).toContain("border-blue-700");

    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByRole("alert").textContent).toContain("Priya Raman");

    await user.click(screen.getByRole("radio", { name: /Priya Raman/ }));
    await user.click(screen.getByRole("button", { name: "Place signature on page 2" }));
    const chips = container.querySelectorAll("[data-field-id]");
    expect(chips[1].textContent).toContain("PR");
    expect(chips[1].className).toContain("border-emerald-700");
    await user.click(screen.getByRole("button", { name: "Remove signature field for Priya Raman on page 2" }));
    expect(container.querySelectorAll("[data-field-id]")).toHaveLength(1);
  });
});

describe("BillingScreen", () => {
  it.each(BILLING_STATES.map((s) => [s.label, s] as const))("renders: %s", (_label, state) => {
    render(<BillingScreen vm={state.vm} />);
    expect(screen.getByRole("heading", { level: 1, name: "Billing" })).toBeTruthy();
    for (const price of ["$10", "$25", "$15", "$150", "$29", "$290"]) expect(screen.getAllByText(price).length).toBeGreaterThan(0);
    expect(screen.getByRole("group", { name: "Billing period" })).toBeTruthy();
    expect((screen.getByRole("button", { name: "Manage billing" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("shows the renewal date for Pro and the empty purchases state", () => {
    render(<BillingScreen vm={byId(BILLING_STATES, "pro").vm} />);
    expect(screen.getByText("Renews on Nov 17, 2026")).toBeTruthy();
    expect(screen.getAllByText("Your current plan").length).toBeGreaterThan(0);
    cleanup();
    render(<BillingScreen vm={byId(BILLING_STATES, "free").vm} />);
    expect(screen.getByRole("heading", { name: "No purchases yet" })).toBeTruthy();
  });
});

describe("SettingsScreen", () => {
  it.each(SETTINGS_STATES.map((s) => [s.label, s] as const))("renders: %s", (_label, state) => {
    const logoutAll = vi.fn(async () => undefined);
    render(<SettingsScreen vm={state.vm} logoutAllAction={logoutAll} />);
    expect(screen.getByText(state.vm.profile.email)).toBeTruthy();
    expect(screen.getByText("Credit and Pro documents show your branding instead of the KarmaKoders footer.")).toBeTruthy();
    expect(screen.getByText("This device")).toBeTruthy();
    expect(screen.getAllByText(/^Last active /)).toHaveLength(state.vm.sessions.length);
    expect(screen.getByRole("button", { name: "Log out of all devices" })).toBeTruthy();
  });

  it("previews a logo and rejects other image types", async () => {
    const user = userEvent.setup({ applyAccept: false });
    const createObjectURL = vi.fn(() => "blob:logo");
    Object.assign(URL, { createObjectURL, revokeObjectURL: vi.fn() });
    render(<SettingsScreen vm={SETTINGS_STATES[0].vm} logoutAllAction={vi.fn(async () => undefined)} />);
    const input = screen.getByLabelText("Logo");
    await user.upload(input, new File(["x"], "logo.jpg", { type: "image/jpeg" }));
    expect(screen.getByRole("alert").textContent).toBe("Choose a PNG or SVG image.");
    await user.upload(input, new File(["<svg/>"], "logo.svg", { type: "image/svg+xml" }));
    expect(screen.getByRole("img", { name: "Your logo" })).toBeTruthy();
  });
});
