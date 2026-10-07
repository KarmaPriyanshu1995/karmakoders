import { permanentRedirect } from "next/navigation";

/** Reserve `/tools` from the CMS `[slug]` catch-all; Sign is the first paid tool. */
export default function ToolsIndexPage() {
  permanentRedirect("/tools/sign");
}
