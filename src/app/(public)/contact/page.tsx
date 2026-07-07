
import { ContactSection } from "@/components/sections/ContactSection";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/sections/Footer";

export const metadata = {
  title: "Contact Us | karmakoders",
  description: "Get in touch with us to start your next digital project.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-slate-950 flex flex-col relative overflow-hidden">
      <Navbar />
      <div>
        <ContactSection 
          isSpace={true}
          tagline="Start Your Journey"
          heading="Ready to Build Something Amazing?"
          description="Fill out the form below and our team will get back to you within 24 hours to discuss your project idea."
        />
      </div>
      <Footer />
    </main>
  );
}
