"use client";
import Navbar from "./ui/navbar";
import Script from "next/script";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "../lib/api";
import {
  DEMO_CREDENTIALS,
  LANDING_FEATURES,
  LANDING_STATS,
  ROLE_CONFIGS,
  SERVICE_SPOTLIGHTS,
  formatDateTime,
  formatRole,
} from "../lib/constants";
import {
  clearStoredSession,
  getRecentLogin,
  getStoredSession,
  rememberRecentLogin,
  saveStoredSession,
} from "../lib/session";
import Features from "./home/features";

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
  const [localTime, setLocalTime] = useState(new Date());
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

    const timer = window.setInterval(() => {
      setLocalTime(new Date());
    }, 60 * 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    let ignore = false;
    const session = getStoredSession();

    if (!session?.token) {
      return undefined;
    }

    apiFetch("/auth/me", { token: session.token })
      .then((response) => {
        if (ignore) {
          return;
        }

        saveStoredSession({
          token: session.token,
          user: response.user,
        });
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
      .catch(() => {
        clearStoredSession();
      });

    return () => {
      ignore = true;
    };
  }, [router]);

  useEffect(() => {
    let ignore = false;

    apiFetch("/auth/google/config")
      .then((response) => {
        if (ignore) {
          return;
        }

        setGoogleConfig({
          loading: false,
          enabled: Boolean(response.enabled && response.clientId),
          clientId: response.clientId || "",
        });
      })
      .catch(() => {
        if (!ignore) {
          setGoogleConfig({
            loading: false,
            enabled: false,
            clientId: "",
          });
        }
      });

    return () => {
      ignore = true;
    };
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
      finalizeAuth(
        response,
        "Google sign-in successful. Opening your workspace.",
      );
    } catch (error) {
      setMessage({
        type: "error",
        text: error.message,
      });
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

    saveStoredSession({
      token: response.token,
      user: response.user,
    });
    setRecentLogin(recent);
    setMessage({
      type: "success",
      text: successText,
    });
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
      setMessage({
        type: "error",
        text: error.message,
      });
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

      finalizeAuth(
        response,
        "Registration complete. Opening your patient dashboard.",
      );
    } catch (error) {
      setMessage({
        type: "error",
        text: error.message,
      });
    } finally {
      setBusy(false);
    }
  }

  function loadDemo(role) {
    const demo = DEMO_CREDENTIALS[role];
    if (!demo) {
      return;
    }

    setTab("login");
    setLoginForm(demo);
    setShowLoginPassword(false);
    setMessage({
      type: "success",
      text: `${formatRole(role)} demo credentials loaded.`,
    });
  }

  return (
    <div className="relative overflow-hidden">
      <Script
        onLoad={() => setGoogleScriptReady(true)}
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
      />

      <div className="relative space-y-8 pb-12 pt-6 bg-neutral-50/97 md:space-y-10 md:pb-20">
        <Navbar />

        <section className="">
          <div className="panel fade-in-up max-w-md mx-auto bg-white rounded-2xl shadow-lg p-6">
            <div className="mb-6 grid grid-cols-2 rounded-full bg-neutral-100 p-1">
              {["login", "register"].map((item) => (
                <button
                  key={item}
                  className={`rounded-full px-4 py-2 text-sm transition ${
                    tab === item
                      ? "bg-blue-500 text-white shadow-sm"
                      : "text-black"
                  }`}
                  onClick={() => setTab(item)}
                  type="button"
                >
                  {item === "login" ? "Login" : "Register"}
                </button>
              ))}
            </div>

            {message.text ? (
              <div
                aria-live="polite"
                className={`mb-4 rounded-lg border px-3 py-2 text-xs ${
                  message.type === "error"
                    ? "border-rose-200 bg-rose-50 text-rose-700"
                    : "border-emerald-200 bg-emerald-50 text-emerald-700"
                }`}
              >
                {message.text}
              </div>
            ) : null}

            <div className="rounded-xl p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h4 className="text-base font-semibold text-slate-900">
                    {tab === "register"
                      ? "Continue to create a patient workspace"
                      : "Welcome back"}
                  </h4>
                </div>
              </div>

              <div
                className={`mt-3 flex items-center justify-center ${googleBusy ? "pointer-events-none opacity-60" : ""}`}
              >
                {googleConfig.enabled ? (
                  googleScriptReady ? (
                    <div
                      ref={googleButtonRef}
                      className="min-h-[44px] rounded-full"
                    />
                  ) : (
                    <div className="btn-secondary w-full justify-center">
                      Loading Google sign-in...
                    </div>
                  )
                ) : (
                  <button
                    className="bg-blue-500 text-white rounded-full w-fit px-6 py-2"
                    disabled
                    type="button"
                  >
                    Continue with Google
                  </button>
                )}
              </div>
            </div>

            <div className="my-4 flex items-center gap-2 text-xs text-slate-400">
              <div className="h-px flex-1 bg-slate-200" />
              or continue with
              <div className="h-px flex-1 bg-slate-200" />
            </div>

            {tab === "login" ? (
              <form className="space-y-4" onSubmit={handleLogin}>
                <div className="space-y-2 flex flex-col">
                  <label className="text-sm font-medium text-slate-700">
                    Email or phone
                  </label>
                  <input
                    autoComplete="username"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    onChange={(event) =>
                      setLoginForm((current) => ({
                        ...current,
                        identifier: event.target.value,
                      }))
                    }
                    placeholder="admin@abchospital.com"
                    value={loginForm.identifier}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      autoComplete="current-password"
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 pr-20"
                      onChange={(event) =>
                        setLoginForm((current) => ({
                          ...current,
                          password: event.target.value,
                        }))
                      }
                      placeholder="Enter your password"
                      type={showLoginPassword ? "text" : "password"}
                      value={loginForm.password}
                    />
                    <button
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full px-3 py-1 text-xs font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                      onClick={() =>
                        setShowLoginPassword((current) => !current)
                      }
                      type="button"
                    >
                      {showLoginPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                </div>

                <button
                  className="w-full rounded-lg bg-blue-500 py-2 text-sm font-semibold text-white hover:bg-blue-600 transition"
                  disabled={busy}
                  type="submit"
                >
                  {busy ? "Signing in..." : "Login to dashboard"}
                </button>
                <p className="text-center text-[11px] text-slate-400">
                  Press Enter to sign in faster.
                </p>
              </form>
            ) : (
              <form className="space-y-4" onSubmit={handleRegister}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-2">
                    <label className="text-sm font-medium text-slate-700">
                      Full name
                    </label>
                    <input
                      autoComplete="name"
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      onChange={(event) =>
                        setRegisterForm((current) => ({
                          ...current,
                          name: event.target.value,
                        }))
                      }
                      placeholder="Aarav Mehta"
                      value={registerForm.name}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">
                      Email
                    </label>
                    <input
                      autoComplete="email"
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      onChange={(event) =>
                        setRegisterForm((current) => ({
                          ...current,
                          email: event.target.value,
                        }))
                      }
                      placeholder="patient@abchospital.com"
                      value={registerForm.email}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">
                      Phone
                    </label>
                    <input
                      autoComplete="tel"
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      inputMode="numeric"
                      onChange={(event) =>
                        setRegisterForm((current) => ({
                          ...current,
                          phone: event.target.value,
                        }))
                      }
                      placeholder="9876543210"
                      value={registerForm.phone}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      autoComplete="new-password"
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 pr-20"
                      onChange={(event) =>
                        setRegisterForm((current) => ({
                          ...current,
                          password: event.target.value,
                        }))
                      }
                      placeholder="At least 8 characters"
                      type={showRegisterPassword ? "text" : "password"}
                      value={registerForm.password}
                    />
                    <button
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full px-3 py-1 text-xs font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                      onClick={() =>
                        setShowRegisterPassword((current) => !current)
                      }
                      type="button"
                    >
                      {showRegisterPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                </div>

                <button
                  className="w-full rounded-lg bg-blue-500 py-2 text-sm font-semibold text-white hover:bg-blue-600 transition"
                  disabled={busy}
                  type="submit"
                >
                  {busy ? "Creating account..." : "Create patient account"}
                </button>
                <p className="text-center text-[11px] text-slate-400">
                  Press Enter to create the account instantly.
                </p>
              </form>
            )}

            <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase text-slate-500">Demo roles</p>
                  <p className="mt-2 text-sm text-slate-600">
                    Switch between every workspace without leaving this screen.
                  </p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {Object.keys(DEMO_CREDENTIALS).map((role) => (
                  <button
                    key={role}
                    className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs hover:bg-slate-100"
                    onClick={() => loadDemo(role)}
                    type="button"
                  >
                    {formatRole(role)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
