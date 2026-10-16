// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Button, IconButton, signButtonClasses } from "./button";

function classesOf(el: HTMLElement): string[] {
  return el.className.split(/\s+/).filter(Boolean);
}

/** Base text colour utilities (no variant prefix such as hover:). */
function textColours(classes: string[]): string[] {
  return classes.filter((c) => /^text-(white|black|\[#[0-9A-Fa-f]{3,8}\]|[a-z]+-\d{2,3})$/.test(c));
}

function backgrounds(classes: string[]): string[] {
  return classes.filter((c) => /^bg-/.test(c));
}

describe("Sign Button", () => {
  it("primary renders bg #FFC300 with #1C1B1A text, even with size and colour overrides", () => {
    render(
      <Button className="text-base text-white bg-black" size="lg">
        Send for signature
      </Button>
    );
    const classes = classesOf(screen.getByRole("button", { name: "Send for signature" }));
    expect(backgrounds(classes)).toEqual(["bg-[#FFC300]"]);
    expect(textColours(classes)).toEqual(["text-[#1C1B1A]"]);
    // The size class survives next to the colour (the tailwind-merge text-* collision).
    expect(classes).toContain("text-base");
  });

  it.each(["sm", "md", "lg"] as const)("primary keeps its colours at size %s", (size) => {
    const classes = signButtonClasses("primary", size).split(" ");
    expect(classes).toContain("bg-[#FFC300]");
    expect(classes).toContain("text-[#1C1B1A]");
  });

  it.each(["sm", "md", "lg"] as const)("size %s is at least 44px tall", (size) => {
    const classes = signButtonClasses("secondary", size).split(" ");
    expect(classes.some((c) => c === "h-11" || c === "h-12")).toBe(true);
    expect(classes).not.toContain("h-9");
    expect(classes).not.toContain("h-8");
    expect(classes).not.toContain("h-10");
  });

  it("danger is bg-rose-600 with white text", () => {
    render(<Button variant="danger">Void document</Button>);
    const classes = classesOf(screen.getByRole("button", { name: "Void document" }));
    expect(backgrounds(classes)).toEqual(["bg-rose-600"]);
    expect(textColours(classes)).toEqual(["text-white"]);
    expect(classes).toContain("hover:bg-rose-700");
  });

  it("has a visible yellow focus ring and respects reduced motion", () => {
    render(<Button>Continue</Button>);
    const classes = classesOf(screen.getByRole("button", { name: "Continue" }));
    expect(classes).toContain("focus-visible:ring-2");
    expect(classes).toContain("focus-visible:ring-[#FFC300]");
    expect(classes).not.toContain("focus-visible:ring-1");
    expect(classes).toContain("motion-reduce:hover:translate-y-0");
  });

  it("loading: disabled, aria-busy, spinner, and the loading text becomes the name", () => {
    render(
      <Button loading loadingText="Sending…">
        Send for signature
      </Button>
    );
    const button = screen.getByRole("button", { name: "Sending…" });
    expect(button).toHaveProperty("disabled", true);
    expect(button.getAttribute("aria-busy")).toBe("true");
    expect(button.querySelector("svg.animate-spin")).not.toBeNull();
  });

  it("loading without loadingText keeps the label and still disables", () => {
    render(<Button loading>Save draft</Button>);
    const button = screen.getByRole("button", { name: "Save draft" });
    expect(button).toHaveProperty("disabled", true);
    expect(button.getAttribute("aria-busy")).toBe("true");
  });

  it("not loading: no aria-busy", () => {
    render(<Button>Save draft</Button>);
    expect(screen.getByRole("button", { name: "Save draft" }).hasAttribute("aria-busy")).toBe(false);
  });

  it("renders a decorative leading icon", () => {
    render(<Button icon={<Plus />}>New document</Button>);
    const button = screen.getByRole("button", { name: "New document" });
    expect(button.querySelector("[aria-hidden] svg")).not.toBeNull();
  });

  it("asChild renders the child element with the Sign classes", () => {
    render(
      <Button asChild>
        <Link href="/tools/sign/templates">Browse templates</Link>
      </Button>
    );
    const link = screen.getByRole("link", { name: "Browse templates" });
    expect(classesOf(link)).toContain("bg-[#FFC300]");
    expect(classesOf(link)).toContain("h-11");
  });
});

describe("Sign IconButton", () => {
  it("is 44px square and named by its aria-label", () => {
    render(
      <IconButton aria-label="More actions">
        <Plus />
      </IconButton>
    );
    const button = screen.getByRole("button", { name: "More actions" });
    const classes = classesOf(button);
    expect(classes).toContain("h-11");
    expect(classes).toContain("w-11");
    expect(classes).not.toContain("h-9");
  });

  it("requires an aria-label at the type level", () => {
    // @ts-expect-error aria-label is required
    const element = <IconButton><Plus /></IconButton>;
    expect(element).toBeTruthy();
  });
});
