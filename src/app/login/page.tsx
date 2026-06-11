"use client";

import { useState, useEffect } from "react";
import { signIn, useSession } from "next-auth/react";
import { Eye, EyeOff } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Lock, Mail, User as UserIcon, MapPin, Phone, ShieldCheck, ArrowLeft } from "lucide-react";
import { GlowCard } from "@/components/InteractiveGlow";

export default function Home() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [shippingStreet, setShippingStreet] = useState("");
  const [shippingApt, setShippingApt] = useState("");
  const [shippingCity, setShippingCity] = useState("");
  const [shippingState, setShippingState] = useState("");
  const [shippingZip, setShippingZip] = useState("");
  
  const [billingStreet, setBillingStreet] = useState("");
  const [billingApt, setBillingApt] = useState("");
  const [billingCity, setBillingCity] = useState("");
  const [billingState, setBillingState] = useState("");
  const [billingZip, setBillingZip] = useState("");
  
  const [sameAsShipping, setSameAsShipping] = useState(true);
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (status === "authenticated") {
      const isAdmin = (session?.user as any)?.isAdmin;
      if (isAdmin) {
        router.push("/admin");
      } else {
        router.push("/dashboard");
      }
    }
  }, [status, session, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (isLogin) {
        const result = await signIn("credentials", {
          redirect: false,
          email,
          password,
        });

        if (result?.error) {
          setError("Invalid email or password.");
        } else {
          router.push("/dashboard");
        }
      } else {
        // Handle registration
        const finalShippingAddress = `${shippingStreet}${shippingApt ? `, ${shippingApt}` : ""}, ${shippingCity}, ${shippingState} ${shippingZip}`;
        const finalBillingAddress = sameAsShipping 
          ? finalShippingAddress 
          : `${billingStreet}${billingApt ? `, ${billingApt}` : ""}, ${billingCity}, ${billingState} ${billingZip}`;

        const registerRes = await fetch("/api/auth/register", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ 
            name, 
            email, 
            password, 
            shippingAddress: finalShippingAddress, 
            billingAddress: finalBillingAddress, 
            phone 
          }),
        });

        if (!registerRes.ok) {
          const data = await registerRes.json();
          setError(data.error || "Failed to create account.");
          setLoading(false);
          return;
        }

        // Auto sign-in after registration
        const result = await signIn("credentials", {
          redirect: false,
          email,
          password,
        });

        if (result?.error) {
          setError("Account created, but failed to automatically sign in.");
        } else {
          router.push("/dashboard");
        }
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center bg-slate-950 text-slate-100">
        <svg className="animate-spin h-10 w-10 text-indigo-400 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p className="text-slate-400 font-mono text-sm tracking-wider">SECURE AUTHENTICATION CHECK...</p>
        <span className="sr-only">Loading, please wait</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-stretch bg-slate-950 text-slate-100 relative">
      {/* Back button to landing */}
      <Link 
        href="/" 
        className="absolute top-6 left-6 z-50 flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors bg-slate-900/50 border border-slate-800 px-3.5 py-2 rounded-xl backdrop-blur-sm"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Home
      </Link>

      {/* Left Column - Branding (Hidden on mobile) */}
      <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white p-16 flex-col justify-center relative overflow-hidden border-r border-slate-900" aria-hidden="true">
        {/* Ambient grid overlay & blur blobs */}
        <div className="absolute inset-0 grid-background opacity-20 pointer-events-none" />
        <div className="absolute top-10 left-10 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />

        <div className="relative z-10 max-w-lg mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <Image src="/logo.png" alt="TakomoCo Logo" width={40} height={40} className="rounded-xl shadow-lg border border-white/10" />
            <span className="font-bold text-2xl tracking-tight bg-gradient-to-r from-slate-100 to-slate-400 bg-clip-text text-transparent">TakomoCo</span>
          </div>

          <h1 className="text-4xl font-extrabold tracking-tight mb-6 leading-tight">
            Client Portal & <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">Request Hub</span>
          </h1>
          <p className="text-slate-400 text-base leading-relaxed mb-10">
            Streamline your additive manufacturing workflows. Upload your custom part specifications, track progress in real-time, and get your parts delivered faster than ever.
          </p>

          <div className="grid grid-cols-2 gap-6">
            <GlowCard className="p-5" glowColor="rgba(6, 182, 212, 0.15)">
              <div className="text-2xl mb-2">⚡️</div>
              <h3 className="font-semibold text-sm mb-1 text-slate-100">Lightning Fast</h3>
              <p className="text-xs text-slate-400">Rapid turnaround times for all prototyping.</p>
            </GlowCard>
            <GlowCard className="p-5" glowColor="rgba(99, 102, 241, 0.15)">
              <div className="text-2xl mb-2">🎯</div>
              <h3 className="font-semibold text-sm mb-1 text-slate-100">High Precision</h3>
              <p className="text-xs text-slate-400">State of the art 3D printing accuracy.</p>
            </GlowCard>
          </div>
        </div>
      </div>

      {/* Right Column - Auth Form */}
      <div className="flex-1 flex flex-col justify-center items-center p-8 bg-slate-950 relative overflow-y-auto max-h-screen pt-24 pb-12">
        <div className="absolute inset-0 grid-background-fine opacity-20 pointer-events-none lg:hidden" />
        <div className="w-full max-w-md relative z-10">
          
          <div className="text-center mb-8">
            <h2 className="text-3xl font-extrabold text-white mb-2 font-sans tracking-tight">
              {isLogin ? "Welcome Back" : "Create Account"}
            </h2>
            <p className="text-sm text-slate-400">
              {isLogin
                ? "Enter credentials to access your console."
                : "Register to submit rapid prototyping requests."}
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-xl text-sm" role="alert">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2" htmlFor="name">
                  Company / Personal Name
                </label>
                <div className="relative">
                  <UserIcon className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
                  <input
                    id="name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="block w-full rounded-xl bg-slate-900/60 border border-slate-800 text-white placeholder-slate-500 pl-11 pr-4 py-3 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                    placeholder="ACME Corp / Jane Doe"
                    autoComplete="name"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2" htmlFor="email">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full rounded-xl bg-slate-900/60 border border-slate-800 text-white placeholder-slate-500 pl-11 pr-4 py-3 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                  placeholder="you@company.com"
                  autoComplete="email"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2" htmlFor="password">
                Password
              </label>
              <div className="relative">
