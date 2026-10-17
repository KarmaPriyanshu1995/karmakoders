// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as React from "react";
import { DECLINE_REASON_MAX } from "@/modules/sign/signing/constants";
import {
  REVIEW_ALL_FILLED,
  REVIEW_STATES,
  REVIEW_VM,
  REVIEW_VM_NO_CONTENT,
  SIGNER_CONTEXT,
  SIGNER_CONTEXT_PLAIN,
  SIGNER_STATE_KINDS,
  VERIFY_STATES,
} from "../../fixtures/signer";
import type { SignerActionResult } from "../../signer-view-models";
import { CONSENT_LABEL, ConsentScreen } from "./consent-screen";
import { DeclineScreen } from "./decline-flow";
import { DONE_COPY_LINE, DeclinedScreen, DoneScreen } from "./done-screen";
import { ReviewScreen } from "./review-screen";
import SignDialog, { INTENT_STATEMENT, checkSignatureImage, initialsOf } from "./sign-dialog";
import { SignerFlow } from "./signer-flow";
import { SIGNER_FOOTER_LINKS, SignerShell } from "./signer-shell";
import { SIGNER_STATE_COPY, SignerStateScreen } from "./signer-state-screen";
import { VerifyEmailScreen, normaliseOtpInput, type VerifyEmailActions } from "./verify-email-screen";

// next/dynamic needs Next's bundler to resolve; here it becomes React.lazy so code-split parts render.
vi.mock("next/dynamic", async () => {
  const { lazy, createElement, Suspense } = await import("react");
  type Loaded = React.ComponentType<Record<string, unknown>> | { default: React.ComponentType<Record<string, unknown>> };
  return {
    default: (loader: () => Promise<Loaded>) => {
      const Lazy = lazy(async () => {
        const mod = await loader();
        return { default: typeof mod === "function" ? mod : mod.default };
      });
      return function Dynamic(props: Record<string, unknown>) {
        return createElement(Suspense, { fallback: null }, createElement(Lazy, props));
      };
    },
  };
});

// next/font needs Next's compiler; each font becomes a plain class name.
vi.mock("next/font/google", () => ({
  Dancing_Script: () => ({ className: "font-dancing-script" }),
  Great_Vibes: () => ({ className: "font-great-vibes" }),
  Caveat: () => ({ className: "font-caveat" }),
}));

const OK: SignerActionResult = { ok: true };

// jsdom has no CSS.escape; user-event needs it for arrow keys in a radio group (React useId names).
if (typeof globalThis.CSS === "undefined" || typeof globalThis.CSS.escape !== "function") {
  Object.assign(globalThis, { CSS: { ...(globalThis.CSS ?? {}), escape: (value: string) => value.replace(/[^\w-]/g, (ch) => "\\" + ch) } });
}

