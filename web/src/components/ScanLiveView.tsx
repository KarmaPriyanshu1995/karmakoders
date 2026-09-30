"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type ScanEvent = {
  id: string;
  message: string;
  createdAt: string;
};

type ScanPayload = {
  id: string;
  status: string;
  primaryUrl: string;
  projectName: string;
  events: ScanEvent[];
  error?: string;
};

const TERMINAL = new Set(["done", "failed"]);

export function ScanLiveView({ scanId }: { scanId: string }) {
  const [scan, setScan] = useState<ScanPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function load() {
      try {
        const response = await fetch(`/api/scans/${scanId}`, { cache: "no-store" });
        const data = (await response.json()) as ScanPayload;
        if (!response.ok) {
          if (!cancelled) setError(data.error ?? "Could not load the scan.");
          return;
        }
        if (!cancelled) {
          setScan(data);
          setError(null);
          if (!TERMINAL.has(data.status)) {
            timer = setTimeout(load, 1000);
          }
        }
      } catch {
        if (!cancelled) {
          setError("Could not reach the server.");
          timer = setTimeout(load, 2000);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [scanId]);

  if (error && !scan) {
    return (
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-16">
        <p className="text-red-700">{error}</p>
        <Link href="/" className="mt-6 inline-block text-sm text-stone-700 underline">
          Back
        </Link>
      </main>
    );
  }

  if (!scan) {
    return (
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-16">
        <p className="text-stone-600">Loading scan…</p>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-16">
      <p className="text-sm font-medium tracking-wide text-stone-500">Live scan</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-stone-900">
        {scan.projectName}
      </h1>
      <p className="mt-2 break-all text-stone-600">{scan.primaryUrl}</p>
      <p className="mt-4 text-sm uppercase tracking-wide text-stone-500">
        Status: <span className="font-medium text-stone-900">{scan.status}</span>
      </p>

      <ol className="mt-8 space-y-3 border-l border-stone-200 pl-4">
        {scan.events.map((event) => (
          <li key={event.id} className="text-stone-800">
            <p>{event.message}</p>
            <p className="text-xs text-stone-400">
              {new Date(event.createdAt).toLocaleTimeString()}
            </p>
          </li>
        ))}
      </ol>

      {scan.status === "queued" ? (
        <p className="mt-8 text-sm text-stone-500">
          Waiting for the Python worker. In another terminal run{" "}
          <code className="rounded bg-stone-100 px-1.5 py-0.5 text-stone-800">
            python worker.py
          </code>{" "}
          from <code className="rounded bg-stone-100 px-1.5 py-0.5">engine/</code>.
        </p>
      ) : null}

      {TERMINAL.has(scan.status) ? (
        <div className="mt-10 flex gap-4">
          <Link
            href="/"
            className="inline-flex rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white"
          >
            Scan another URL
          </Link>
        </div>
      ) : null}

      {/* TODO: replace polling with SSE from /api/scans/[id]/events (step 7). */}
    </main>
  );
}
