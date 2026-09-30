import { ScanForm } from "@/components/ScanForm";

export default function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center px-6 py-16">
      <p className="text-sm font-medium tracking-wide text-stone-500">App security scanner</p>
      <h1 className="mt-3 text-4xl font-semibold tracking-tight text-stone-900">
        A plain-English security check for apps built with AI.
      </h1>
      <p className="mt-4 text-lg leading-relaxed text-stone-600">
        Paste your app URL for a free passive check: security headers, exposed files, TLS, and
        open CORS. No signup required.
      </p>
      <ScanForm />
      <p className="mt-8 text-sm leading-relaxed text-stone-500">
        Uploads and cloned repos are deleted within 24 hours. A scan is not a guarantee of security.
      </p>
    </main>
  );
}
