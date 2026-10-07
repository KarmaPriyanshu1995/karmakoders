import { describe, expect, it } from "vitest";
import {
  BLOCKED_TYPE_KEYWORDS,
  SIGN_TEMPLATES,
  findBlockedTypeKeywords,
  getTemplateBySlug,
  listTemplateSlugs,
} from "@/modules/sign/templates";
import { getSignSitemapPaths } from "@/modules/sign/templates/sitemap";

const URL_SAFE_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

describe("Sign template catalog", () => {
  it("has unique, URL-safe slugs", () => {
    const slugs = listTemplateSlugs();
    expect(slugs.length).toBeGreaterThan(0);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const slug of slugs) {
      expect(slug, slug).toMatch(URL_SAFE_SLUG);
      expect(encodeURIComponent(slug)).toBe(slug);
    }
  });

  it("does not include upload-pdf (a separate flow at /tools/sign/new/upload)", () => {
    expect(listTemplateSlugs()).not.toContain("upload");
    expect(listTemplateSlugs()).not.toContain("upload-pdf");
  });

  it.each(SIGN_TEMPLATES.map((t) => [t.slug, t] as const))(
    "%s has at least one signer role with unique keys",
    (_slug, template) => {
      expect(template.signerRoles.length).toBeGreaterThan(0);
      const keys = template.signerRoles.map((r) => r.key);
      expect(new Set(keys).size).toBe(keys.length);
      for (const role of template.signerRoles) expect(role.label.trim()).not.toBe("");
    }
  );

  it.each(SIGN_TEMPLATES.map((t) => [t.slug, t] as const))(
    "%s: required fields have labels and field keys are unique",
    (_slug, template) => {
      const keys = template.fields.map((f) => f.key);
      expect(new Set(keys).size).toBe(keys.length);
      for (const field of template.fields.filter((f) => f.required)) {
        expect(field.label.trim(), field.key).not.toBe("");
      }
    }
  );

  it.each(SIGN_TEMPLATES.map((t) => [t.slug, t] as const))(
    "%s is not a blocked document type",
    (_slug, template) => {
      const identity = `${template.slug} ${template.name} ${template.category}`;
      expect(findBlockedTypeKeywords(identity)).toEqual([]);
    }
  );

  it("detects blocked keywords as whole words", () => {
    expect(findBlockedTypeKeywords("Last Will and Testament")).toEqual(
      expect.arrayContaining(["will", "testament"])
    );
    expect(findBlockedTypeKeywords("divorce-settlement")).toEqual(["divorce"]);
    expect(findBlockedTypeKeywords("Requires wet ink")).toContain("wet ink");
    expect(findBlockedTypeKeywords("Willow Courtyard Agreement")).toEqual([]);
    expect(BLOCKED_TYPE_KEYWORDS.length).toBeGreaterThan(0);
  });

  it("getTemplateBySlug round-trips every slug and rejects unknown ones", () => {
    for (const slug of listTemplateSlugs()) expect(getTemplateBySlug(slug)?.slug).toBe(slug);
    expect(getTemplateBySlug("nope")).toBeUndefined();
  });

  it("sitemap includes the index and every template", () => {
    const paths = getSignSitemapPaths();
    expect(paths).toContain("/tools/sign");
    expect(paths).toContain("/tools/sign/templates");
    for (const slug of listTemplateSlugs()) expect(paths).toContain(`/tools/sign/templates/${slug}`);
  });
});
