"use client";

import { useState } from "react";
import { Copy, Check, Code2 } from "lucide-react";

interface SchemaPreviewProps {
  schema: string | object;
  title?: string;
  isValid?: boolean;
  errors?: string[];
}

export function SchemaPreview({ schema, title, isValid = true, errors = [] }: SchemaPreviewProps) {
  const [copied, setCopied] = useState(false);

  const json = typeof schema === "string" ? schema : JSON.stringify(schema, null, 2);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(json);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-2xl border border-white/10 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-white/5 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Code2 className="w-4 h-4 text-[#FFC300]" />
          <span className="text-sm font-bold text-white">{title || "JSON-LD Schema"}</span>
          {isValid ? (
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-green-500/20 text-green-300 border border-green-500/20">
              ✓ Valid
            </span>
          ) : (
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/20">
              ✗ Invalid
            </span>
          )}
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-[#FFC300] transition-colors px-3 py-1.5 rounded-lg hover:bg-[#FFC300]/10"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>

      {/* Error messages */}
      {errors.length > 0 && (
        <div className="px-4 py-2 bg-red-500/10 border-b border-red-500/20">
          {errors.map((err, i) => (
            <p key={i} className="text-xs text-red-400 font-medium">⚠ {err}</p>
          ))}
        </div>
      )}

      {/* Code block */}
      <div className="bg-[#1C1B1A] overflow-auto max-h-96">
        <pre className="p-4 text-xs font-mono text-green-300 leading-relaxed">
          <code>{json}</code>
        </pre>
      </div>

      {/* Script tag hint */}
      <div className="px-4 py-3 bg-white/3 border-t border-white/5">
        <p className="text-xs text-slate-500">
          Add to your page: <code className="text-[#FFC300] font-mono text-xs">{`<script type="application/ld+json">`}...{`</script>`}</code>
        </p>
      </div>
    </div>
  );
}
