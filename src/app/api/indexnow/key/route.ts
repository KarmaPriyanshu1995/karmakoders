import { resolveIndexNowKey } from "@/lib/seo/indexnow-key";

export const dynamic = "force-dynamic";

export function GET() {
  return new Response(resolveIndexNowKey(), {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  });
}
