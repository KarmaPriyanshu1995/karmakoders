"use client";
import React from "react";
import { ContainerScroll } from "@/components/ui/container-scroll-animation";
import Image from "next/image";

interface HeroScrollSectionProps {
  titleLine1?: string;
  titleLine2?: string;
  imageUrl?: string;
}

export function HeroScrollSection({
  titleLine1 = "Unleash the power of",
  titleLine2 = "Scroll Animations",
  imageUrl = "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=1400",
}: HeroScrollSectionProps) {
  return (
    <section className="flex flex-col overflow-hidden bg-slate-950 pb-20 pt-10 relative">
      <ContainerScroll
        titleComponent={
          <div className="mb-6 md:mb-12">
            <h2 className="text-3xl md:text-5xl font-semibold text-slate-400">
              {titleLine1} <br />
              <span className="text-5xl md:text-[6rem] font-bold mt-1 leading-none text-white bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                {titleLine2}
              </span>
            </h2>
          </div>
        }
      >
        <div className="relative w-full h-full bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex items-center justify-center">
          <Image
            src={imageUrl}
            alt="KarmaKoders Premium Platform Mockup"
            height={720}
            width={1400}
            className="mx-auto rounded-xl object-cover h-full w-full object-left-top shadow-2xl transition-transform duration-500 hover:scale-[1.02]"
            draggable={false}
            priority
          />
          {/* Subtle overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/20 via-transparent to-transparent pointer-events-none" />
        </div>
      </ContainerScroll>
    </section>
  );
}
