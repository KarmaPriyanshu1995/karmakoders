export default function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center px-6 py-16">
      <p className="text-sm font-medium tracking-wide text-stone-500">App security scanner</p>
      <h1 className="mt-3 text-4xl font-semibold tracking-tight text-stone-900">
        A plain-English security check for apps built with AI.
      </h1>
      <p className="mt-4 text-lg leading-relaxed text-stone-600">
        Paste your app URL and get a grade, the issues that matter, and a fix you can hand to
        your coding tool. Scanning is the next step. This page confirms the app is running.
      </p>
    </main>
  );
}
