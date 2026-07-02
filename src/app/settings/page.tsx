"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Lock, User, AlertCircle, CheckCircle2, Eye, EyeOff } from "lucide-react";

import AppShell from "@/components/AppShell";
import Reveal from "@/components/ui/Reveal";
import Panel from "@/components/ui/Panel";

const field =
  "w-full border border-clay-500/25 px-4 py-2.5 text-cream-100 placeholder:text-cream-600 focus:border-clay-400 focus:ring-1 focus:ring-clay-500/40 outline-none transition rounded-md";
const labelCls =
  "block font-mono text-[10px] uppercase tracking-[0.18em] text-cream-500 mb-2";
const btn =
  "inline-flex items-center justify-center gap-2 bg-clay-600 px-6 py-2.5 font-mono text-[11px] uppercase tracking-[0.18em] text-cream-100 hover:bg-clay-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors active:scale-[0.99] w-full sm:w-auto";

export default function SettingsPage() {
  const { data: session, update } = useSession();

  const [name, setName] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [profileSuccess, setProfileSuccess] = useState(false);

  useEffect(() => {
    if (session?.user?.name) {
      setName(session.user.name);
    }
  }, [session]);

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError("");
    setProfileSuccess(false);
    setProfileLoading(true);

    try {
      const res = await fetch("/api/user/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });

      const data = await res.json();

      if (!res.ok) {
        setProfileError(data.error || "Failed to update profile.");
      } else {
        setProfileSuccess(true);
        await update({
          ...session,
          user: { ...session?.user, name: name },
        });
      }
    } catch (err) {
      setProfileError("An unexpected error occurred. Please try again.");
    } finally {
      setProfileLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      setError("New password must be at least 8 characters and include uppercase, lowercase, numbers, and special characters.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/user/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to update password.");
      } else {
        setSuccess("Password successfully updated.");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell variant="user">
      <div className="mx-auto max-w-3xl px-5 sm:px-8 py-8 sm:py-12">
        <Reveal>
          <span className="eyebrow">ACCOUNT ⁄ CONFIG</span>
          <h1 className="mt-3 font-display text-4xl sm:text-5xl text-cream-100">Settings</h1>
          <p className="mt-2 text-cream-400">Manage your profile and security credentials.</p>
        </Reveal>

        <div className="mt-10 space-y-6">
          {/* Profile */}
          <Reveal>
            <Panel className="p-6 sm:p-7 rounded-md">
              <div className="flex items-center gap-3 mb-6">
                <User className="h-4 w-4 text-clay-300" aria-hidden="true" />
                <span className="eyebrow">PROFILE</span>
                <span className="hairline flex-1" />
              </div>

              <form onSubmit={handleProfileUpdate} className="space-y-5">
                {profileError && (
                  <div className="border-l-2 border-red-500 bg-red-500/10 px-4 py-3 flex items-start gap-3" role="alert">
                    <AlertCircle className="h-4 w-4 text-red-300 mt-0.5 shrink-0" aria-hidden="true" />
                    <p className="text-sm text-red-300">{profileError}</p>
                  </div>
                )}
                {profileSuccess && (
                  <div className="border-l-2 border-green-500 bg-green-500/10 px-4 py-3 flex items-start gap-3" role="status">
                    <CheckCircle2 className="h-4 w-4 text-green-300 mt-0.5 shrink-0" aria-hidden="true" />
                    <p className="text-sm text-green-300">Profile updated successfully.</p>
                  </div>
                )}

                <div>
                  <label htmlFor="name" className={labelCls}>Company / Personal name</label>
                  <input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} required className={field} placeholder="Your Name / Company" />
                </div>

                <div>
                  <label className={labelCls}>Email address</label>
                  <div className="border border-clay-500/15 bg-espresso-800/40 px-4 py-2.5 rounded-md font-mono text-sm text-cream-500">
                    {session?.user?.email || "Loading…"}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-1">
                  <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-cream-600 sm:max-w-[55%]">
                    Email is used for login and notifications — it cannot be changed.
                  </p>
                  <button type="submit" disabled={profileLoading} className={btn}>
                    {profileLoading ? (
                      <><span className="h-3.5 w-3.5 rounded-full border-2 border-cream-200/40 border-t-cream-100 animate-spin" /> Saving…</>
                    ) : "Save name"}
                  </button>
                </div>
              </form>
            </Panel>
          </Reveal>

          {/* Password */}
          <Reveal delay={0.1}>
            <Panel className="p-6 sm:p-7 rounded-md">
              <div className="flex items-center gap-3 mb-6">
                <Lock className="h-4 w-4 text-clay-300" aria-hidden="true" />
                <span className="eyebrow">SECURITY</span>
                <span className="hairline flex-1" />
              </div>

              <form onSubmit={handlePasswordChange} className="space-y-5">
                {error && (
                  <div className="border-l-2 border-red-500 bg-red-500/10 px-4 py-3 flex items-start gap-3" role="alert">
                    <AlertCircle className="h-4 w-4 text-red-300 mt-0.5 shrink-0" aria-hidden="true" />
                    <p className="text-sm text-red-300">{error}</p>
                  </div>
                )}
                {success && (
                  <div className="border-l-2 border-green-500 bg-green-500/10 px-4 py-3 flex items-start gap-3" role="status">
                    <CheckCircle2 className="h-4 w-4 text-green-300 mt-0.5 shrink-0" aria-hidden="true" />
                    <p className="text-sm text-green-300">{success}</p>
                  </div>
                )}

                {[
                  { id: "currentPassword", lbl: "Current password", val: currentPassword, set: setCurrentPassword, show: showCurrentPassword, setShow: setShowCurrentPassword, ac: "current-password" as const },
                  { id: "newPassword", lbl: "New password", val: newPassword, set: setNewPassword, show: showNewPassword, setShow: setShowNewPassword, ac: "new-password" as const },
                  { id: "confirmPassword", lbl: "Confirm new password", val: confirmPassword, set: setConfirmPassword, show: showConfirmPassword, setShow: setShowConfirmPassword, ac: "new-password" as const },
                ].map((f) => (
                  <div key={f.id}>
                    <label htmlFor={f.id} className={labelCls}>{f.lbl}</label>
                    <div className="relative">
                      <input
                        id={f.id}
                        type={f.show ? "text" : "password"}
                        value={f.val}
                        onChange={(e) => f.set(e.target.value)}
                        required
                        minLength={f.id === "currentPassword" ? undefined : 8}
                        className={`${field} pr-12`}
                        autoComplete={f.ac}
                      />
                      <button type="button" onClick={() => f.setShow(!f.show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-cream-500 hover:text-clay-300 p-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-500 rounded-md" aria-label={f.show ? "Hide password" : "Show password"}>
                        {f.show ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                ))}

                <div className="flex justify-end pt-1">
                  <button type="submit" disabled={loading} className={btn}>
                    {loading ? (
                      <><span className="h-3.5 w-3.5 rounded-full border-2 border-cream-200/40 border-t-cream-100 animate-spin" /> Updating…</>
                    ) : "Update password"}
                  </button>
                </div>
              </form>
            </Panel>
          </Reveal>
        </div>
      </div>
    </AppShell>
  );
}
