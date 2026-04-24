"use client";

import Navbar from "./ui/navbar";
import Script from "next/script";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "../lib/api";
import {
  DEMO_CREDENTIALS,
  ROLE_CONFIGS,
  formatRole,
} from "../lib/constants";
import {
  clearStoredSession,
  getRecentLogin,
  getStoredSession,
  rememberRecentLogin,
  saveStoredSession,
} from "../lib/session";

function resolveDashboardPath(role) {
  const normalizedRole = String(role || "").trim();
  return ROLE_CONFIGS[normalizedRole] ? `/dashboard/${normalizedRole}` : null;
}

export default function HomePage() {
  const router = useRouter();
  const googleButtonRef = useRef(null);
  const googleHandlerRef = useRef(null);
  const [tab, setTab] = useState("login");
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [googleScriptReady, setGoogleScriptReady] = useState(false);
  const [googleConfig, setGoogleConfig] = useState({
    loading: true,
    enabled: false,
    clientId: "",
  });
  const [message, setMessage] = useState({ type: "", text: "" });
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [recentLogin, setRecentLogin] = useState(null);
  const [loginForm, setLoginForm] = useState({
    identifier: "",
    password: "",
  });
  const [registerForm, setRegisterForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
  });

  useEffect(() => {
    setRecentLogin(getRecentLogin());
  }, []);

  useEffect(() => {
    let ignore = false;
    const session = getStoredSession();

    if (!session?.token) return undefined;

    apiFetch("/auth/me", { token: session.token })
      .then((response) => {
        if (ignore) return;
        saveStoredSession({ token: session.token, user: response.user });
        const redirectPath = resolveDashboardPath(response.user.role);

        if (!redirectPath) {
          clearStoredSession();
          setMessage({
            type: "error",
            text: "This account role no longer has a dashboard. Please contact super admin.",
          });
          return;
        }
        router.replace(redirectPath);
      })
      .catch(() => clearStoredSession());

    return () => { ignore = true; };
  }, [router]);

  useEffect(() => {
    let ignore = false;
    apiFetch("/auth/google/config")
      .then((response) => {
        if (ignore) return;
        setGoogleConfig({
          loading: false,
          enabled: Boolean(response.enabled && response.clientId),
          clientId: response.clientId || "",
        });
      })
      .catch(() => {
        if (!ignore) {
          setGoogleConfig({ loading: false, enabled: false, clientId: "" });
        }
      });
    return () => { ignore = true; };
  }, []);

  googleHandlerRef.current = async (googleResponse) => {
    const credential = String(googleResponse?.credential || "").trim();
    if (!credential) {
      setMessage({
        type: "error",
        text: "Google sign-in did not return a valid credential.",
      });
      return;
    }

    setGoogleBusy(true);
    setMessage({ type: "", text: "" });

    try {
      const response = await apiFetch("/auth/google", {
        method: "POST",
        body: { credential },
      });
      finalizeAuth(response, "Google sign-in successful. Opening your workspace.");
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setGoogleBusy(false);
    }
  };

  useEffect(() => {
    if (
      !googleScriptReady ||
      !googleConfig.enabled ||
      !googleButtonRef.current ||
      !window.google?.accounts?.id
    ) {
      return;
    }

    googleButtonRef.current.innerHTML = "";
    window.google.accounts.id.initialize({
      client_id: googleConfig.clientId,
      callback: (googleResponse) => googleHandlerRef.current?.(googleResponse),
      auto_select: false,
      context: "signin",
      ux_mode: "popup",
    });
    window.google.accounts.id.renderButton(googleButtonRef.current, {
      theme: "outline",
      size: "large",
      text: "continue_with",
      shape: "pill",
      width: 360,
    });
  }, [googleConfig.clientId, googleConfig.enabled, googleScriptReady]);

  function finalizeAuth(response, successText) {
    const loggedInAt = new Date().toISOString();
    const recent = rememberRecentLogin(response.user, loggedInAt);

    saveStoredSession({ token: response.token, user: response.user });
    setRecentLogin(recent);
    setMessage({ type: "success", text: successText });

    const redirectPath = resolveDashboardPath(response.user.role);
    if (!redirectPath) {
      clearStoredSession();
      setMessage({
        type: "error",
        text: "This account role no longer has a dashboard. Please contact super admin.",
      });
      return;
    }
    router.push(redirectPath);
  }

  async function handleLogin(event) {
    event.preventDefault();
    setBusy(true);
    setMessage({ type: "", text: "" });

    try {
      const response = await apiFetch("/auth/login", {
        method: "POST",
        body: loginForm,
      });
      finalizeAuth(response, "Login successful. Opening your care dashboard.");
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setBusy(false);
    }
  }

  async function handleRegister(event) {
    event.preventDefault();
    setBusy(true);
    setMessage({ type: "", text: "" });

    try {
      const response = await apiFetch("/auth/register", {
        method: "POST",
        body: registerForm,
      });
      finalizeAuth(response, "Registration complete. Opening your patient dashboard.");
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setBusy(false);
    }
  }

  function loadDemo(role) {
    const demo = DEMO_CREDENTIALS[role];
    if (!demo) return;

    setTab("login");
    setLoginForm(demo);
    setShowLoginPassword(false);
    setMessage({
      type: "success",
      text: `${formatRole(role)} demo credentials loaded.`,
    });
  }

  return (
    <div className="relative min-h-screen bg-slate-50">
      <Script
        onLoad={() => setGoogleScriptReady(true)}
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
      />

      <Navbar />

      <div className="flex min-h-[calc(100vh-64px)] items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-8">
          
          {/* Auth Card */}
          <div className="relative overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-slate-900/5">
            
            {/* Header */}
            <div className="px-8 pt-8 pb-6">
              <div className="text-center">
                <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                  {tab === "login" ? "Welcome back" : "Create your account"}
                </h2>
                <p className="mt-2 text-sm text-slate-600">
                  {tab === "login" 
                    ? "Sign in to access your healthcare dashboard" 
                    : "Join our platform to manage your health journey"}
                </p>
              </div>

              {/* Tab Switcher */}
              <div className="mt-8 grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1">
                {["login", "register"].map((item) => (
                  <button
                    key={item}
                    onClick={() => {
                      setTab(item);
                      setMessage({ type: "", text: "" });
                    }}
                    className={`rounded-lg px-4 py-2.5 text-sm font-semibold transition-all duration-200 ${
                      tab === item
                        ? "bg-white text-blue-700 shadow-sm ring-1 ring-slate-200"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                    type="button"
                  >
                    {item === "login" ? "Sign In" : "Get Started"}
                  </button>
                ))}
              </div>
            </div>

            {/* Alert Messages */}
            {message.text && (
              <div className="mx-8 mb-6">
                <div
                  className={`rounded-lg border px-4 py-3 text-sm ${
                    message.type === "error"
                      ? "border-red-200 bg-red-50 text-red-800"
                      : "border-emerald-200 bg-emerald-50 text-emerald-800"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {message.type === "error" ? (
                      <svg className="h-4 w-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <svg className="h-4 w-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                      </svg>
                    )}
                    {message.text}
                  </div>
                </div>
              </div>
            )}

            <div className="px-8 pb-8">
              {/* Social Auth */}
              <div className={`space-y-3 ${googleBusy ? "pointer-events-none opacity-60" : ""}`}>
                {googleConfig.enabled && googleScriptReady ? (
                  <div ref={googleButtonRef} className="flex justify-center" />
                ) : (
                  <button
                    disabled
                    className="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
                    type="button"
                  >
                    <svg className="h-5 w-5" viewBox="0 0 24 24">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.33v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.11z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                    Continue with Google
                  </button>
                )}

                <button
                  disabled
                  className="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
                  type="button"
                >
                  <svg className="h-5 w-5 text-black" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701"/>
                  </svg>
                  Continue with Apple
                </button>
              </div>

              <div className="my-6 flex items-center gap-4">
                <div className="h-px flex-1 bg-slate-200" />
                <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                  or continue with email
                </span>
                <div className="h-px flex-1 bg-slate-200" />
              </div>

              {/* Forms */}
              {tab === "login" ? (
                <form className="space-y-5" onSubmit={handleLogin}>
                  <div className="space-y-1.5">
                    <label htmlFor="identifier" className="block text-sm font-semibold text-slate-700">
                      Email or phone
                    </label>
                    <input
                      id="identifier"
                      name="identifier"
                      type="text"
                      autoComplete="username"
                      required
                      className="block w-full rounded-xl border-0 bg-slate-50 px-4 py-3 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-200 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6 transition-all"
                      placeholder="admin@abchospital.com"
                      value={loginForm.identifier}
                      onChange={(e) => setLoginForm((c) => ({ ...c, identifier: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label htmlFor="password" className="block text-sm font-semibold text-slate-700">
                        Password
                      </label>
                      <a href="#" className="text-xs font-medium text-blue-600 hover:text-blue-500">
                        Forgot password?
                      </a>
                    </div>
                    <div className="relative">
                      <input
                        id="password"
                        name="password"
                        type={showLoginPassword ? "text" : "password"}
                        autoComplete="current-password"
                        required
                        className="block w-full rounded-xl border-0 bg-slate-50 px-4 py-3 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-200 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6 pr-20 transition-all"
                        placeholder="Enter your password"
                        value={loginForm.password}
                        onChange={(e) => setLoginForm((c) => ({ ...c, password: e.target.value }))}
                      />
                      <button
                        type="button"
                        onClick={() => setShowLoginPassword((c) => !c)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-200 hover:text-slate-900 transition-colors"
                      >
                        {showLoginPassword ? "Hide" : "Show"}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={busy}
                    className="flex w-full items-center justify-center rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {busy ? (
                      <>
                        <svg className="mr-2 h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Signing in...
                      </>
                    ) : (
                      "Sign in to dashboard"
                    )}
                  </button>

                  <p className="text-center text-xs text-slate-500">
                    Press <kbd className="rounded border border-slate-200 bg-slate-100 px-1.5 py-0.5 font-sans text-[10px] font-semibold text-slate-600">Enter</kbd> to sign in faster
                  </p>
                </form>
              ) : (
                <form className="space-y-5" onSubmit={handleRegister}>
                  <div className="space-y-1.5">
                    <label htmlFor="name" className="block text-sm font-semibold text-slate-700">
                      Full name
                    </label>
                    <input
                      id="name"
                      name="name"
                      type="text"
                      autoComplete="name"
                      required
                      className="block w-full rounded-xl border-0 bg-slate-50 px-4 py-3 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-200 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6 transition-all"
                      placeholder="Aarav Mehta"
                      value={registerForm.name}
                      onChange={(e) => setRegisterForm((c) => ({ ...c, name: e.target.value }))}
                    />
                  </div>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <label htmlFor="email" className="block text-sm font-semibold text-slate-700">
                        Email
                      </label>
                      <input
                        id="email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        required
                        className="block w-full rounded-xl border-0 bg-slate-50 px-4 py-3 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-200 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6 transition-all"
                        placeholder="patient@abchospital.com"
                        value={registerForm.email}
                        onChange={(e) => setRegisterForm((c) => ({ ...c, email: e.target.value }))}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label htmlFor="phone" className="block text-sm font-semibold text-slate-700">
                        Phone
                      </label>
                      <input
                        id="phone"
                        name="phone"
                        type="tel"
                        autoComplete="tel"
                        inputMode="numeric"
                        className="block w-full rounded-xl border-0 bg-slate-50 px-4 py-3 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-200 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6 transition-all"
                        placeholder="9876543210"
                        value={registerForm.phone}
                        onChange={(e) => setRegisterForm((c) => ({ ...c, phone: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="register-password" className="block text-sm font-semibold text-slate-700">
                      Password
                    </label>
                    <div className="relative">
                      <input
                        id="register-password"
                        name="password"
                        type={showRegisterPassword ? "text" : "password"}
                        autoComplete="new-password"
                        required
                        className="block w-full rounded-xl border-0 bg-slate-50 px-4 py-3 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-200 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6 pr-20 transition-all"
                        placeholder="At least 8 characters"
                        value={registerForm.password}
                        onChange={(e) => setRegisterForm((c) => ({ ...c, password: e.target.value }))}
                      />
                      <button
                        type="button"
                        onClick={() => setShowRegisterPassword((c) => !c)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-200 hover:text-slate-900 transition-colors"
                      >
                        {showRegisterPassword ? "Hide" : "Show"}
                      </button>
                    </div>
                    <p className="text-xs text-slate-500">Must be at least 8 characters with a number and symbol</p>
                  </div>

                  <button
                    type="submit"
                    disabled={busy}
                    className="flex w-full items-center justify-center rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {busy ? (
                      <>
                        <svg className="mr-2 h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Creating account...
                      </>
                    ) : (
                      "Create patient account"
                    )}
                  </button>

                  <p className="text-center text-xs text-slate-500">
                    By creating an account, you agree to our{" "}
                    <a href="#" className="font-medium text-blue-600 hover:text-blue-500">Terms</a>{" "}
                    and{" "}
                    <a href="#" className="font-medium text-blue-600 hover:text-blue-500">Privacy Policy</a>
                  </p>
                </form>
              )}

              {/* Demo Roles */}
              <div className="mt-8 rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <svg className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Demo Access</p>
                </div>
                <p className="text-sm text-slate-600 mb-3">
                  Switch between workspaces instantly for testing.
                </p>
                <div className="flex flex-wrap gap-2">
                  {Object.keys(DEMO_CREDENTIALS).map((role) => (
                    <button
                      key={role}
                      onClick={() => loadDemo(role)}
                      type="button"
                      className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 transition-colors"
                    >
                      {formatRole(role)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}