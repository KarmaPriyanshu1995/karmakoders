import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Building, MapPin, ArrowRight, Briefcase } from "lucide-react";
import type { Metadata } from "next";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/sections/Footer";

export const metadata: Metadata = {
  title: "Careers | Join Our Team",
  description: "Explore career opportunities and join our team of innovators.",
  alternates: { canonical: "/careers" },
};

export default async function CareersPage() {
  const jobs = await prisma.jobOpening.findMany({
    where: { isActive: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <>
    <Navbar />
    <div className="pt-28 sm:pt-32 pb-20 sm:pb-32">
      <div className="max-w-5xl mx-auto px-6">
        
        {/* Header */}
        <div className="text-center space-y-6 mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 text-sm font-semibold mb-0">
            <Briefcase className="w-4 h-4" /> Careers
          </div>
          <h1 className="mt-6 text-4xl md:text-5xl font-bold text-white tracking-tight">
            Join Our Team
          </h1>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            We are always looking for passionate, driven individuals to help us build the future. Explore our open positions below.
          </p>
        </div>

        {/* Jobs List */}
        <div className="grid gap-6">
          {jobs.length === 0 ? (
            <div className="glass-card rounded-2xl p-12 text-center text-slate-400">
              There are currently no open positions. Please check back later!
            </div>
          ) : (
            jobs.map((job) => (
              <Link 
                key={job.id} 
                href={`/careers/${job.slug}`}
                className="group glass-card rounded-2xl p-6 md:p-8 flex flex-col md:flex-row gap-6 md:items-center justify-between hover:bg-slate-800/30 transition-all border border-slate-800 hover:border-indigo-500/30"
              >
                <div className="space-y-4 flex-1">
                  <div>
                    <h2 className="text-2xl font-bold text-white group-hover:text-indigo-400 transition-colors">
                      {job.title}
                    </h2>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-4 text-sm font-medium text-slate-400">
                    <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 border border-slate-800">
                      <Building className="w-4 h-4 text-indigo-400" /> {job.department || "General"}
                    </span>
                    <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 border border-slate-800">
                      <MapPin className="w-4 h-4 text-emerald-400" /> {job.location || "Remote"}
                    </span>
                    <span className="px-3 py-1 rounded-full bg-slate-900 border border-slate-800">
                      {job.type}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-end">
                  <div className="w-12 h-12 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                    <ArrowRight className="w-5 h-5" />
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>

      </div>
    </div>
    <Footer />
    </>
  );
}
