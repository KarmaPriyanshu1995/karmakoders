import { BlockRenderer } from "@/components/content/BlockRenderer";
import { parseContentBlocks } from "@/lib/content/blocks";

export function PostBody({ content, blocks }: { content: string; blocks?: unknown }) {
  const parsed = parseContentBlocks(blocks);
  if (parsed.length > 0) {
    return <BlockRenderer blocks={parsed} />;
  }
  return (
    <div
      className="prose prose-invert prose-indigo max-w-none prose-lg prose-p:leading-relaxed prose-headings:text-white prose-a:text-indigo-400"
      dangerouslySetInnerHTML={{ __html: content || "" }}
    />
  );
}