<<<<<<< Updated upstream
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 pr-12 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 transition-colors shadow-sm"
                  placeholder="••••••••"
                  autoComplete={isLogin ? "current-password" : "new-password"}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-indigo-600 focus-visible:ring-2 focus-visible:ring-indigo-500 rounded outline-none p-1 transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
=======
                <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full rounded-xl bg-slate-900/60 border border-slate-800 text-white placeholder-slate-500 pl-11 pr-4 py-3 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                  placeholder="••••••••"
                  autoComplete={isLogin ? "current-password" : "new-password"}
                />
>>>>>>> Stashed changes
              </div>
            </div>

            {!isLogin && (
              <>
                <div className="pt-4 border-t border-slate-900">
                  <h3 className="text-sm font-bold text-indigo-400 mb-4 uppercase tracking-wider font-mono">Shipping Details</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5" htmlFor="shippingStreet">
                        Street Address
                      </label>
                      <input
                        id="shippingStreet"
                        type="text"
                        required={!isLogin}
                        value={shippingStreet}
                        onChange={(e) => setShippingStreet(e.target.value)}
                        className="block w-full rounded-xl bg-slate-900/60 border border-slate-800 text-white placeholder-slate-500 px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                        placeholder="123 Main St"
                        autoComplete="shipping street-address"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5" htmlFor="shippingApt">
                        Apt / Suite / Bldg (optional)
                      </label>
                      <input
                        id="shippingApt"
                        type="text"
                        value={shippingApt}
                        onChange={(e) => setShippingApt(e.target.value)}
                        className="block w-full rounded-xl bg-slate-900/60 border border-slate-800 text-white placeholder-slate-500 px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                        placeholder="Apt 4B"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5" htmlFor="shippingCity">
                          City
                        </label>
                        <input
                          id="shippingCity"
                          type="text"
                          required={!isLogin}
                          value={shippingCity}
                          onChange={(e) => setShippingCity(e.target.value)}
                          className="block w-full rounded-xl bg-slate-900/60 border border-slate-800 text-white placeholder-slate-500 px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                          placeholder="City"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5" htmlFor="shippingState">
                          State / Province
                        </label>
                        <input
                          id="shippingState"
                          type="text"
                          required={!isLogin}
                          value={shippingState}
                          onChange={(e) => setShippingState(e.target.value)}
                          className="block w-full rounded-xl bg-slate-900/60 border border-slate-800 text-white placeholder-slate-500 px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                          placeholder="ST"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5" htmlFor="shippingZip">
                        ZIP / Postal Code
                      </label>
                      <input
                        id="shippingZip"
                        type="text"
                        required={!isLogin}
                        value={shippingZip}
                        onChange={(e) => setShippingZip(e.target.value)}
                        className="block w-full rounded-xl bg-slate-900/60 border border-slate-800 text-white placeholder-slate-500 px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                        placeholder="12345"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-900">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-indigo-400 uppercase tracking-wider font-mono">Billing Details</h3>
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={sameAsShipping}
                        onChange={(e) => setSameAsShipping(e.target.checked)}
                        className="w-4 h-4 text-indigo-600 border-slate-800 bg-slate-900 focus:ring-indigo-500 focus:ring-offset-slate-950 rounded"
                      />
                      <span className="text-xs font-medium text-slate-400">Same as shipping</span>
                    </label>
                  </div>
                  
                  {!sameAsShipping && (
                    <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-350">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5" htmlFor="billingStreet">
                          Street Address
                        </label>
                        <input
                          id="billingStreet"
                          type="text"
                          required={!isLogin && !sameAsShipping}
                          value={billingStreet}
                          onChange={(e) => setBillingStreet(e.target.value)}
                          className="block w-full rounded-xl bg-slate-900/60 border border-slate-800 text-white placeholder-slate-500 px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                          placeholder="123 Main St"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5" htmlFor="billingApt">
                          Apartment, suite, etc. (optional)
                        </label>
                        <input
                          id="billingApt"
                          type="text"
                          value={billingApt}
                          onChange={(e) => setBillingApt(e.target.value)}
                          className="block w-full rounded-xl bg-slate-900/60 border border-slate-800 text-white placeholder-slate-500 px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                          placeholder="Apt 4B"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5" htmlFor="billingCity">
                            City
                          </label>
                          <input
                            id="billingCity"
                            type="text"
                            required={!isLogin && !sameAsShipping}
                            value={billingCity}
                            onChange={(e) => setBillingCity(e.target.value)}
                            className="block w-full rounded-xl bg-slate-900/60 border border-slate-800 text-white placeholder-slate-500 px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                            placeholder="City"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5" htmlFor="billingState">
                            State / Province
                          </label>
                          <input
                            id="billingState"
                            type="text"
                            required={!isLogin && !sameAsShipping}
                            value={billingState}
                            onChange={(e) => setBillingState(e.target.value)}
                            className="block w-full rounded-xl bg-slate-900/60 border border-slate-800 text-white placeholder-slate-500 px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                            placeholder="ST"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5" htmlFor="billingZip">
                          ZIP / Postal Code
                        </label>
                        <input
                          id="billingZip"
                          type="text"
                          required={!isLogin && !sameAsShipping}
                          value={billingZip}
                          onChange={(e) => setBillingZip(e.target.value)}
                          className="block w-full rounded-xl bg-slate-900/60 border border-slate-800 text-white placeholder-slate-500 px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                          placeholder="12345"
                        />
                      </div>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2" htmlFor="phone">
                    Phone Number
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
                    <input
                      id="phone"
                      type="tel"
                      required={!isLogin}
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="block w-full rounded-xl bg-slate-900/60 border border-slate-800 text-white placeholder-slate-500 pl-11 pr-4 py-3 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                      placeholder="(555) 555-5555"
                      autoComplete="tel"
                    />
                  </div>
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-md text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed mt-2"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </span>
              ) : isLogin ? (
                "Sign In"
              ) : (
                "Create Account"
              )}
            </button>
          </form>

          <div className="mt-8 text-center">
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setError("");
              }}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-bold transition-colors uppercase tracking-wider"
            >
              {isLogin
                ? "Don't have an account? Register now"
                : "Already have an account? Sign in here"}
            </button>
          </div>

          <div className="mt-8 text-center border-t border-slate-900 pt-6">
            <Link
              href="/materials"
              className="text-xs text-slate-500 hover:text-indigo-400 font-medium transition-colors flex items-center justify-center gap-2"
            >
              <ShieldCheck className="w-4 h-4" />
              View Materials Library
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
