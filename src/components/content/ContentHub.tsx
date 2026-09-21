import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/sections/Footer";
import { ListingCardGrid } from "@/components/content/ListingCardGrid";
import { getPosts } from "@/lib/actions";
import { POST_TYPE_HUB, POST_TYPE_LABELS, articlePath, normalizePostType } from "@/lib/content/post-types";
import type { PostType } from "@/types/content";

export async function ContentHub({
  type,
  heading,
  description,
}: {
  type: PostType;
  heading?: string;
  description?: string;
}) {
  const hub = POST_TYPE_HUB[type];
  const posts = await getPosts(type);

  return (
    <main className="min-h-screen bg-slate-950 flex flex-col">
      <Navbar />
      <ListingCardGrid
        ariaLabel={heading || hub.name}
        tagline={POST_TYPE_LABELS[type]}
        heading={heading || hub.name}
        description={description || hub.description}
        isFirstSection
        items={posts.map((post) => ({
          id: post.id,
          href: articlePath(post.slug),
          title: post.title,
          image: post.image,
          category: post.category || POST_TYPE_LABELS[normalizePostType(post.type)],
          date: post.createdAt,
          author: post.author,
          viewCount: post.viewCount,
        }))}
        emptyMessage={
          <>
            Nothing published here yet. Check back soon, or{" "}
            <Link href="/contact" className="text-indigo-400">
              start a project
            </Link>
            .
          </>
        }
        ctaLabel="Read Article"
      />
      <Footer />
    </main>
  );
}
