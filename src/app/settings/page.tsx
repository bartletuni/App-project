"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Lock, User, AlertCircle, CheckCircle2, Eye, EyeOff } from "lucide-react";
import Reveal from "@/components/ui/Reveal";

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
        // Update the session to reflect the new name
        await update({
          ...session,
          user: {
            ...session?.user,
            name: name,
          },
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
    <div className="min-h-screen bg-transparent py-10">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-cream-200 tracking-tight">
            Account{" "}
            <span className="animate-gradient-text animate-gradient-x bg-gradient-to-r from-clay-400 via-ember-400 to-clay-300">
              Settings
            </span>
          </h1>
          <p className="text-cream-500 mt-2 text-base sm:text-lg">Manage your profile and security preferences.</p>
        </Reveal>

        <div className="space-y-6">
          {/* Profile Section */}
          <Reveal direction="up" className="bg-espresso-800/72 backdrop-blur-md shadow-sm border border-clay-500/18 rounded-2xl overflow-hidden">
            <div className="px-6 py-5 border-b border-espresso-600/50 bg-espresso-800/45 flex items-center gap-2">
              <User className="w-5 h-5 text-clay-300" aria-hidden="true" />
              <h2 className="text-xl font-bold text-cream-200">Profile Information</h2>
            </div>
            <form onSubmit={handleProfileUpdate} className="p-6 space-y-6">
              {profileError && (
                <div className="bg-red-500/15 text-red-300 p-4 rounded-xl flex items-start gap-3 border border-red-500/25" role="alert">
                  <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" aria-hidden="true" />
                  <p className="font-medium text-sm">{profileError}</p>
                </div>
              )}
              
              {profileSuccess && (
                <div className="bg-green-500/15 text-green-300 p-4 rounded-xl flex items-start gap-3 border border-green-500/25" role="status">
                  <CheckCircle2 className="w-5 h-5 mt-0.5 flex-shrink-0" aria-hidden="true" />
                  <p className="font-medium text-sm">Profile updated successfully.</p>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-cream-300 mb-1">Company / Personal Name</label>
                  <input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 bg-espresso-700 border border-espresso-600 rounded-xl focus:ring-2 focus:ring-clay-500 focus:border-clay-500 transition-all outline-none text-cream-200"
                    placeholder="Your Name / Company Name"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
                  <div className="text-sm font-medium text-cream-500">Email Address</div>
                  <div className="sm:col-span-2 text-cream-500 font-medium bg-espresso-700/50 px-4 py-2 rounded-lg border border-espresso-700 italic">
                    {session?.user?.email || "Loading..."}
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 pt-2">
                <p className="text-xs text-cream-500 sm:max-w-[60%]">
                  Your email is used for login and notifications and cannot be changed.
                </p>
                <button
                  type="submit"
                  disabled={profileLoading}
                  className="bg-clay-600 hover:bg-clay-700 text-white font-semibold py-2.5 px-6 rounded-xl shadow-sm transition-all focus:ring-2 focus:ring-offset-2 focus:ring-clay-500 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm active:scale-[0.98] w-full sm:w-auto"
                >
                  {profileLoading ? (
                    <>
                      <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Saving...
                    </>
                  ) : (
                    "Save Name"
                  )}
                </button>
              </div>
            </form>
          </Reveal>

          {/* Password Change Section */}
          <Reveal direction="up" delay={0.1} className="bg-espresso-800/72 backdrop-blur-md shadow-sm border border-clay-500/18 rounded-2xl overflow-hidden">
            <div className="px-6 py-5 border-b border-espresso-600/50 bg-espresso-800/45 flex items-center gap-2">
              <Lock className="w-5 h-5 text-clay-300" aria-hidden="true" />
              <h2 className="text-xl font-bold text-cream-200">Change Password</h2>
            </div>
            
            <form onSubmit={handlePasswordChange} className="p-6 space-y-6">
              {error && (
                <div className="bg-red-500/15 text-red-300 p-4 rounded-xl flex items-start gap-3 border border-red-500/25" role="alert">
                  <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" aria-hidden="true" />
                  <p className="font-medium text-sm">{error}</p>
                </div>
              )}
              
              {success && (
                <div className="bg-green-500/15 text-green-300 p-4 rounded-xl flex items-start gap-3 border border-green-500/25" role="status">
                  <CheckCircle2 className="w-5 h-5 mt-0.5 flex-shrink-0" aria-hidden="true" />
                  <p className="font-medium text-sm">{success}</p>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label htmlFor="currentPassword" className="block text-sm font-medium text-cream-300 mb-1">Current Password</label>
                  <div className="relative">
                    <input
                      id="currentPassword"
                      type={showCurrentPassword ? "text" : "password"}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      required
                      className="w-full px-4 py-2.5 pr-12 bg-espresso-700 border border-espresso-600 rounded-xl focus:ring-2 focus:ring-clay-500 focus:border-clay-500 transition-all outline-none text-cream-200"
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-cream-500 hover:text-clay-300 focus-visible:ring-2 focus-visible:ring-clay-500 rounded outline-none p-1 transition-colors"
                      aria-label={showCurrentPassword ? "Hide password" : "Show password"}
                    >
                      {showCurrentPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>
                
                <div className="pt-2 border-t border-espresso-700"></div>

                <div>
                  <label htmlFor="newPassword" className="block text-sm font-medium text-cream-300 mb-1">New Password</label>
                  <div className="relative">
                    <input
                      id="newPassword"
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      minLength={8}
                      className="w-full px-4 py-2.5 pr-12 bg-espresso-700 border border-espresso-600 rounded-xl focus:ring-2 focus:ring-clay-500 focus:border-clay-500 transition-all outline-none text-cream-200"
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-cream-500 hover:text-clay-300 focus-visible:ring-2 focus-visible:ring-clay-500 rounded outline-none p-1 transition-colors"
                      aria-label={showNewPassword ? "Hide password" : "Show password"}
                    >
                      {showNewPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-cream-300 mb-1">Confirm New Password</label>
                  <div className="relative">
                    <input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      minLength={8}
                      className="w-full px-4 py-2.5 pr-12 bg-espresso-700 border border-espresso-600 rounded-xl focus:ring-2 focus:ring-clay-500 focus:border-clay-500 transition-all outline-none text-cream-200"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-cream-500 hover:text-clay-300 focus-visible:ring-2 focus-visible:ring-clay-500 rounded outline-none p-1 transition-colors"
                      aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                    >
                      {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-clay-600 hover:bg-clay-700 text-white font-semibold py-2.5 px-6 rounded-xl shadow-sm transition-all focus:ring-2 focus:ring-offset-2 focus:ring-clay-500 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-[0.98] w-full sm:w-auto"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Updating...
                    </>
                  ) : (
                    "Update Password"
                  )}
                </button>
              </div>
            </form>
          </Reveal>
        </div>
      </div>
    </div>
  );
}
