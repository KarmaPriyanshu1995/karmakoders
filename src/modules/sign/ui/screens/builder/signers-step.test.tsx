// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { filledBuilderState, duplicateEmailBuilderState } from "../../fixtures/builder";
import { PLAN_FREE_NEW, PLAN_PRO } from "../../fixtures/plans";
import { builderTemplateVM } from "../template-cards";
import { BuilderScreen } from "./builder-screen";

afterEach(cleanup);

const template = builderTemplateVM("mutual-nda")!;

function signerNames(): string[] {
  const list = screen.getByRole("heading", { name: "Who needs to sign" }).closest("section")!.querySelector("ol")!;
  return within(list)
    .getAllByRole("listitem")
    .map((li) => (li.querySelector("input") as HTMLInputElement).value);
}

describe("Signers step", () => {
  it("reorders signers with the keyboard (move buttons) and announces the new position", async () => {
    const user = userEvent.setup();
    render(<BuilderScreen vm={{ template, plan: PLAN_PRO, defaultExpiryDays: 14 }} initialState={filledBuilderState(template, 3, 1)} />);
    expect(signerNames()).toEqual(["Jordan Lee", "Priya Raman", "Marcus Webb"]);

    screen.getByRole("button", { name: "Move Jordan Lee down" }).focus();
    await user.keyboard("{Enter}");
    expect(signerNames()).toEqual(["Priya Raman", "Jordan Lee", "Marcus Webb"]);
    expect(screen.getByText("Moved Jordan Lee to position 2 of 3.")).toBeTruthy();

    screen.getByRole("button", { name: "Move Marcus Webb up" }).focus();
    await user.keyboard(" ");
    expect(signerNames()).toEqual(["Priya Raman", "Marcus Webb", "Jordan Lee"]);

    expect((screen.getByRole("button", { name: "Move Priya Raman up" }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: "Move Jordan Lee down" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("offers a drag handle on desktop only (hidden below md)", () => {
    render(<BuilderScreen vm={{ template, plan: PLAN_PRO, defaultExpiryDays: 14 }} initialState={filledBuilderState(template, 2, 1)} />);
    const handle = screen.getByRole("button", { name: "Drag to reorder Jordan Lee" });
    expect(handle.className).toMatch(/(^|\s)hidden(\s|$)/);
    expect(handle.className).toContain("md:inline-flex");
  });

  it("blocks Continue on duplicate emails", async () => {
    const user = userEvent.setup();
    render(<BuilderScreen vm={{ template, plan: PLAN_PRO, defaultExpiryDays: 14 }} initialState={duplicateEmailBuilderState(template)} />);
    await user.click(screen.getByRole("button", { name: /Continue to review/ }));
    expect(screen.getByText(/Another signer already uses this email/)).toBeTruthy();
    expect(screen.getByRole("listitem", { current: "step" }).textContent).toContain("Signers");
  });

  it("limits Free to 2 signers with an upgrade hint; Pro can add up to 10", async () => {
    const user = userEvent.setup();
    render(<BuilderScreen vm={{ template, plan: PLAN_FREE_NEW, defaultExpiryDays: 14 }} initialState={filledBuilderState(template, 2, 1)} />);
    expect((screen.getByRole("button", { name: "Add signer" }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText(/Free documents allow up to 2 signers/)).toBeTruthy();
    expect(screen.getByRole("link", { name: "Buy credits or upgrade" }).getAttribute("href")).toBe("/tools/sign/billing");
    cleanup();

    render(<BuilderScreen vm={{ template, plan: PLAN_PRO, defaultExpiryDays: 14 }} initialState={filledBuilderState(template, 9, 1)} />);
    await user.click(screen.getByRole("button", { name: "Add signer" }));
    expect(screen.getByText("10 of up to 10 signers")).toBeTruthy();
    expect((screen.getByRole("button", { name: "Add signer" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("defaults to sequential order, 14-day expiry and reminders on", () => {
    render(<BuilderScreen vm={{ template, plan: PLAN_PRO, defaultExpiryDays: 14 }} initialState={{ step: 1 }} />);
    expect((screen.getByRole("radio", { name: /sequential/ }) as HTMLInputElement).checked).toBe(true);
    expect((screen.getByLabelText("Signing link expires after") as HTMLSelectElement).value).toBe("14");
    expect(screen.getByRole("switch", { name: /Remind signers automatically/ }).getAttribute("aria-checked")).toBe("true");
  });
});
