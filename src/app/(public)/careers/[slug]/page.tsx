import { getJobBySlug } from "@/lib/actions";
import { notFound } from "next/navigation";
import { Building, MapPin, Briefcase, ChevronLeft } from "lucide-react";
import Link from "next/link";
import { ApplicationForm } from "@/components/careers/ApplicationForm";
import type { Metadata } from "next";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/sections/Footer";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const job = await getJobBySlug(slug);
  if (!job) return { title: "Job Not Found" };
  return {
    title: `${job.title} | Careers`,
    description: `Apply for the ${job.title} position at our company.`,
    alternates: { canonical: `/careers/${slug}` },
  };
}

export default async function JobDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const job = await getJobBySlug(slug);
  
  if (!job || !job.isActive) {
    notFound();
  }

  return (
    <>
    <Navbar />
    <div className="pt-44 pb-20">
      <div className="max-w-5xl mx-auto px-6">
        
        <Link href="/careers" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white mb-8 transition-colors">
          <ChevronLeft className="w-4 h-4" /> Back to all jobs
        </Link>

        {/* Job Header */}
        <div className="mb-12">
          <h1 className="text-3xl md:text-5xl font-bold text-white mb-6">
            {job.title}
          </h1>
          
          <div className="flex flex-wrap items-center gap-4 text-sm font-medium text-slate-400">
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800">
              <Building className="w-4 h-4 text-indigo-400" /> {job.department || "General"}
            </span>
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800">
              <MapPin className="w-4 h-4 text-emerald-400" /> {job.location || "Remote"}
            </span>
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-white">
              <Briefcase className="w-4 h-4 text-slate-400" /> {job.type}
            </span>
          </div>
        </div>

        {/* Content & Form Grid */}
        <div className="grid lg:grid-cols-5 gap-12 items-start">
          
          {/* Job Description */}
          <div className="lg:col-span-3 prose prose-invert prose-indigo max-w-none">
            <div dangerouslySetInnerHTML={{ __html: job.description }} />
          </div>

          {/* Application Form Sticky Sidebar */}
          <div className="lg:col-span-2 sticky top-24">
            <ApplicationForm jobId={job.id} />
          </div>

        </div>

      </div>
    </div>
    <Footer />
    </>
  );
}
