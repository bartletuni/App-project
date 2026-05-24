"use client";

import { useState, useEffect } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

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
      <div className="min-h-screen flex flex-col justify-center items-center bg-gray-50">
        <svg className="animate-spin h-10 w-10 text-indigo-600 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p className="text-gray-500 font-medium">Checking authentication...</p>
        <span className="sr-only">Loading, please wait</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-stretch bg-gray-50">
      {/* Left Column - Branding (Hidden on mobile) */}
      <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-indigo-600 via-blue-700 to-indigo-900 text-white p-12 flex-col justify-center relative overflow-hidden" aria-hidden="true">
        {/* Decorative background shapes */}
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
          <div className="absolute top-10 left-10 w-64 h-64 bg-white rounded-full mix-blend-overlay blur-3xl"></div>
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-blue-300 rounded-full mix-blend-overlay blur-3xl"></div>
        </div>

        <div className="relative z-10 max-w-lg mx-auto">
          <h1 className="text-5xl font-extrabold tracking-tight mb-6 leading-tight">
            TakomoCo <br />
            <span className="text-blue-300">Request Management</span>
          </h1>
          <p className="text-lg text-indigo-100 mb-8 leading-relaxed">
            Streamline your additive manufacturing workflows. Upload your custom part specifications, track progress in real-time, and get your parts delivered faster than ever.
          </p>

          <div className="grid grid-cols-2 gap-6 mt-12">
            <div className="bg-white/10 backdrop-blur-sm p-4 rounded-xl border border-white/20">
              <div className="text-3xl font-bold mb-1">⚡️</div>
              <h3 className="font-semibold text-lg mb-1">Lightning Fast</h3>
              <p className="text-sm text-indigo-200">Rapid turnaround times for all prototyping.</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm p-4 rounded-xl border border-white/20">
              <div className="text-3xl font-bold mb-1">🎯</div>
              <h3 className="font-semibold text-lg mb-1">High Precision</h3>
              <p className="text-sm text-indigo-200">State of the art 3D printing accuracy.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Column - Auth Form */}
      <div className="flex-1 flex flex-col justify-center items-center p-8 bg-white shadow-2xl z-10">
        <div className="w-full max-w-md">
          {/* Mobile Header (Hidden on Desktop) */}
          <div className="lg:hidden mb-10 text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">TakomoCo</h1>
            <p className="text-gray-500">Request Management Portal</p>
          </div>

          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              {isLogin ? "Welcome Back" : "Create an Account"}
            </h2>
            <p className="text-gray-500">
              {isLogin
                ? "Enter your details to access your dashboard."
                : "Sign up to start requesting custom parts."}
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-md text-sm" role="alert">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="name">
                  Company / Personal Name
                </label>
                <input
                  id="name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="block w-full rounded-xl border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-gray-50 text-gray-900 px-4 py-3"
                  placeholder="ACME Corp / Jane Doe"
                  autoComplete="name"
                />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="email">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 transition-colors shadow-sm"
                placeholder="you@company.com"
                autoComplete="email"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 transition-colors shadow-sm"
                placeholder="••••••••"
                autoComplete={isLogin ? "current-password" : "new-password"}
              />
            </div>

            {!isLogin && (
              <>
                <div className="pt-4 border-t border-gray-100">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Shipping Information</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="shippingStreet">
                        Street Address
                      </label>
                      <input
                        id="shippingStreet"
                        type="text"
                        required={!isLogin}
                        value={shippingStreet}
                        onChange={(e) => setShippingStreet(e.target.value)}
                        className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 transition-colors shadow-sm"
                        placeholder="123 Main St"
                        autoComplete="shipping street-address"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="shippingApt">
                        Apartment, suite, etc. (optional)
                      </label>
                      <input
                        id="shippingApt"
                        type="text"
                        value={shippingApt}
                        onChange={(e) => setShippingApt(e.target.value)}
                        className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 transition-colors shadow-sm"
                        placeholder="Apt 4B"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="shippingCity">
                          City
                        </label>
                        <input
                          id="shippingCity"
                          type="text"
                          required={!isLogin}
                          value={shippingCity}
                          onChange={(e) => setShippingCity(e.target.value)}
                          className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 transition-colors shadow-sm"
                          placeholder="City"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="shippingState">
                          State / Province
                        </label>
                        <input
                          id="shippingState"
                          type="text"
                          required={!isLogin}
                          value={shippingState}
                          onChange={(e) => setShippingState(e.target.value)}
                          className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 transition-colors shadow-sm"
                          placeholder="ST"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="shippingZip">
                        ZIP / Postal Code
                      </label>
                      <input
                        id="shippingZip"
                        type="text"
                        required={!isLogin}
                        value={shippingZip}
                        onChange={(e) => setShippingZip(e.target.value)}
                        className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 transition-colors shadow-sm"
                        placeholder="12345"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-gray-100">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-gray-900">Billing Information</h3>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={sameAsShipping}
                        onChange={(e) => setSameAsShipping(e.target.checked)}
                        className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                      />
                      <span className="text-sm font-medium text-gray-600">Same as shipping</span>
                    </label>
                  </div>
                  
                  {!sameAsShipping && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="billingStreet">
                          Street Address
                        </label>
                        <input
                          id="billingStreet"
                          type="text"
                          required={!isLogin && !sameAsShipping}
                          value={billingStreet}
                          onChange={(e) => setBillingStreet(e.target.value)}
                          className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 transition-colors shadow-sm"
                          placeholder="123 Main St"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="billingApt">
                          Apartment, suite, etc. (optional)
                        </label>
                        <input
                          id="billingApt"
                          type="text"
                          value={billingApt}
                          onChange={(e) => setBillingApt(e.target.value)}
                          className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 transition-colors shadow-sm"
                          placeholder="Apt 4B"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="billingCity">
                            City
                          </label>
                          <input
                            id="billingCity"
                            type="text"
                            required={!isLogin && !sameAsShipping}
                            value={billingCity}
                            onChange={(e) => setBillingCity(e.target.value)}
                            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 transition-colors shadow-sm"
                            placeholder="City"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="billingState">
                            State / Province
                          </label>
                          <input
                            id="billingState"
                            type="text"
                            required={!isLogin && !sameAsShipping}
                            value={billingState}
                            onChange={(e) => setBillingState(e.target.value)}
                            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 transition-colors shadow-sm"
                            placeholder="ST"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="billingZip">
                          ZIP / Postal Code
                        </label>
                        <input
                          id="billingZip"
                          type="text"
                          required={!isLogin && !sameAsShipping}
                          value={billingZip}
                          onChange={(e) => setBillingZip(e.target.value)}
                          className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 transition-colors shadow-sm"
                          placeholder="12345"
                        />
                      </div>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="phone">
                    Phone Number
                  </label>
                  <input
                    id="phone"
                    type="tel"
                    required={!isLogin}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 transition-colors shadow-sm"
                    placeholder="(555) 555-5555"
                    autoComplete="tel"
                  />
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-md text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
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
              className="text-sm text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
            >
              {isLogin
                ? "Don't have an account? Create one now."
                : "Already have an account? Sign in here."}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
