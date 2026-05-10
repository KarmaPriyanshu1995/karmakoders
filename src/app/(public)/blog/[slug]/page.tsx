import { getPostBySlug } from "@/lib/actions";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/sections/Footer";
import { notFound } from "next/navigation";
import { Calendar, User, Tag } from "lucide-react";
import { motion } from "framer-motion";

export const dynamic = "force-dynamic";

export default async function BlogPostDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-slate-950 flex flex-col relative overflow-hidden">
      <Navbar />

      <article className="pt-32 pb-24 px-8 md:px-24 max-w-5xl mx-auto w-full">
        <header className="mb-12">
          <div className="flex items-center gap-4 text-indigo-400 text-sm font-bold uppercase tracking-widest mb-6">
            <span className="px-3 py-1 bg-indigo-500/10 rounded-full border border-indigo-500/20">{post.category || "Insight"}</span>
            <span className="text-slate-500">•</span>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              {new Date(post.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
            </div>
          </div>
          
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-8 leading-tight">
            {post.title}
          </h1>

          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-indigo-400">
              <User className="w-6 h-6" />
            </div>
            <div>
              <div className="text-white font-bold">{post.author || "karmakoders Team"}</div>
              <div className="text-slate-500 text-sm">Design & Engineering</div>
            </div>
          </div>
        </header>

        {post.image && (
          <div className="relative rounded-3xl overflow-hidden aspect-video mb-12 border border-slate-800">
            <img 
              src={post.image} 
              alt={post.title} 
              className="w-full h-full object-cover"
            />
          </div>
        )}

        <div className="prose prose-invert prose-indigo max-w-none">
          {/* This is where the post content goes. In a real app, you'd use a markdown renderer here. */}
          <div className="text-slate-300 text-lg leading-relaxed space-y-6">
            {post.content.split('\n').map((para, i) => (
              <p key={i}>{para}</p>
            ))}
          </div>
        </div>
      </article>

      <Footer />
    </main>
  );
}
