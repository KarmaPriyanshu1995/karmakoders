"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  initialUrl?: string;
};

// The scanner now lives on this site at /security-scanner.
const SCANNER_PATH = "/security-scanner";

export function SecurityScannerTool({ initialUrl = "" }: Props) {
  const router = useRouter();
  const [url, setUrl] = useState(initialUrl);

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = url.trim();
    router.push(trimmed ? `${SCANNER_PATH}?url=${encodeURIComponent(trimmed)}` : SCANNER_PATH);
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6 md:p-8">
      <p className="text-slate-300 leading-relaxed mb-6">
        Paste your app URL for a plain-English security check: headers, exposed files, TLS, CORS,
        and (when authorized) deeper discovery. Open the full scanner to connect GitHub, verify
        ownership, schedule re-scans, and verify fixes.
      </p>
      <form onSubmit={onSubmit} className="flex flex-col gap-3 sm:flex-row">
        <label className="sr-only" htmlFor="scanner-url">
          App URL
        </label>
        <input
          id="scanner-url"
          type="url"
          placeholder="https://your-app.example"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="flex-1 rounded-xl border border-white/15 bg-[#1C1B1A]/60 px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#FFC300]"
        />
        <button
          type="submit"
          className="rounded-xl bg-[#FFC300] px-5 py-3 font-semibold text-[#1C1B1A] hover:bg-[#FFD60A] shadow-[0_4px_20px_rgba(255,195,0,0.25)]"
        >
          Open security scanner
        </button>
      </form>
      <p className="mt-4 text-sm text-slate-500">A scan is not a guarantee of security.</p>
    </div>
  );
}
