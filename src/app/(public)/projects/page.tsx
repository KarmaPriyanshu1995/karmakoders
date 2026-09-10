import { permanentRedirect } from "next/navigation";

/**
 * Legacy route kept for bookmarks/external links.
 * Canonical list lives at /portfolio (CMS). next.config also 301s here.
 */
export default function ProjectsPage() {
  permanentRedirect("/portfolio");
}
