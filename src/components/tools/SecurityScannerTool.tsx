"use client";

import { FormEvent, useState } from "react";

type Props = {
  scannerBaseUrl: string;
  initialUrl?: string;
};

export function SecurityScannerTool({ scannerBaseUrl, initialUrl = "" }: Props) {
  const [url, setUrl] = useState(initialUrl);
  const base = scannerBaseUrl.replace(/\/$/, "");

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = url.trim();
    const target = trimmed
      ? `${base}/?url=${encodeURIComponent(trimmed)}`
      : `${base}/`;
    window.location.href = target;
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
          className="flex-1 rounded-xl border border-white/15 bg-slate-950/60 px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <button
          type="submit"
          className="rounded-xl bg-indigo-500 px-5 py-3 font-semibold text-white hover:bg-indigo-400"
        >
          Open security scanner
        </button>
      </form>
      <p className="mt-4 text-sm text-slate-500">
        Opens the KarmaKoders scanner app
        {base ? (
          <>
            {" "}
            (<a className="text-indigo-300 hover:text-white underline" href={base}>
              {base}
            </a>
            )
          </>
        ) : null}
        . A scan is not a guarantee of security.
      </p>
    </div>
  );
}
