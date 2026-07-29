import { getPostBySlug } from "@/lib/actions";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/sections/Footer";
import { notFound } from "next/navigation";
import { Calendar, User, Tag } from "lucide-react";
import { motion } from "framer-motion";
import type { Metadata } from "next";

import { DEFAULT_POSTS } from "@/lib/constants";

export const dynamic = "force-dynamic";

const SITE_URL = "https://www.karmakoders.com";

async function resolvePost(slug: string) {
  let post: any = await getPostBySlug(slug);
  if (!post) {
    post = DEFAULT_POSTS.find((p) => p.slug === slug);
  }
  return post;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = await resolvePost(slug);

  if (!post) {
    return { title: "Post Not Found | karmakoders" };
  }

  const seoMeta = post.seoMeta ? (typeof post.seoMeta === 'string' ? JSON.parse(post.seoMeta) : post.seoMeta) : {};
  const title = seoMeta.title || `${post.title} | karmakoders Blog`;
  const description = seoMeta.description || post.excerpt || post.title;
  const url = `${SITE_URL}/blog/${slug}`;
  const canonical = seoMeta.canonicalUrl || url;
  const robots = seoMeta.noIndex ? { index: false, follow: true } : undefined;

  return {
    title,
    description,
    alternates: { canonical },
    robots,
    openGraph: {
      title,
      description,
      url: canonical,
      type: "article",
      ...(post.image && { images: [{ url: post.image }] }),
    },
  };
}

export default async function BlogPostDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await resolvePost(slug);

  if (!post) {
    notFound();
  }

  const postDate = post.createdAt ? new Date(post.createdAt) : new Date(post.date);
  const postUrl = `${SITE_URL}/blog/${slug}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BlogPosting",
        "@id": `${postUrl}#article`,
        headline: post.title,
        url: postUrl,
        mainEntityOfPage: postUrl,
        description: post.excerpt || post.title,
        ...(post.image && { image: post.image }),
        datePublished: postDate.toISOString(),
        author: {
          "@type": "Person",
          name: post.author || "karmakoders Team",
        },
        publisher: { "@id": `${SITE_URL}/#organization` },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
          { "@type": "ListItem", position: 2, name: "Blog", item: `${SITE_URL}/blog` },
          { "@type": "ListItem", position: 3, name: post.title, item: postUrl },
        ],
      },
    ],
  };

  const seoMeta = post.seoMeta ? (typeof post.seoMeta === "string" ? JSON.parse(post.seoMeta) : post.seoMeta) : {};

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    <main className="min-h-screen bg-slate-950 flex flex-col relative overflow-hidden">
      <Navbar />

      <article className="pt-32 pb-24 px-8 md:px-24 max-w-5xl mx-auto w-full">
        <header className="mb-12">
          <div className="flex items-center gap-4 text-indigo-400 text-sm font-bold uppercase tracking-widest mb-6">
            <span className="px-3 py-1 bg-indigo-500/10 rounded-full border border-indigo-500/20">{post.category || "Insight"}</span>
            <span className="text-slate-500">•</span>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              {postDate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
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
              alt={seoMeta.imageAlt || post.title} 
              className="w-full h-full"
            />
          </div>
        )}

        <div 
          className="prose prose-invert prose-indigo max-w-none prose-lg prose-p:leading-relaxed prose-headings:text-white prose-a:text-indigo-400"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />
      </article>

      <Footer />
    </main>
    </>
  );
}