beforeEach(() => {
  // jsdom has no canvas; the pad only needs a context that accepts calls.
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(
    () =>
      new Proxy({}, { get: (_t, key) => (key === "canvas" ? undefined : () => undefined), set: () => true }) as unknown as CanvasRenderingContext2D
  );
  vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockReturnValue("data:image/png;base64,AAAA");
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function verifyActions(overrides: Partial<VerifyEmailActions> = {}): VerifyEmailActions {
  return {
    requestCode: vi.fn(async () => OK),
    verifyCode: vi.fn(async () => OK),
    onSessionExpired: vi.fn(),
    onVerified: vi.fn(),
    ...overrides,
  };
}

/** Presses Tab until `target` has focus; fails if it is not reachable by keyboard. */
async function tabTo(user: ReturnType<typeof userEvent.setup>, target: Element, max = 25) {
  for (let i = 0; i < max && document.activeElement !== target; i++) await user.tab();
  expect(document.activeElement).toBe(target);
}

describe("SignerShell", () => {
  it("shows the company name, 'Secured by KarmaKoders Sign', no site navigation and the legal links", () => {
    render(
      <SignerShell brand={SIGNER_CONTEXT.brand}>
        <p>content</p>
      </SignerShell>
    );
    expect(screen.getByText("Northwind Studio")).toBeTruthy();
    expect(screen.getByText(/Secured by/).textContent).toBe("Secured by KarmaKoders Sign");
    const links = screen.getAllByRole("link");
    expect(links.map((a) => a.getAttribute("href"))).toEqual(SIGNER_FOOTER_LINKS.map((l) => l.href));
    expect(links.map((a) => a.getAttribute("href"))).toEqual(["/legal/esign-disclosure", "/legal/privacy"]);
  });

  it("shows the KarmaKoders wordmark (not a link) without branding", () => {
    render(<SignerShell>x</SignerShell>);
    expect(screen.getByText("Karmakoders").closest("a")).toBeNull();
  });
});

describe("VerifyEmailScreen", () => {
  it.each(VERIFY_STATES.map((s) => [s.label, s] as const))("renders: %s", (_label, state) => {
    render(
      <VerifyEmailScreen
        context={state.vm.context}
        actions={verifyActions()}
        initialStep={state.vm.step}
        initialCode={state.vm.code}
        initialError={state.vm.error ?? null}
        initialCooldown={state.vm.cooldown}
      />
    );
    expect(screen.getByRole("heading", { level: 1, name: state.vm.context.documentTitle })).toBeTruthy();
    expect(screen.getByText("j***@example.com")).toBeTruthy();
    if (state.vm.error) expect(screen.getByRole("alert").textContent).toContain(state.vm.error);
  });

  it("sends a code, then offers a one-time-code numeric input with a resend countdown", async () => {
    const user = userEvent.setup();
    const actions = verifyActions();
    render(<VerifyEmailScreen context={SIGNER_CONTEXT} actions={actions} />);
    await user.click(screen.getByRole("button", { name: "Email me a code" }));
    const input = await screen.findByLabelText(/6-digit code/);
    expect(actions.requestCode).toHaveBeenCalledOnce();
    expect(input.getAttribute("autocomplete")).toBe("one-time-code");
    expect(input.getAttribute("inputmode")).toBe("numeric");
    expect(document.activeElement).toBe(input);
    const resend = screen.getByRole("button", { name: /Resend code in 60s/ }) as HTMLButtonElement;
    expect(resend.disabled).toBe(true);
  });

  it("accepts a pasted code with spaces or dashes", async () => {
    const user = userEvent.setup();
    render(<VerifyEmailScreen context={SIGNER_CONTEXT} actions={verifyActions()} initialStep="code" />);
    const input = screen.getByLabelText(/6-digit code/) as HTMLInputElement;
    await user.click(input);
    await user.paste("123 456");
    expect(input.value).toBe("123456");
    expect(normaliseOtpInput("12-34-56-78")).toBe("123456");
  });

  it("announces a wrong code accessibly and keeps the signer on the step", async () => {
    const user = userEvent.setup();
    const actions = verifyActions({ verifyCode: vi.fn(async () => ({ ok: false, kind: "error", message: "That code is incorrect." }) as const) });
    render(<VerifyEmailScreen context={SIGNER_CONTEXT} actions={actions} initialStep="code" initialCode="111111" />);
    await user.click(screen.getByRole("button", { name: "Verify and continue" }));
    expect((await screen.findByRole("alert")).textContent).toContain("That code is incorrect.");
    expect(screen.getByLabelText(/6-digit code/).getAttribute("aria-invalid")).toBe("true");
    expect(actions.onVerified).not.toHaveBeenCalled();
  });

  it("asks for six digits before calling the API", async () => {
    const user = userEvent.setup();
    const actions = verifyActions();
    render(<VerifyEmailScreen context={SIGNER_CONTEXT} actions={actions} initialStep="code" initialCode="12" />);
    await user.click(screen.getByRole("button", { name: "Verify and continue" }));
    expect(screen.getByRole("alert").textContent).toContain("Enter the 6-digit code");
    expect(actions.verifyCode).not.toHaveBeenCalled();
  });

  it("an ended session goes to the expired page; verified moves on; offline shows a network error", async () => {
    const user = userEvent.setup();
    const expired = verifyActions({ verifyCode: vi.fn(async () => ({ ok: false, kind: "expired", message: "x" }) as const) });
    const { unmount } = render(<VerifyEmailScreen context={SIGNER_CONTEXT} actions={expired} initialStep="code" initialCode="123456" />);
    await user.click(screen.getByRole("button", { name: "Verify and continue" }));
    await waitFor(() => expect(expired.onSessionExpired).toHaveBeenCalledOnce());
    unmount();

    const verified = verifyActions();
    const second = render(<VerifyEmailScreen context={SIGNER_CONTEXT} actions={verified} initialStep="code" initialCode="123456" />);
    await user.click(screen.getByRole("button", { name: "Verify and continue" }));
    await waitFor(() => expect(verified.onVerified).toHaveBeenCalledOnce());
    expect(verified.verifyCode).toHaveBeenCalledWith("123456");
    second.unmount();

    const offline = verifyActions({ requestCode: vi.fn(async () => Promise.reject(new TypeError("Failed to fetch"))) });
    render(<VerifyEmailScreen context={SIGNER_CONTEXT} actions={offline} />);
    await user.click(screen.getByRole("button", { name: "Email me a code" }));
    expect((await screen.findByRole("alert")).textContent).toContain("Check your connection");
  });
});

describe("ConsentScreen", () => {
  it("requires the consent box before continuing, links the full disclosure and offers decline", async () => {
    const user = userEvent.setup();
    const onAgree = vi.fn();
    const onDecline = vi.fn();
    render(<ConsentScreen context={SIGNER_CONTEXT} onAgree={onAgree} onDecline={onDecline} />);
    expect(screen.getByRole("link", { name: /full e-sign disclosure/ }).getAttribute("href")).toBe("/legal/esign-disclosure");

    await user.click(screen.getByRole("button", { name: "Continue to the document" }));
    expect(screen.getByRole("alert").textContent).toContain("Tick the box");
    expect(onAgree).not.toHaveBeenCalled();
    const box = screen.getByRole("checkbox", { name: CONSENT_LABEL });
    expect(document.activeElement).toBe(box);

    await user.click(box);
    await user.click(screen.getByRole("button", { name: "Continue to the document" }));
    expect(onAgree).toHaveBeenCalledOnce();
    await user.click(screen.getByRole("button", { name: "Decline to sign" }));
    expect(onDecline).toHaveBeenCalledOnce();
  });

  it("works without a sender name", () => {
    render(<ConsentScreen context={SIGNER_CONTEXT_PLAIN} onAgree={vi.fn()} onDecline={vi.fn()} initialShowError />);
    expect(screen.getByText(/You've been asked to sign/)).toBeTruthy();
    expect(screen.getByRole("alert")).toBeTruthy();
  });
});

describe("ReviewScreen", () => {
  const actions = () => ({ onFinish: vi.fn(async () => OK), onDecline: vi.fn() });

  it.each(REVIEW_STATES.map((s) => [s.label, s] as const))("renders: %s", (_label, state) => {
    render(<ReviewScreen vm={state.vm.vm} actions={actions()} initialValues={state.vm.values} />);
    expect(screen.getByRole("heading", { level: 1, name: state.vm.vm.context.documentTitle })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Decline to sign" })).toBeTruthy();
    if (state.vm.vm.pages.length) {
      expect(screen.getAllByRole("figure")).toHaveLength(state.vm.vm.pages.length);
      expect(screen.getByTestId("signer-bottom-bar")).toBeTruthy();
    } else {
      expect(screen.getByRole("heading", { name: "The document preview isn't available yet" })).toBeTruthy();
      expect(screen.queryByTestId("signer-bottom-bar")).toBeNull();
    }
  });

  it("shows the sender message at the top and the fields left in the bottom bar", () => {
    render(<ReviewScreen vm={REVIEW_VM} actions={actions()} initialValues={REVIEW_STATES[1].vm.values} />);
    expect(screen.getByText(/here's the NDA we discussed/)).toBeTruthy();
    const bar = screen.getByTestId("signer-bottom-bar");
    expect(bar.className).toMatch(/\bfixed\b/);
    expect(bar.className).toMatch(/\bmd:hidden\b/);
    expect(within(bar).getByText("2 fields left")).toBeTruthy();
    expect(within(bar).getByRole("button", { name: "Next field" })).toBeTruthy();
  });

  it("Next field moves focus to the first field left", async () => {
    const user = userEvent.setup();
    render(<ReviewScreen vm={REVIEW_VM} actions={actions()} initialValues={REVIEW_STATES[1].vm.values} />);
    await user.click(within(screen.getByTestId("signer-bottom-bar")).getByRole("button", { name: "Next field" }));
    expect(document.activeElement).toBe(screen.getByRole("textbox", { name: "Job title" }));
  });

  it("finishes once every field is complete", async () => {
    const user = userEvent.setup();
    const a = actions();
    render(<ReviewScreen vm={REVIEW_VM} actions={a} initialValues={REVIEW_ALL_FILLED} />);
    const bar = screen.getByTestId("signer-bottom-bar");
    expect(within(bar).getByText("All fields complete")).toBeTruthy();
    await user.click(within(bar).getByRole("button", { name: "Finish" }));
    expect(a.onFinish).toHaveBeenCalledWith(REVIEW_ALL_FILLED);
  });

  it("marks the signer's fields and other signers' fields with text, not colour alone", () => {
    render(<ReviewScreen vm={REVIEW_VM} actions={actions()} />);
    expect(screen.getByText(/Party A signature · Another signer/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Sign: Your signature, required" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Initial: Initials, page 1, required" })).toBeTruthy();
    expect(screen.getByText("4 fields left", { selector: "[data-testid=signer-bottom-bar] p" })).toBeTruthy();
  });

  it("opens the code-split sign dialog from a signature field and fills every signature field", async () => {
    const user = userEvent.setup();
    render(<ReviewScreen vm={REVIEW_VM} actions={actions()} />);
    await user.click(screen.getByRole("button", { name: /^Sign: Your signature/ }));
    const dialog = await screen.findByRole("dialog", { name: "Add your signature" });
    await user.click(within(dialog).getByRole("tab", { name: "Type" }));
    await user.click(within(dialog).getByRole("button", { name: "Sign" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(screen.getByRole("status").textContent).toContain("Signature added. 3 fields left.");
  });
});

describe("SignDialog", () => {
  const renderDialog = (props: Partial<React.ComponentProps<typeof SignDialog>> = {}) => {
    const onAdopt = vi.fn();
    render(<SignDialog open onOpenChange={vi.fn()} signerName="Jordan Avery Lee" onAdopt={onAdopt} {...props} />);
    return { onAdopt, dialog: screen.getByRole("dialog") };
  };

  it("has Draw, Type and Upload tabs and is a bottom sheet on phones", () => {
    const { dialog } = renderDialog();
    expect(within(dialog).getAllByRole("tab").map((t) => t.textContent)).toEqual(["Draw", "Type", "Upload"]);
    expect(dialog.className).toContain("max-sm:bottom-0");
    expect(within(dialog).getByRole("img", { name: /Draw your signature, empty/ })).toBeTruthy();
  });

  it("the Type tab is reachable and usable with the keyboard only", async () => {
    const user = userEvent.setup();
    const { onAdopt, dialog } = renderDialog();
    const drawTab = within(dialog).getByRole("tab", { name: "Draw" });
    await tabTo(user, drawTab);
    await user.keyboard("{ArrowRight}");
    const typeTab = within(dialog).getByRole("tab", { name: "Type" });
    expect(document.activeElement).toBe(typeTab);
    expect(typeTab.getAttribute("aria-selected")).toBe("true");

    const name = within(dialog).getByRole("textbox", { name: "Your full name" }) as HTMLInputElement;
    await tabTo(user, name);
    await user.clear(name);
    await user.keyboard("Sam Rivera");

    const first = await within(dialog).findByRole("radio", { name: /Dancing Script/ });
    await tabTo(user, first);
    await user.keyboard("{ArrowRight}");
    expect((within(dialog).getByRole("radio", { name: /Great Vibes/ }) as HTMLInputElement).checked).toBe(true);

    const sign = within(dialog).getByRole("button", { name: "Sign" });
    await tabTo(user, sign);
    await user.keyboard("{Enter}");
    expect(onAdopt).toHaveBeenCalledWith({ method: "type", name: "Sam Rivera", font: "great-vibes" });
  });

  it("puts the intent statement next to the Sign button and links it", () => {
    const { dialog } = renderDialog({ initialTab: "type" });
    const sign = within(dialog).getByRole("button", { name: "Sign" });
    const statement = within(dialog).getByText(INTENT_STATEMENT);
    expect(INTENT_STATEMENT).toBe(
      "By selecting Sign, I agree this electronic signature is the legal equivalent of my handwritten signature."
    );
    expect(statement.parentElement).toBe(sign.parentElement);
    expect(statement.nextElementSibling).toBe(sign);
    expect(sign.getAttribute("aria-describedby")?.split(" ")).toContain(statement.id);
  });

  it("asks for a signature before signing", async () => {
    const user = userEvent.setup();
    const { onAdopt, dialog } = renderDialog();
    await user.click(within(dialog).getByRole("button", { name: "Sign" }));
    expect(within(dialog).getByRole("alert").textContent).toContain("Draw your signature first");
    expect(onAdopt).not.toHaveBeenCalled();
  });

  it("draws with pointer events, then undo and clear", async () => {
    const user = userEvent.setup();
    const { onAdopt, dialog } = renderDialog();
    const pad = within(dialog).getByRole("img", { name: /Draw your signature/ });
    fireEvent.pointerDown(pad, { pointerId: 1, button: 0, pointerType: "pen", clientX: 10, clientY: 10, pressure: 0.7 });
    fireEvent.pointerMove(pad, { pointerId: 1, pointerType: "pen", clientX: 40, clientY: 30, pressure: 0.6 });
    fireEvent.pointerUp(pad, { pointerId: 1, pointerType: "pen", clientX: 40, clientY: 30 });
    expect(pad.getAttribute("data-strokes")).toBe("1");
    fireEvent.pointerDown(pad, { pointerId: 2, button: 0, pointerType: "touch", clientX: 5, clientY: 5 });
    fireEvent.pointerUp(pad, { pointerId: 2, pointerType: "touch", clientX: 5, clientY: 5 });
    expect(pad.getAttribute("data-strokes")).toBe("2");

    await user.click(within(dialog).getByRole("button", { name: "Undo" }));
    expect(pad.getAttribute("data-strokes")).toBe("1");
    expect(within(dialog).getByRole("img", { name: "Your signature" }).getAttribute("src")).toBe("data:image/png;base64,AAAA");
    await user.click(within(dialog).getByRole("button", { name: "Sign" }));
    expect(onAdopt).toHaveBeenCalledWith({ method: "draw", dataUrl: "data:image/png;base64,AAAA" });

    await user.click(within(dialog).getByRole("button", { name: "Clear" }));
    expect(pad.getAttribute("data-strokes")).toBe("0");
    expect((within(dialog).getByRole("button", { name: "Undo" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("upload accepts PNG/JPG within the limit and shows the limit", async () => {
    // applyAccept: false so a GIF reaches the screen's own check (a browser can be told "all files").
    const user = userEvent.setup({ applyAccept: false });
    const { dialog } = renderDialog({ initialTab: "upload" });
    expect(within(dialog).getByText(/PNG or JPG, up to 1 MB/)).toBeTruthy();
    const input = within(dialog).getByLabelText(/Image of your signature/) as HTMLInputElement;
    expect(input.accept).toBe("image/png,image/jpeg");

    await user.upload(input, new File(["gif"], "sig.gif", { type: "image/gif" }));
    expect(within(dialog).getByRole("alert").textContent).toContain("Choose a PNG or JPG image.");

    await user.upload(input, new File([new Uint8Array(2 * 1024 * 1024)], "big.png", { type: "image/png" }));
    expect(within(dialog).getByRole("alert").textContent).toContain("The limit is 1 MB.");

    await user.upload(input, new File(["png"], "signature.png", { type: "image/png" }));
    expect(await within(dialog).findByText("Selected: signature.png")).toBeTruthy();
    expect(within(dialog).queryByRole("alert")).toBeNull();
  });

  it("initials default to the signer's initials", () => {
    expect(initialsOf("Jordan Avery Lee")).toBe("JAL");
    expect(checkSignatureImage({ type: "image/jpeg", size: 1000 })).toBeNull();
    const { dialog } = renderDialog({ kind: "initials", initialTab: "type" });
    expect((within(dialog).getByRole("textbox", { name: "Your initials" }) as HTMLInputElement).value).toBe("JAL");
  });
});

describe("DeclineScreen", () => {
  it("requires a reason, confirms the consequences with Cancel focused, then declines", async () => {
    const user = userEvent.setup();
    const onDecline = vi.fn(async () => OK);
    render(<DeclineScreen context={SIGNER_CONTEXT} onDecline={onDecline} onBack={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Decline document" }));
    expect(screen.getByRole("alert").textContent).toContain("Tell the sender why");
    const reason = screen.getByRole("textbox", { name: /Reason for declining/ }) as HTMLTextAreaElement;
    expect(document.activeElement).toBe(reason);
    expect(reason.maxLength).toBe(DECLINE_REASON_MAX);

    await user.type(reason, "Wrong start date");
    expect(screen.getByText(`16 / ${DECLINE_REASON_MAX} characters`)).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Decline document" }));
    const confirm = await screen.findByRole("alertdialog", { name: "Decline this document?" });
    expect(document.activeElement).toBe(within(confirm).getByRole("button", { name: "Keep the document" }));
    expect(confirm.textContent).toContain("can't be undone");
    expect(onDecline).not.toHaveBeenCalled();

    await user.click(within(confirm).getByRole("button", { name: "Decline document" }));
    expect(onDecline).toHaveBeenCalledWith("Wrong start date");
  });

  it("shows a failure without leaving the screen", async () => {
    const user = userEvent.setup();
    const onDecline = vi.fn(async () => ({ ok: false, kind: "error", message: "Declining online isn't available yet." }) as const);
    render(<DeclineScreen context={SIGNER_CONTEXT} onDecline={onDecline} onBack={vi.fn()} initialReason="No" initialConfirmOpen />);
    await user.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Decline document" }));
    expect((await screen.findByRole("alert")).textContent).toContain("isn't available yet");
  });
});

describe("Done and declined", () => {
  it("confirms signing with the copy line and no account prompt", () => {
    const { container } = render(<DoneScreen context={SIGNER_CONTEXT} />);
    expect(screen.getByRole("heading", { level: 1, name: "You've signed the document" })).toBeTruthy();
    expect(screen.getByText(DONE_COPY_LINE).textContent).toBe("You'll receive a copy by email when everyone has signed.");
    expect(container.textContent).not.toMatch(/account|sign up|register|create/i);
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("confirms a decline", () => {
    render(<DeclinedScreen context={SIGNER_CONTEXT} />);
    expect(screen.getByRole("heading", { level: 1, name: "You declined to sign" })).toBeTruthy();
  });
});

describe("SignerStateScreen", () => {
  it.each(SIGNER_STATE_KINDS.map((k) => [k.label, k.id] as const))("renders: %s", (_label, kind) => {
    render(<SignerStateScreen kind={kind} />);
    expect(screen.getByRole("heading", { level: 1, name: SIGNER_STATE_COPY[kind].title })).toBeTruthy();
    expect(screen.getByRole("link", { name: "info@karmakoders.com" })).toBeTruthy();
  });

  it("the network state is announced and can carry a retry", () => {
    render(<SignerStateScreen kind="network" action={<button type="button">Try again</button>} />);
    expect(screen.getByRole("alert")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Try again" })).toBeTruthy();
  });
});

describe("SignerFlow", () => {
  const flowActions = () => ({ consent: vi.fn(async () => OK), finish: vi.fn(async () => OK), decline: vi.fn(async () => OK) });

  it("consent → review → finish → done", async () => {
    const user = userEvent.setup();
    const actions = flowActions();
    render(<SignerFlow vm={REVIEW_VM} actions={actions} preview={{ reviewValues: REVIEW_ALL_FILLED }} />);
    await user.click(screen.getByRole("checkbox", { name: CONSENT_LABEL }));
    await user.click(screen.getByRole("button", { name: "Continue to the document" }));
    expect(await screen.findByText("Review and sign")).toBeTruthy();
    expect(document.activeElement).toBe(screen.getByRole("heading", { level: 1 }));
    await user.click(within(screen.getByTestId("signer-bottom-bar")).getByRole("button", { name: "Finish" }));
    expect(await screen.findByRole("heading", { level: 1, name: "You've signed the document" })).toBeTruthy();
    expect(actions.consent).toHaveBeenCalledOnce();
  });

  it("decline from the review, then go back", async () => {
    const user = userEvent.setup();
    render(<SignerFlow vm={REVIEW_VM} actions={flowActions()} preview={{ step: "review" }} />);
    await user.click(screen.getByRole("button", { name: "Decline to sign" }));
    expect(screen.getByRole("heading", { level: 1, name: "Decline to sign" })).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Go back" }));
    expect(screen.getByText("Review and sign")).toBeTruthy();
  });

  it("an ended session shows the expired state", async () => {
    const user = userEvent.setup();
    const actions = { ...flowActions(), consent: vi.fn(async () => ({ ok: false, kind: "expired", message: "x" }) as const) };
    render(<SignerFlow vm={REVIEW_VM_NO_CONTENT} actions={actions} preview={{}} />);
    await user.click(screen.getByRole("checkbox", { name: CONSENT_LABEL }));
    await user.click(screen.getByRole("button", { name: "Continue to the document" }));
    expect(await screen.findByRole("heading", { level: 1, name: "Your signing session has expired" })).toBeTruthy();
  });

  it("the review without document content reserves no bottom bar", () => {
    const { container } = render(<SignerFlow vm={REVIEW_VM_NO_CONTENT} actions={flowActions()} preview={{ step: "review" }} />);
    expect(container.firstElementChild!.className).not.toContain("pb-[calc(6rem");
  });

  it("the review with content reserves the bottom bar from the first render (no layout shift)", () => {
    const { container } = render(<SignerFlow vm={REVIEW_VM} actions={flowActions()} preview={{ step: "review" }} />);
    expect(container.firstElementChild!.className).toContain("pb-[calc(6rem+env(safe-area-inset-bottom))]");
    expect(container.firstElementChild!.className).toContain("md:pb-0");
  });
});
