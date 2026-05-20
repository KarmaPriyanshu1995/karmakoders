import { HeroSection } from "@/components/sections/HeroSection";
import { AboutSection } from "@/components/sections/AboutSection";
import { ServicesSection } from "@/components/sections/ServicesSection";
import { ProjectsSection } from "@/components/sections/ProjectsSection";
import { TestimonialsSection } from "@/components/sections/TestimonialsSection";
import { TeamSection } from "@/components/sections/TeamSection";
import { PricingSection } from "@/components/sections/PricingSection";
import { BlogSection } from "@/components/sections/BlogSection";
import { ContactSection } from "@/components/sections/ContactSection";
import { FAQSection } from "@/components/sections/FAQSection";
import { CareersSection } from "@/components/sections/CareersSection";
import { CaseStudiesSection } from "@/components/sections/CaseStudiesSection";
import { NewsletterSection } from "@/components/sections/NewsletterSection";
import { ContentSection } from "@/components/sections/ContentSection";
import { HeroScrollSection } from "@/components/sections/HeroScrollSection";

// Map section types to their corresponding React components
const sectionMap: Record<string, React.ComponentType<Record<string, unknown>>> = {
  hero: HeroSection,
  about: AboutSection,
  services: ServicesSection,
  projects: ProjectsSection,
  testimonials: TestimonialsSection,
  team: TeamSection,
  pricing: PricingSection,
  blog: BlogSection,
  contact: ContactSection,
  faq: FAQSection,
  careers: CareersSection,
  casestudies: CaseStudiesSection,
  newsletter: NewsletterSection,
  content: ContentSection,
  heroscroll: HeroScrollSection,
};

interface SectionData {
  id: string;
  type: string;
  content?: Record<string, unknown>;
}

interface DynamicRendererProps {
  sections: SectionData[];
}

export function DynamicRenderer({ sections }: DynamicRendererProps) {
  return (
    <>
      {sections.map((section) => {
        const Component = sectionMap[section.type];
        
        if (!Component) {
          // Fallback for missing components in development
          return (
            <div key={section.id} className="py-20 text-center border-y border-dashed border-slate-800 text-slate-500">
              [Missing Component: {section.type}]
            </div>
          );
        }

        return <Component key={section.id} {...section.content} />;
      })}
    </>
  );
}
