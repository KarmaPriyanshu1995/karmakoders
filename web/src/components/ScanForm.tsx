"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type Mode = "url" | "repo";

export function ScanForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<Mode>("url");
  const [url, setUrl] = useState("");
  const [projectId, setProjectId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [githubMsg, setGithubMsg] = useState<string | null>(null);
  const [repos, setRepos] = useState<Array<{ id: string; fullName: string }>>([]);
  const [repoId, setRepoId] = useState("");
  const [publicRepo, setPublicRepo] = useState("");

  useEffect(() => {
    const inboundUrl = searchParams.get("url");
    const inboundRepo = searchParams.get("repo");
    if (inboundUrl) {
      setMode("url");
      setUrl(inboundUrl);
    }
    if (inboundRepo) {
      setMode("repo");
      setPublicRepo(inboundRepo);
    }
  }, [searchParams]);

  async function refreshRepos(pid: string) {
    const list = await fetch(`/api/github/repos?projectId=${pid}`, { cache: "no-store" });
    const listed = await list.json();
    if (list.ok && Array.isArray(listed.items)) {
      const items = listed.items.map((r: { id: string; fullName: string }) => ({
        id: r.id,
        fullName: r.fullName,
      }));
      setRepos(items);
      if (items[0]?.id) setRepoId(items[0].id);
    }
  }

  async function connectMockFixture() {
    setError(null);
    setGithubMsg(null);
    setPending(true);
    try {
      const res = await fetch("/api/github/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(projectId ? { projectId } : {}),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not connect GitHub.");
        return;
      }
      if (data.projectId) setProjectId(String(data.projectId));
      setGithubMsg(
        data.message ??
          "Mock fixture linked. For your real public repo, paste the GitHub URL below."
      );
      if (Array.isArray(data.repos) && data.repos.length) {
        setRepos(
          data.repos.map((r: { id: string; fullName?: string }) => ({
            id: r.id,
            fullName: r.fullName || "",
          }))
        );
        if (data.repos[0]?.id) setRepoId(data.repos[0].id);
      }
      if (data.installUrl) {
        window.open(data.installUrl, "_blank", "noopener,noreferrer");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not connect GitHub.");
    } finally {
      setPending(false);
    }
  }

  async function addPublicRepo() {
    setError(null);
    setGithubMsg(null);
    setPending(true);
    try {
      const res = await fetch("/api/github/repos/public", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: projectId || undefined,
          repo: publicRepo,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not authorize that repository.");
        return;
      }
      if (data.projectId) setProjectId(String(data.projectId));
      setGithubMsg(data.message ?? "Public repository authorized.");
      if (data.repo?.id) {
        setRepos((prev) => {
          const next = [
            { id: String(data.repo.id), fullName: String(data.repo.fullName) },
            ...prev.filter((r) => r.id !== data.repo.id),
          ];
          return next;
        });
        setRepoId(String(data.repo.id));
      } else if (data.projectId) {
        await refreshRepos(String(data.projectId));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not authorize repository.");
    } finally {
      setPending(false);
    }
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      if (mode === "url") {
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
        return;
      }

      if (!projectId || !repoId) {
        setError("Add a public GitHub repo (or connect the mock fixture) first.");
        setPending(false);
        return;
      }
      const response = await fetch("/api/scans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "repo", projectId, repoId }),
      });
      const data = (await response.json()) as { scanId?: string; error?: string };
      if (!response.ok || !data.scanId) {
        setError(data.error ?? "Could not start the repository scan.");
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
      <div className="flex gap-2">
        <button
          type="button"
          className={`rounded-lg px-3 py-1.5 text-sm ${
            mode === "url" ? "bg-stone-900 text-white" : "bg-stone-100 text-stone-700"
          }`}
          onClick={() => setMode("url")}
        >
          Scan URL
        </button>
        <button
          type="button"
          className={`rounded-lg px-3 py-1.5 text-sm ${
            mode === "repo" ? "bg-stone-900 text-white" : "bg-stone-100 text-stone-700"
          }`}
          onClick={() => setMode("repo")}
        >
          Scan GitHub repo
        </button>
      </div>

      {mode === "url" ? (
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
      ) : (
        <div className="space-y-3 rounded-lg border border-stone-200 bg-stone-50 p-4">
          <p className="text-sm text-stone-700">
            Paste a <span className="font-medium">public</span> GitHub repository URL or{" "}
            <code className="text-xs">owner/name</code>. Private repos need a real GitHub App
            (not configured yet — currently mock mode only links a local fixture).
          </p>

          <label className="block text-sm text-stone-700">
            Public repository
            <input
              type="text"
              value={publicRepo}
              onChange={(e) => setPublicRepo(e.target.value)}
              placeholder="https://github.com/owner/repo or owner/repo"
              className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm"
            />
          </label>
          <button
            type="button"
            disabled={pending || !publicRepo.trim()}
            onClick={() => void addPublicRepo()}
            className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            Authorize public repo
          </button>

          <div className="border-t border-stone-200 pt-3">
            <button
              type="button"
              disabled={pending}
              onClick={() => void connectMockFixture()}
              className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-800 disabled:opacity-60"
            >
              Use local mock fixture
            </button>
          </div>

          {githubMsg ? <p className="text-xs text-stone-600">{githubMsg}</p> : null}
          {repos.length > 0 ? (
            <label className="block text-sm text-stone-700">
              Repository to scan
              <select
                className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2"
                value={repoId}
                onChange={(e) => setRepoId(e.target.value)}
              >
                {repos.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.fullName}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
        </div>
      )}

      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center justify-center rounded-lg bg-stone-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Starting…" : mode === "repo" ? "Scan repository" : "Scan for free"}
      </button>
    </form>
  );
}
