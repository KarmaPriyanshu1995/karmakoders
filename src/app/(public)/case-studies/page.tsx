
import { getCaseStudies } from "@/lib/actions";
import { CaseStudiesSection } from "@/components/sections/CaseStudiesSection";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/sections/Footer";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Success Stories | karmakoders",
  description: "Detailed case studies and success stories of our transformative digital solutions.",
};

export default async function CaseStudiesPage() {
  const cases = await getCaseStudies();

  return (
    <main className="min-h-screen bg-slate-950 flex flex-col relative overflow-hidden">
      <Navbar />

      <div>
        <CaseStudiesSection 
          tagline="Success Stories"
          heading="Transformation in Action"
          cases={cases.length > 0 ? cases : undefined}
          limit={0}
          showViewAll={false}
        />
      </div>

      <Footer />
    </main>
  );
}
