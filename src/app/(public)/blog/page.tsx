import { BlogSection } from "@/components/sections/BlogSection";
import { Footer } from "@/components/sections/Footer";
import { Navbar } from "@/components/Navbar";
import { getPosts } from "@/lib/actions";

export const revalidate = 60;

export const metadata = {
  title: "Blog | karmakoders",
  description: "Latest insights, trends, and tutorials in AI and web development.",
  alternates: { canonical: "/blog" },
};

export default async function BlogPage() {
  const posts = await getPosts();

  return (
    <main className="min-h-screen bg-slate-950 flex flex-col relative overflow-hidden">
      <Navbar />

      <div>
        <BlogSection 
          tagline="Insights"
          heading="Explore Our Latest Thinking"
          posts={posts.length > 0 ? posts : undefined}
          showViewAll={false}
          postsPerPage={9}
        />
      </div>
      
      <Footer />
    </main>
  );
}
