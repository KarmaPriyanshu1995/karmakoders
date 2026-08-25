"use client";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const raw = error.message || "";
  const message =
    raw.includes("lacks permission") || raw.startsWith("An error occurred") || !raw
      ? "You don't have access to this page, or something went wrong."
      : raw;

  return (
    <div className="max-w-lg mx-auto py-16 text-center space-y-4">
      <h2 className="text-2xl font-bold text-white">Can't open this page</h2>
      <p className="text-slate-400 text-sm">{message}</p>
      <button
        type="button"
        onClick={reset}
        className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold"
      >
        Try again
      </button>
      <a href="/admin" className="block text-sm text-slate-400 hover:text-white">
        Back to dashboard
      </a>
    </div>
  );
}