"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function ScanForm() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      const response = await fetch("/api/scans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = (await response.json()) as { scanId?: string; error?: string };
      if (!response.ok || !data.scanId) {
        setError(data.error ?? "Could not start the scan.");
        setPending(false);
        return;
      }
      router.push(`/scans/${data.scanId}`);
    } catch {
      setError("Could not reach the server.");
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-10 space-y-4">
      <label className="block">
        <span className="sr-only">App URL</span>
        <input
          type="url"
          name="url"
          required
          placeholder="https://your-app.example"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          className="w-full rounded-lg border border-stone-300 bg-white px-4 py-3 text-base text-stone-900 shadow-sm outline-none ring-stone-400 placeholder:text-stone-400 focus:ring-2"
        />
      </label>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center justify-center rounded-lg bg-stone-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Starting…" : "Scan for free"}
      </button>
    </form>
  );
}
