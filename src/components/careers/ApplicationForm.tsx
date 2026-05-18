"use client";

import { useState } from "react";
import { submitJobApplication } from "@/lib/actions";
import { UploadButton } from "@/lib/uploadthing";
import { Building, MapPin, Briefcase, FileText, Send, CheckCircle } from "lucide-react";

export function ApplicationForm({ jobId }: { jobId: string }) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [cvUrl, setCvUrl] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    portfolio: "",
    coverLetter: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cvUrl) return alert("Please upload your CV/Resume.");
    
    setLoading(true);
    try {
      await submitJobApplication({
        jobId,
        ...form,
        cvUrl,
      });
      setSuccess(true);
    } catch (error) {
      console.error(error);
      alert("Something went wrong. Please try again.");
    }
    setLoading(false);
  };

  if (success) {
    return (
      <div className="glass-card rounded-2xl p-10 border border-slate-800 text-center space-y-4">
        <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-8 h-8 text-emerald-400" />
        </div>
        <h3 className="text-2xl font-bold text-white">Application Received!</h3>
        <p className="text-slate-400">
          Thank you for applying. Our hiring team will review your application and get back to you soon.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="glass-card rounded-2xl p-6 md:p-8 border border-slate-800 space-y-6">
      <div>
        <h3 className="text-xl font-bold text-white mb-2">Apply for this position</h3>
        <p className="text-sm text-slate-400">Fill out the form below and upload your CV to apply.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-4">
        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-300">Full Name *</label>
          <input
            type="text"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-white focus:border-indigo-500 outline-none"
            placeholder="John Doe"
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-300">Email Address *</label>
          <input
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-white focus:border-indigo-500 outline-none"
            placeholder="john@example.com"
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-300">Phone Number</label>
          <input
            type="tel"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-white focus:border-indigo-500 outline-none"
            placeholder="+1 234 567 890"
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-300">Portfolio / LinkedIn URL</label>
          <input
            type="url"
            value={form.portfolio}
            onChange={(e) => setForm({ ...form, portfolio: e.target.value })}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-white focus:border-indigo-500 outline-none"
            placeholder="https://..."
          />
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium text-slate-300">Cover Letter / Note</label>
        <textarea
          rows={4}
          value={form.coverLetter}
          onChange={(e) => setForm({ ...form, coverLetter: e.target.value })}
          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-white focus:border-indigo-500 outline-none resize-y"
          placeholder="Tell us why you are a great fit..."
        />
      </div>

      <div className="space-y-2 pt-2 border-t border-slate-800">
        <label className="text-sm font-medium text-slate-300 block">CV / Resume (PDF) *</label>
        {cvUrl ? (
          <div className="flex items-center gap-3 p-4 bg-slate-900 border border-slate-800 rounded-lg">
            <FileText className="w-6 h-6 text-indigo-400" />
            <div className="flex-1 overflow-hidden">
              <p className="text-sm text-white truncate">CV Uploaded Successfully</p>
            </div>
            <button type="button" onClick={() => setCvUrl(null)} className="text-xs text-rose-400 hover:underline">Remove</button>
          </div>
        ) : (
          <div className="p-4 border-2 border-dashed border-slate-800 rounded-xl bg-slate-900/50 flex flex-col items-center justify-center">
            <UploadButton
              endpoint="cvUploader"
              appearance={{
                button: "bg-indigo-600 hover:bg-indigo-500 text-sm h-10 px-6 rounded-lg font-semibold transition-all w-full cursor-pointer shadow-[0_0_15px_rgba(79,70,229,0.3)]",
                allowedContent: "hidden"
              }}
              onClientUploadComplete={(res) => {
                if (res && res[0]) setCvUrl(res[0].url);
              }}
              onUploadError={(error: Error) => alert(`ERROR! ${error.message}`)}
            />
          </div>
        )}
      </div>

      <button
        type="submit"
        disabled={loading || !cvUrl}
        className="w-full flex items-center justify-center gap-2 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Submitting..." : (
          <>
            Submit Application <Send className="w-4 h-4" />
          </>
        )}
      </button>
    </form>
  );
}
