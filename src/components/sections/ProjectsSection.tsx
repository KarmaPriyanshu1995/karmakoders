import { Suspense } from "react";
import { DEFAULT_PROJECTS } from "@/lib/constants";
import { getProjects } from "@/lib/actions";
import { ProjectsSectionClient, type ProjectLike } from "./ProjectsSectionClient";

interface ProjectsProps {
  isCentered?: boolean;
  tagline?: string;
  heading?: string;
  subheading?: string;
  capabilities?: string[];
  projects?: ProjectLike[];
  limit?: number;
  showViewAll?: boolean;
  isFirstSection?: boolean;
}

// Server component: resolves real project data (or the explicit `projects` prop
// passed in from a CMS section) before anything renders, so the SSR HTML — what
// crawlers and AI systems actually read — reflects the live database instead of
// a client-only placeholder state.
export async function ProjectsSection({
  projects: propProjects,
  ...rest
}: ProjectsProps) {
  let projects: ProjectLike[] = propProjects ?? [];
  let isFallback = false;

  if (!propProjects) {
    try {
      const dbProjects = await getProjects();
      if (dbProjects && dbProjects.length > 0) {
        projects = dbProjects;
      } else {
        projects = DEFAULT_PROJECTS;
        isFallback = true;
      }
    } catch (err) {
      console.error("Failed to load projects:", err);
      projects = DEFAULT_PROJECTS;
      isFallback = true;
    }
  }

  return (
    <Suspense fallback={<div className="py-24 text-center text-white">Loading Portfolio...</div>}>
      <ProjectsSectionClient projects={projects} isFallback={isFallback} {...rest} />
    </Suspense>
  );
}
