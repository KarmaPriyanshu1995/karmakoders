"use client";

import { motion } from "framer-motion";
import { Code2, Globe } from "lucide-react";
import Image from "next/image";
import { useSiteContent } from "@/components/SiteContentProvider";
import type { TeamMember } from "@/lib/social-proof";
import { generatePersonSchema } from "@/lib/seo/schemaGenerator";

interface TeamProps {
  isSpace?: boolean;
  tagline?: string;
  heading?: string;
  team?: TeamMember[];
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function TeamSection({
  isSpace = false,
  tagline = "Our Team",
  heading = "The people on your thread",
  team,
}: TeamProps) {
  const site = useSiteContent();
  const members = team?.length ? team : site.team;

  return (
    <section id="team" aria-label="Our team" className={`${isSpace ? "py-20 sm:py-32" : "pb-20 sm:pb-32"} px-4 sm:px-6 md:px-12 bg-slate-950 relative overflow-hidden`}>
      <div className="absolute top-1/2 left-0 w-[600px] h-[400px] bg-indigo-500 opacity-[0.02] blur-[150px] rounded-full pointer-events-none transform -translate-y-1/2 -translate-x-1/4" />

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="text-center mb-16 flex flex-col items-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 backdrop-blur-xl border border-white/10 text-indigo-500 text-sm font-bold tracking-widest uppercase mb-6"
          >
            {tagline}
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-4 text-4xl md:text-5xl font-black text-white tracking-tight"
          >
            {heading}
          </motion.h2>
        </div>

        <div className={`grid gap-8 ${
          members.length === 1
            ? "grid-cols-1 max-w-sm mx-auto"
            : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
        }`}>
          {members.map((member, i) => (
            <motion.div
              key={member.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="group p-4 rounded-[2rem] bg-white/5 border border-white/10 hover:border-indigo-500/30 hover:bg-white/10 hover:-translate-y-2 transition-all duration-300 flex flex-col"
            >
              <div className="relative rounded-2xl overflow-hidden aspect-[3/4] mb-6 bg-white/5">
                {member.image ? (
                  <Image
                    src={member.image}
                    alt={member.name}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-5xl font-black text-indigo-400">
                    {initials(member.name)}
                  </div>
                )}
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-3 opacity-0 group-hover:opacity-100 transition-all duration-500 translate-y-4 group-hover:translate-y-0">
                  {member.linkedin ? (
                    <a href={member.linkedin} aria-label={`${member.name} on LinkedIn`} rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-white/10 backdrop-blur flex items-center justify-center text-white hover:bg-indigo-500 hover:text-slate-950">
                      <span className="text-xs font-black" aria-hidden="true">in</span>
                    </a>
                  ) : null}
                  {member.website ? (
                    <a href={member.website} aria-label={`${member.name}'s website`} rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-white/10 backdrop-blur flex items-center justify-center text-white hover:bg-indigo-500 hover:text-slate-950">
                      <Globe className="w-5 h-5" aria-hidden="true" />
                    </a>
                  ) : null}
                  {member.github ? (
                    <a href={member.github} aria-label={`${member.name} on GitHub`} rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-white/10 backdrop-blur flex items-center justify-center text-white hover:bg-indigo-500 hover:text-slate-950">
                      <Code2 className="w-5 h-5" aria-hidden="true" />
                    </a>
                  ) : null}
                </div>
              </div>
              <div className="px-2 pb-2">
                <h4 className="text-xl font-bold text-white mb-1">{member.name}</h4>
                <p className="text-slate-400 text-sm font-medium">{member.role}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
      {members.map((member) => {
        const sameAs = [member.linkedin, member.github, member.website].filter(
          (url): url is string => typeof url === "string" && url.startsWith("http")
        );
        return (
          <script
            key={`person-jsonld-${member.name}`}
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify(
                generatePersonSchema({
                  name: member.name,
                  jobTitle: member.role,
                  image: member.image,
                  sameAs,
                  worksFor: { name: site.brand.legalName, url: "https://www.karmakoders.com" },
                })
              ),
            }}
          />
        );
      })}
    </section>
  );
}
