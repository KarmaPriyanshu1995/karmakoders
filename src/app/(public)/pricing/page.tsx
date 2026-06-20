import { PricingSection } from "@/components/sections/PricingSection";
import { FAQSection } from "@/components/sections/FAQSection";
import { Footer } from "@/components/sections/Footer";
import { Navbar } from "@/components/Navbar";

export const metadata = {
  title: "Pricing | karmakoders",
  description: "Explore our flexible pricing plans tailored for your digital success.",
};

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-slate-950 flex flex-col relative overflow-hidden">
      <Navbar />

      <div>
        <PricingSection />
        <FAQSection isSpace={true} />
      </div>

      <Footer />
    </main>
  );
}
