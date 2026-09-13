export function postViewCount(post: unknown): number {
  if (!post || typeof post !== "object" || !("viewCount" in post)) return 0;
  const n = Number((post as { viewCount: unknown }).viewCount);
  return Number.isFinite(n) ? n : 0;
}
