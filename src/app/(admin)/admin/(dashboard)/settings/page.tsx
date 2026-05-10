"use client";

import { useState } from "react";
import { Save, Eye, EyeOff, CheckCircle } from "lucide-react";

export default function SettingsPage() {
  const [saved, setSaved] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [form, setForm] = useState({
    businessName: "karmakoders",
    email: "karmakoders@gmail.com",
    phone: "7627056875",
    address: "JLN marg malvinagar",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [passwordError, setPasswordError] = useState("");

  const handleChange = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setPasswordError("");
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    if (form.newPassword && form.newPassword !== form.confirmPassword) {
      setPasswordError("New passwords do not match");
      return;
    }

    // In a real app you'd call a server action here
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h2 className="text-2xl font-bold text-white">Settings</h2>
        <p className="text-slate-400 mt-1">Manage your business info and account credentials</p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Business Info */}
        <div className="glass-card rounded-xl p-6 border border-slate-800 space-y-5">
          <h3 className="text-lg font-semibold text-white border-b border-slate-800 pb-3">
            Business Information
          </h3>

          {[
            { key: "businessName", label: "Business Name" },
            { key: "email", label: "Email Address", type: "email" },
            { key: "phone", label: "Phone Number", type: "tel" },
            { key: "address", label: "Office Address" },
          ].map((field) => (
            <div key={field.key}>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1.5">
                {field.label}
              </label>
              <input
                type={field.type || "text"}
                value={form[field.key as keyof typeof form]}
                onChange={(e) => handleChange(field.key, e.target.value)}
                className="w-full h-10 bg-slate-950 border border-slate-800 rounded-lg px-3 text-sm text-white focus:border-indigo-500 outline-none transition-colors"
              />
            </div>
          ))}
        </div>

        {/* Change Password */}
        <div className="glass-card rounded-xl p-6 border border-slate-800 space-y-5">
          <h3 className="text-lg font-semibold text-white border-b border-slate-800 pb-3">
            Change Password
          </h3>

          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1.5">
              Current Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={form.currentPassword}
                onChange={(e) => handleChange("currentPassword", e.target.value)}
                className="w-full h-10 bg-slate-950 border border-slate-800 rounded-lg px-3 pr-10 text-sm text-white focus:border-indigo-500 outline-none transition-colors"
                placeholder="Leave blank to keep current"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1.5">
              New Password
            </label>
            <input
              type={showPassword ? "text" : "password"}
              value={form.newPassword}
              onChange={(e) => handleChange("newPassword", e.target.value)}
              className="w-full h-10 bg-slate-950 border border-slate-800 rounded-lg px-3 text-sm text-white focus:border-indigo-500 outline-none transition-colors"
              placeholder="Min. 8 characters"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1.5">
              Confirm New Password
            </label>
            <input
              type={showPassword ? "text" : "password"}
              value={form.confirmPassword}
              onChange={(e) => handleChange("confirmPassword", e.target.value)}
              className={`w-full h-10 bg-slate-950 border rounded-lg px-3 text-sm text-white focus:border-indigo-500 outline-none transition-colors ${
                passwordError ? "border-rose-500" : "border-slate-800"
              }`}
            />
            {passwordError && (
              <p className="text-rose-400 text-xs mt-1">{passwordError}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            type="submit"
            className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-full transition-all"
          >
            <Save className="w-4 h-4" />
            Save Changes
          </button>

          {saved && (
            <div className="flex items-center gap-2 text-emerald-400 text-sm font-medium">
              <CheckCircle className="w-4 h-4" />
              Saved successfully!
            </div>
          )}
        </div>
      </form>
    </div>
  );
}
