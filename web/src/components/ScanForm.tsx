"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { IconGlobe, IconRepo, IconSpinner } from "@/components/scanner/icons";

type Mode = "url" | "repo";

type Props = {
  initialUrl?: string;
  initialRepo?: string;
};

export function ScanForm({ initialUrl = "", initialRepo = "" }: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(initialRepo ? "repo" : "url");
  const [url, setUrl] = useState(initialUrl);
  const [projectId, setProjectId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [githubMsg, setGithubMsg] = useState<string | null>(null);
  const [repos, setRepos] = useState<Array<{ id: string; fullName: string }>>([]);
  const [repoId, setRepoId] = useState("");
  const [publicRepo, setPublicRepo] = useState(initialRepo);

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
    <form onSubmit={onSubmit} className="mt-8 space-y-5">
      <div className="inline-flex rounded-xl border border-white/10 bg-scanner-bg/50 p-1" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={mode === "url"}
          className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
            mode === "url" ? "bg-scanner-brand text-scanner-on-brand" : "text-slate-300 hover:bg-white/5"
          }`}
          onClick={() => setMode("url")}
        >
          <IconGlobe className="h-4 w-4" aria-hidden="true" />
          Website URL
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "repo"}
          className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
            mode === "repo" ? "bg-scanner-brand text-scanner-on-brand" : "text-slate-300 hover:bg-white/5"
          }`}
          onClick={() => setMode("repo")}
        >
          <IconRepo className="h-4 w-4" aria-hidden="true" />
          GitHub repo
        </button>
      </div>

      {mode === "url" ? (
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-300">Enter a website URL</span>
          <input
            type="url"
            name="url"
            required
            placeholder="https://your-app.example"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            className="scanner-input"
            autoComplete="url"
          />
          <span className="mt-2 block text-xs text-slate-500">
            Safe by default · Non-destructive · Ownership required for deeper testing
          </span>
        </label>
      ) : (
        <div className="space-y-4 rounded-xl border border-white/10 bg-scanner-bg/40 p-4">
          <p className="text-sm text-slate-400">
            Paste a <span className="font-medium text-slate-200">public</span> GitHub repository URL
            or <code className="scanner-mono text-scanner-brand-label">owner/name</code>. Private repos need a
            real GitHub App (mock mode can link a local fixture).
          </p>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-300">Public repository</span>
            <input
              type="text"
              value={publicRepo}
              onChange={(e) => setPublicRepo(e.target.value)}
              placeholder="https://github.com/owner/repo or owner/repo"
              className="scanner-input"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={pending || !publicRepo.trim()}
              onClick={() => void addPublicRepo()}
              className="scanner-btn-primary"
            >
              Authorize public repo
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => void connectMockFixture()}
              className="scanner-btn-secondary"
            >
              Use local mock fixture
            </button>
          </div>
          {githubMsg ? <p className="text-xs text-slate-400">{githubMsg}</p> : null}
          {repos.length > 0 ? (
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-300">Repository to scan</span>
              <select
                className="scanner-input"
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

      {error ? (
        <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200" role="alert">
          {error}
        </p>
      ) : null}

      <button type="submit" disabled={pending} className="scanner-btn-primary min-w-[12rem]">
        {pending ? (
          <>
            <IconSpinner className="h-4 w-4 animate-spin" aria-hidden="true" />
            Starting…
          </>
        ) : mode === "repo" ? (
          "Start repository scan"
        ) : (
          "Start security scan"
        )}
      </button>
    </form>
  );
}
