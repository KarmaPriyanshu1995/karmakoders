import { getPosts } from "@/lib/actions";
import type { PostData } from "@/lib/constants";
import { BlogSectionClient, type BlogSectionClientProps } from "./BlogSectionClient";

export async function BlogSection({ posts: propPosts, ...rest }: BlogSectionClientProps) {
  let posts = propPosts;

  if (!posts) {
    try {
      const dbPosts = await getPosts("blog");
      posts = (dbPosts ?? []) as unknown as PostData[];
    } catch (err) {
      console.error("Failed to load posts:", err);
      posts = [];
    }
  }

  return <BlogSectionClient posts={posts} {...rest} />;
}
