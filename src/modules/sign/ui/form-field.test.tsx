// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { FormField, Input, Select, Switch, Textarea } from "./form";

function describedBy(el: HTMLElement): string[] {
  return (el.getAttribute("aria-describedby") ?? "").split(" ").filter(Boolean);
}

describe("FormField", () => {
  it("links the label to the control", () => {
    render(
      <FormField label="Signer email">
        <Input type="email" />
      </FormField>
    );
    const input = screen.getByLabelText("Signer email");
    expect(input.tagName).toBe("INPUT");
    expect(input.getAttribute("aria-invalid")).toBeNull();
    expect(input.hasAttribute("aria-describedby")).toBe(false);
  });

  it("describes the control with its hint", () => {
    render(
      <FormField label="Signer email" hint="We send the signing link here.">
        <Input type="email" />
      </FormField>
    );
    const input = screen.getByLabelText("Signer email");
    const ids = describedBy(input);
    expect(ids).toHaveLength(1);
    expect(document.getElementById(ids[0])?.textContent).toBe("We send the signing link here.");
  });

  it("marks the control invalid, announces the error and describes it with hint + error", () => {
    render(
      <FormField label="Signer email" hint="We send the signing link here." error="Enter an email like name@company.com.">
        <Input type="email" />
      </FormField>
    );
    const input = screen.getByLabelText("Signer email");
    expect(input.getAttribute("aria-invalid")).toBe("true");
    const alert = screen.getByRole("alert");
    expect(alert.textContent).toContain("Enter an email like name@company.com.");
    const ids = describedBy(input);
    expect(ids).toHaveLength(2);
    expect(ids).toContain(alert.id);
  });

  it("required: sets required and aria-required; the asterisk is hidden from screen readers", () => {
    render(
      <FormField label="Full name" required>
        <Input />
      </FormField>
    );
    // The accessible name excludes the aria-hidden asterisk.
    const input = screen.getByRole("textbox", { name: "Full name" }) as HTMLInputElement;
    expect(input.required).toBe(true);
    expect(input.getAttribute("aria-required")).toBe("true");
    const star = screen.getByText("*");
    expect(star.getAttribute("aria-hidden")).toBe("true");
  });

  it("keeps the control's own id and aria-describedby", () => {
    render(
      <>
        <p id="extra">Extra help</p>
        <FormField label="Reason" hint="Shown to the sender.">
          <Textarea id="decline-reason" aria-describedby="extra" />
        </FormField>
      </>
    );
    const textarea = screen.getByLabelText("Reason");
    expect(textarea.id).toBe("decline-reason");
    expect(describedBy(textarea)).toEqual(["extra", "decline-reason-hint"]);
  });

  it("works with Select", () => {
    render(
      <FormField label="Signing order" error="Choose an order.">
        <Select defaultValue="">
          <option value="">Choose…</option>
          <option value="parallel">Everyone at once</option>
        </Select>
      </FormField>
    );
    expect(screen.getByLabelText("Signing order").getAttribute("aria-invalid")).toBe("true");
  });

  it("Sign inputs use the visible white/35 border instead of the site's 8% border", () => {
    render(
      <FormField label="Email">
        <Input />
      </FormField>
    );
    const classes = screen.getByLabelText("Email").className.split(/\s+/);
    expect(classes).toContain("border-white/35");
    expect(classes).not.toContain("border-white/10");
    expect(classes).toContain("focus-visible:ring-[#FFC300]");
  });
});

describe("Switch", () => {
  it("is a labelled switch whose state is exposed with aria-checked", async () => {
    const { default: userEvent } = await import("@testing-library/user-event");
    const user = userEvent.setup();
    render(<Switch label="Send reminders" />);
    const control = screen.getByRole("switch", { name: "Send reminders" });
    expect(control.getAttribute("aria-checked")).toBe("false");
    await user.click(control);
    expect(control.getAttribute("aria-checked")).toBe("true");
  });
});
