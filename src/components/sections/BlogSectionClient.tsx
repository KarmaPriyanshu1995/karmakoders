"use client";

import type { PostData } from "@/lib/constants";
import { ListingCardGrid, type ListingCardItem } from "@/components/content/ListingCardGrid";

export interface BlogSectionClientProps {
  tagline?: string;
  heading?: string;
  posts?: PostData[];
  showViewAll?: boolean;
  postsPerPage?: number;
  isFirstSection?: boolean;
}

function imageAltFromPost(post: PostData) {
  try {
    const seoMeta = post.seoMeta
      ? typeof post.seoMeta === "string"
        ? JSON.parse(post.seoMeta)
        : post.seoMeta
      : {};
    return seoMeta.imageAlt || post.title;
  } catch {
    return post.title;
  }
}

function toListingItems(posts: PostData[]): ListingCardItem[] {
  return posts.map((post) => ({
    id: post.id || post.slug,
    href: `/blog/${post.slug || "#"}`,
    title: post.title,
    image: post.image,
    imageAlt: imageAltFromPost(post),
    category: post.category,
    date: post.createdAt || post.date,
    author: post.author,
    viewCount: post.viewCount,
  }));
}

export function BlogSectionClient({
  tagline = "Our Blog",
  heading = "Latest Insights & Digital Trends",
  posts = [],
  showViewAll = true,
  postsPerPage = 9,
  isFirstSection = false,
}: BlogSectionClientProps) {
  return (
    <ListingCardGrid
      id="blog"
      ariaLabel="Latest blog posts"
      tagline={tagline}
      heading={heading}
      isFirstSection={isFirstSection}
      items={toListingItems(posts)}
      showViewAll={showViewAll}
      viewAllHref="/blog"
      viewAllLabel="View All Posts"
      itemsPerPage={postsPerPage}
      emptyMessage="No posts published yet."
      ctaLabel="Read Article"
    />
  );
}
