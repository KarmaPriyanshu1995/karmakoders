import { getCaseStudies } from "@/lib/actions";
import { CaseStudiesSectionClient, type CaseStudyCardLike } from "./CaseStudiesSectionClient";

const defaultCases: CaseStudyCardLike[] = [
  {
    title: "Revolutionizing Fintech UX",
    client: "Quantum Pay",
    result: "+240% Engagement",
    image: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=800",
  },
  {
    title: "AI-Driven Health Diagnostics",
    client: "Nova Health",
    result: "99.9% Accuracy",
    image: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&q=80&w=800",
  },
];

interface CaseStudiesProps {
  isCentered?: boolean;
  tagline?: string;
  heading?: string;
  cases?: CaseStudyCardLike[];
  limit?: number;
  showViewAll?: boolean;
  isFirstSection?: boolean;
}

// Server component: same pattern as ProjectsSection — resolve real data before
// render so SSR output (and anything reading raw HTML) reflects the database.
export async function CaseStudiesSection({
  cases: propCases,
  ...rest
}: CaseStudiesProps) {
  let cases: CaseStudyCardLike[] = propCases ?? [];
  let isFallback = false;

  if (!propCases) {
    try {
      const dbCases = await getCaseStudies();
      if (dbCases && dbCases.length > 0) {
        cases = dbCases;
      } else {
        cases = defaultCases;
        isFallback = true;
      }
    } catch (err) {
      console.error("Failed to load case studies:", err);
      cases = defaultCases;
      isFallback = true;
    }
  }

  return <CaseStudiesSectionClient cases={cases} isFallback={isFallback} {...rest} />;
}
