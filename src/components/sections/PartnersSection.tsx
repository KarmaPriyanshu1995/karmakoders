import { TestimonialsSection } from "@/components/sections/TestimonialsSection";

/** Home already mounts this as `partners`. Reuse the slot for P1 testimonials. */
export function PartnersSection() {
  return (
    <TestimonialsSection
      tagline="Social proof"
      heading="What teams say after we ship"
    />
  );
}
