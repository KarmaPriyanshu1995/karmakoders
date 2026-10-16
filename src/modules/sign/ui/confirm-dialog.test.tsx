// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button } from "./button";
import { ConfirmDialog } from "./dialog";

function setup(onConfirm = vi.fn()) {
  const user = userEvent.setup();
  render(
    <>
      <button type="button">Before</button>
      <ConfirmDialog
        trigger={<Button variant="danger">Void document</Button>}
        title="Void this document?"
        consequences="Signers can no longer open or sign it. This cannot be undone."
        confirmLabel="Void document"
        onConfirm={onConfirm}
      />
      <button type="button">After</button>
    </>
  );
  return { user, onConfirm };
}

describe("ConfirmDialog", () => {
  it("opens as an alert dialog with the consequences and Cancel focused", async () => {
    const { user } = setup();
    await user.click(screen.getByRole("button", { name: "Void document" }));
    const dialog = await screen.findByRole("alertdialog", { name: "Void this document?" });
    expect(dialog.textContent).toContain("This cannot be undone.");
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Cancel" }));
  });

  it("traps focus inside the dialog", async () => {
    const { user } = setup();
    await user.click(screen.getByRole("button", { name: "Void document" }));
    const dialog = await screen.findByRole("alertdialog");
    for (let i = 0; i < 5; i++) {
      await user.tab();
      expect(dialog.contains(document.activeElement)).toBe(true);
    }
    for (let i = 0; i < 5; i++) {
      await user.tab({ shift: true });
      expect(dialog.contains(document.activeElement)).toBe(true);
    }
  });

  it("Cancel closes without confirming and returns focus to the trigger", async () => {
    const { user, onConfirm } = setup();
    const trigger = screen.getByRole("button", { name: "Void document" });
    await user.click(trigger);
    await user.click(await screen.findByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(onConfirm).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(trigger);
  });

  it("Escape closes and returns focus to the trigger", async () => {
    const { user } = setup();
    const trigger = screen.getByRole("button", { name: "Void document" });
    await user.click(trigger);
    await screen.findByRole("alertdialog");
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it("Enter right after opening activates Cancel, not the destructive action", async () => {
    const { user, onConfirm } = setup();
    await user.click(screen.getByRole("button", { name: "Void document" }));
    await screen.findByRole("alertdialog");
    await user.keyboard("{Enter}");
    expect(onConfirm).not.toHaveBeenCalled();
    expect(screen.queryByRole("alertdialog")).toBeNull();
  });

  it("the confirm button calls onConfirm", async () => {
    const { user, onConfirm } = setup();
    await user.click(screen.getByRole("button", { name: "Void document" }));
    const dialog = await screen.findByRole("alertdialog");
    const confirm = [...dialog.querySelectorAll("button")].find((b) => b.textContent === "Void document")!;
    await user.click(confirm);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
