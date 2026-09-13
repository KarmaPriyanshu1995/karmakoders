import Link from "next/link";
import { Calendar, User, ArrowRight } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/sections/Footer";
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
      <section className="pt-32 pb-24 px-6 md:px-12 max-w-7xl mx-auto w-full">
        <p className="text-indigo-400 text-sm font-bold uppercase tracking-widest mb-4">{POST_TYPE_LABELS[type]}</p>
        <h1 className="text-4xl md:text-6xl font-black text-white tracking-tight mb-4">{heading || hub.name}</h1>
        <p className="text-lg text-slate-400 max-w-3xl mb-14">{description || hub.description}</p>

        {posts.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-10 text-slate-400">
            Nothing published here yet. Check back soon, or{" "}
            <Link href="/contact" className="text-indigo-400">
              start a project
            </Link>
            .
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {posts.map((post) => (
              <Link
                key={post.id}
                href={articlePath(post.slug)}
                className="group rounded-3xl border border-white/10 bg-white/5 p-5 hover:border-indigo-500/30 hover:-translate-y-1 transition-all"
              >
                <div className="rounded-2xl overflow-hidden aspect-[16/10] mb-5 bg-slate-900">
                  {post.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={post.image} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : null}
                </div>
                <p className="text-xs uppercase tracking-widest text-indigo-400 mb-2">
                  {post.category || POST_TYPE_LABELS[normalizePostType(post.type)]}
                </p>
                <h2 className="text-xl font-bold text-white group-hover:text-indigo-400 transition-colors line-clamp-2">
                  {post.title}
                </h2>
                <div className="flex items-center gap-4 mt-4 text-sm text-slate-500">
                  <span className="inline-flex items-center gap-1.5">
                    <Calendar className="w-4 h-4" />
                    {new Date(post.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <User className="w-4 h-4" />
                    {post.author || "karmakoders"}
                  </span>
                </div>
                <span className="inline-flex items-center gap-2 mt-5 text-sm font-bold text-white">
                  Read <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>
      <Footer />
    </main>
  );
}
