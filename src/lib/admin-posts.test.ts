import { describe, expect, it } from "vitest";
import {
  adminBlogHref,
  adminPostOrderBy,
  adminPostWhere,
  parseAdminPostListQuery,
} from "./admin-posts";

describe("parseAdminPostListQuery", () => {
  it("uses defaults for empty params", () => {
    expect(parseAdminPostListQuery({})).toEqual({
      q: "",
      type: "all",
      status: "all",
      sort: "created",
      page: 1,
      pageSize: 20,
    });
  });

  it("accepts known filters and ignores junk", () => {
    const query = parseAdminPostListQuery({
      q: "  kitchen sink  ",
      type: "case-study",
      status: "draft",
      sort: "views",
      page: "3",
      pageSize: "50",
    });
    expect(query).toMatchObject({
      q: "kitchen sink",
      type: "case-study",
      status: "draft",
      sort: "views",
      page: 3,
      pageSize: 50,
    });
    expect(parseAdminPostListQuery({ type: "video", status: "archived", sort: "popular", pageSize: "7" })).toMatchObject({
      type: "all",
      status: "all",
      sort: "created",
      pageSize: 20,
    });
  });
});

describe("adminPostWhere", () => {
  it("scopes tenant, type, draft, and search", () => {
    expect(
      adminPostWhere("t1", parseAdminPostListQuery({ type: "prompt", status: "draft", q: "MVP" })),
    ).toEqual({
      tenantId: "t1",
      type: "prompt",
      published: false,
      OR: [
        { title: { contains: "MVP", mode: "insensitive" } },
        { slug: { contains: "MVP", mode: "insensitive" } },
        { excerpt: { contains: "MVP", mode: "insensitive" } },
        { author: { contains: "MVP", mode: "insensitive" } },
      ],
    });
  });
});

describe("adminPostOrderBy", () => {
  it("sorts views then recency", () => {
    expect(adminPostOrderBy("views")).toEqual([{ viewCount: "desc" }, { createdAt: "desc" }]);
  });
});

describe("adminBlogHref", () => {
  it("omits default params and keeps filters", () => {
    expect(adminBlogHref({ page: 1, pageSize: 20 })).toBe("/admin/blog");
    expect(adminBlogHref({ q: "draft", status: "draft", page: 2 })).toBe(
      "/admin/blog?q=draft&status=draft&page=2",
    );
  });
});
