"use client";

import { useState, useEffect, Suspense } from "react";
import { signIn, useSession } from "next-auth/react";
import { Eye, EyeOff, ArrowLeft, ArrowRight } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { safeNextPath } from "@/lib/quote";

const field =
  "w-full border border-clay-500/25 px-4 py-3 text-cream-100 placeholder:text-cream-600 focus:border-clay-400 focus:ring-1 focus:ring-clay-500/40 outline-none transition rounded-md";
const label =
  "block font-mono text-[10px] uppercase tracking-[0.18em] text-cream-500 mb-2";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  // Where the visitor was headed before sign-in got in the way — a quote
  // button, say. Admins always land on the console instead.
  const nextPath = safeNextPath(searchParams.get("next"));
  const afterSignIn = nextPath || "/dashboard";
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
        router.push(afterSignIn);
      }
    }
  }, [status, session, router, afterSignIn]);

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
          router.push(afterSignIn);
        }
      } else {
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
            phone,
          }),
        });

        if (!registerRes.ok) {
          const data = await registerRes.json();
          setError(data.error || "Failed to create account.");
          setLoading(false);
          return;
        }

        const result = await signIn("credentials", {
          redirect: false,
          email,
          password,
        });

        if (result?.error) {
          setError("Account created, but failed to automatically sign in.");
        } else {
          router.push(afterSignIn);
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
      <div className="min-h-screen flex flex-col justify-center items-center bg-transparent">
        <span className="h-8 w-8 rounded-full border-2 border-clay-500/30 border-t-clay-400 animate-spin mb-4" />
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-cream-500">Checking credentials…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent text-cream-200">
      <div className="mx-auto grid min-h-screen max-w-6xl lg:grid-cols-2">
        {/* Left editorial plate */}
        <div className="hidden lg:flex flex-col justify-between border-r border-clay-500/12 p-12">
          <Link href="/" className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] text-cream-500 hover:text-clay-300 transition-colors">
            <ArrowLeft className="h-4 w-4" /> Back to index
          </Link>

          <div>
            <Image src="/logo.png" alt="TakomoCo" width={44} height={44} className="rounded-lg ring-1 ring-clay-500/30 mb-8" />
            <h1 className="font-display text-5xl leading-[1.05] text-cream-100">
              The bench is <span className="italic text-clay-300">open.</span>
            </h1>
            <p className="mt-6 max-w-sm text-cream-400 leading-relaxed">
              Sign in to submit parts, track builds in real time, and manage
              your additive manufacturing requests end to end.
            </p>
            <div className="mt-10 grid grid-cols-2 gap-px bg-clay-500/15 max-w-sm">
              {[
                ["72h", "Typical turnaround"],
                ["256³", "Build volume / mm"],
                ["320°C", "Extrusion capacity"],
                ["1:1", "Reproduction"],
              ].map(([v, k]) => (
                <div key={k} className="bg-espresso-900 p-4">
                  <div className="font-display text-2xl text-cream-100">{v}</div>
                  <div className="mt-1 font-mono text-[9px] uppercase tracking-[0.15em] text-cream-500">{k}</div>
                </div>
              ))}
            </div>
          </div>

          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-cream-600">
            TAKOMO<span className="text-clay-400">⁄</span>CO · ADDITIVE MFG.
          </p>
        </div>

        {/* Form */}
        <div className="flex flex-col justify-center px-5 sm:px-10 py-12">
          <div className="lg:hidden mb-8">
            <Link href="/" className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] text-cream-500 hover:text-clay-300">
              <ArrowLeft className="h-4 w-4" /> Index
            </Link>
          </div>

          <div className="w-full max-w-md mx-auto">
            <span className="eyebrow">{isLogin ? "AUTHENTICATE" : "NEW ACCOUNT"}</span>
            <h2 className="mt-3 font-display text-4xl text-cream-100">
              {isLogin ? "Welcome back." : "Open an account."}
            </h2>
            <p className="mt-2 text-sm text-cream-400">
              {isLogin
                ? "Enter your credentials to reach your desk."
                : "Register to start requesting custom parts."}
            </p>

            {error && (
              <div className="mt-6 border-l-2 border-red-500 bg-red-500/10 px-4 py-3 text-sm text-red-300" role="alert">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              {!isLogin && (
                <div>
                  <label className={label} htmlFor="name">Company / Personal name</label>
                  <input id="name" type="text" required value={name} onChange={(e) => setName(e.target.value)} className={field} placeholder="ACME Corp / Jane Doe" autoComplete="name" />
                </div>
              )}
              <div>
                <label className={label} htmlFor="email">Email address</label>
                <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={field} placeholder="you@company.com" autoComplete="email" />
              </div>
              <div>
                <label className={label} htmlFor="password">Password</label>
                <div className="relative">
                  <input id="password" type={showPassword ? "text" : "password"} required value={password} onChange={(e) => setPassword(e.target.value)} className={`${field} pr-12`} placeholder="••••••••" autoComplete={isLogin ? "current-password" : "new-password"} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-cream-500 hover:text-clay-300 p-1 rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-500" aria-label={showPassword ? "Hide password" : "Show password"}>
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {!isLogin && (
                <>
                  <div className="pt-4">
                    <div className="flex items-center gap-3 mb-4">
                      <span className="eyebrow">SHIPPING</span>
                      <span className="hairline flex-1" />
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label className={label} htmlFor="shippingStreet">Street address</label>
                        <input id="shippingStreet" type="text" required={!isLogin} value={shippingStreet} onChange={(e) => setShippingStreet(e.target.value)} className={field} placeholder="123 Main St" autoComplete="shipping street-address" />
                      </div>
                      <div>
                        <label className={label} htmlFor="shippingApt">Apartment, suite, etc. (optional)</label>
                        <input id="shippingApt" type="text" value={shippingApt} onChange={(e) => setShippingApt(e.target.value)} className={field} placeholder="Apt 4B" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className={label} htmlFor="shippingCity">City</label>
                          <input id="shippingCity" type="text" required={!isLogin} value={shippingCity} onChange={(e) => setShippingCity(e.target.value)} className={field} placeholder="City" />
                        </div>
                        <div>
                          <label className={label} htmlFor="shippingState">State / Province</label>
                          <input id="shippingState" type="text" required={!isLogin} value={shippingState} onChange={(e) => setShippingState(e.target.value)} className={field} placeholder="ST" />
                        </div>
                      </div>
                      <div>
                        <label className={label} htmlFor="shippingZip">ZIP / Postal code</label>
                        <input id="shippingZip" type="text" required={!isLogin} value={shippingZip} onChange={(e) => setShippingZip(e.target.value)} className={field} placeholder="12345" />
                      </div>
                    </div>
                  </div>

                  <div className="pt-2">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3 flex-1">
                        <span className="eyebrow">BILLING</span>
                        <span className="hairline flex-1" />
                      </div>
                      <label className="ml-4 flex items-center gap-2 cursor-pointer shrink-0">
                        <input type="checkbox" checked={sameAsShipping} onChange={(e) => setSameAsShipping(e.target.checked)} className="h-4 w-4 accent-clay-500" />
                        <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-cream-500">Same as shipping</span>
                      </label>
                    </div>

                    {!sameAsShipping && (
                      <div className="space-y-4">
                        <div>
                          <label className={label} htmlFor="billingStreet">Street address</label>
                          <input id="billingStreet" type="text" required={!isLogin && !sameAsShipping} value={billingStreet} onChange={(e) => setBillingStreet(e.target.value)} className={field} placeholder="123 Main St" />
                        </div>
                        <div>
                          <label className={label} htmlFor="billingApt">Apartment, suite, etc. (optional)</label>
                          <input id="billingApt" type="text" value={billingApt} onChange={(e) => setBillingApt(e.target.value)} className={field} placeholder="Apt 4B" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className={label} htmlFor="billingCity">City</label>
                            <input id="billingCity" type="text" required={!isLogin && !sameAsShipping} value={billingCity} onChange={(e) => setBillingCity(e.target.value)} className={field} placeholder="City" />
                          </div>
                          <div>
                            <label className={label} htmlFor="billingState">State / Province</label>
                            <input id="billingState" type="text" required={!isLogin && !sameAsShipping} value={billingState} onChange={(e) => setBillingState(e.target.value)} className={field} placeholder="ST" />
                          </div>
                        </div>
                        <div>
                          <label className={label} htmlFor="billingZip">ZIP / Postal code</label>
                          <input id="billingZip" type="text" required={!isLogin && !sameAsShipping} value={billingZip} onChange={(e) => setBillingZip(e.target.value)} className={field} placeholder="12345" />
                        </div>
                      </div>
                    )}
                  </div>
                  <div>
                    <label className={label} htmlFor="phone">Phone number</label>
                    <input id="phone" type="tel" required={!isLogin} value={phone} onChange={(e) => setPhone(e.target.value)} className={field} placeholder="(555) 555-5555" autoComplete="tel" />
                  </div>
                </>
              )}

              {/* Sign-in-wrap notice. Shown only on the register side, and
                  placed directly above the button that accepts it, so the
                  agreement is on screen at the moment it is made. */}
              {!isLogin && (
                <p className="border-l-2 border-clay-500/40 pl-4 text-xs leading-relaxed text-cream-500">
                  By creating an account you agree to the{" "}
                  <Link
                    href="/terms"
                    className="text-clay-300 underline decoration-clay-500/50 underline-offset-2 transition-colors hover:text-cream-100 hover:decoration-clay-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-500 rounded-sm"
                  >
                    Terms of Service
                  </Link>{" "}
                  and confirm you have read the{" "}
                  <Link
                    href="/privacy"
                    className="text-clay-300 underline decoration-clay-500/50 underline-offset-2 transition-colors hover:text-cream-100 hover:decoration-clay-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-500 rounded-sm"
                  >
                    Privacy Policy
                  </Link>
                  . We only email you about your own orders.
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="group w-full inline-flex items-center justify-center gap-2 bg-clay-600 px-4 py-3.5 font-mono text-xs uppercase tracking-[0.2em] text-cream-100 hover:bg-clay-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors active:scale-[0.99] shadow-glow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-500 rounded-sm"
              >
                {loading ? (
                  <>
                    <span className="h-4 w-4 rounded-full border-2 border-cream-200/40 border-t-cream-100 animate-spin" />
                    Processing…
                  </>
                ) : (
                  <>
                    {isLogin ? "Sign in" : "Create account"}
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 flex items-center justify-between">
              <button
                onClick={() => { setIsLogin(!isLogin); setError(""); }}
                className="font-mono text-[11px] uppercase tracking-[0.15em] text-clay-300 hover:text-clay-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-500 rounded-sm"
              >
                {isLogin ? "Need an account?" : "Have an account?"}
              </button>
              <Link href="/materials" className="font-mono text-[11px] uppercase tracking-[0.15em] text-cream-500 hover:text-cream-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-500 rounded-sm">
                Material index →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex flex-col justify-center items-center bg-transparent">
          <span className="h-8 w-8 rounded-full border-2 border-clay-500/30 border-t-clay-400 animate-spin mb-4" />
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-cream-500">Checking credentials…</p>
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
