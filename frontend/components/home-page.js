"use client";

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
  formatRole
} from "../lib/constants";
import {
  clearStoredSession,
  getRecentLogin,
  getStoredSession,
  rememberRecentLogin,
  saveStoredSession
} from "../lib/session";

const ACCESS_ORDER = [
  "patient",
  "doctor",
  "nurse",
  "receptionist",
  "admin",
  "super_admin"
];
const TRUST_MARKERS = [
  { label: "Response window", value: "< 30 sec" },
  { label: "Role routing", value: "Auto" },
  { label: "Mobile ready", value: "100%" }
];

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
    clientId: ""
  });
  const [message, setMessage] = useState({ type: "", text: "" });
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [recentLogin, setRecentLogin] = useState(null);
  const [localTime, setLocalTime] = useState(new Date());
  const [loginForm, setLoginForm] = useState({
    identifier: "",
    password: ""
  });
  const [registerForm, setRegisterForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: ""
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
          user: response.user
        });
        const redirectPath = resolveDashboardPath(response.user.role);

        if (!redirectPath) {
          clearStoredSession();
          setMessage({
            type: "error",
            text: "This account role no longer has a dashboard. Please contact super admin."
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
          clientId: response.clientId || ""
        });
      })
      .catch(() => {
        if (!ignore) {
          setGoogleConfig({
            loading: false,
            enabled: false,
            clientId: ""
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
        text: "Google sign-in did not return a valid credential."
      });
      return;
    }

    setGoogleBusy(true);
    setMessage({ type: "", text: "" });

    try {
      const response = await apiFetch("/auth/google", {
        method: "POST",
        body: { credential }
      });
      finalizeAuth(response, "Google sign-in successful. Opening your workspace.");
    } catch (error) {
      setMessage({
        type: "error",
        text: error.message
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
      ux_mode: "popup"
    });
    window.google.accounts.id.renderButton(googleButtonRef.current, {
      theme: "outline",
      size: "large",
      text: "continue_with",
      shape: "pill",
      width: 360
    });
  }, [googleConfig.clientId, googleConfig.enabled, googleScriptReady]);

  function finalizeAuth(response, successText) {
    const loggedInAt = new Date().toISOString();
    const recent = rememberRecentLogin(response.user, loggedInAt);

    saveStoredSession({
      token: response.token,
      user: response.user
    });
    setRecentLogin(recent);
    setMessage({
      type: "success",
      text: successText
    });
    const redirectPath = resolveDashboardPath(response.user.role);

    if (!redirectPath) {
      clearStoredSession();
      setMessage({
        type: "error",
        text: "This account role no longer has a dashboard. Please contact super admin."
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
        body: loginForm
      });

      finalizeAuth(response, "Login successful. Opening your care dashboard.");
    } catch (error) {
      setMessage({
        type: "error",
        text: error.message
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
        body: registerForm
      });

      finalizeAuth(response, "Registration complete. Opening your patient dashboard.");
    } catch (error) {
      setMessage({
        type: "error",
        text: error.message
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
      text: `${formatRole(role)} demo credentials loaded.`
    });
  }

  return (
    <div className="relative overflow-hidden">
      <Script
        onLoad={() => setGoogleScriptReady(true)}
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
      />

      <div className="pointer-events-none absolute inset-0 ambient-grid opacity-40" />
      <div className="pointer-events-none absolute -left-16 top-24 h-48 w-48 rounded-full bg-sky-200/40 blur-3xl" />
      <div className="pointer-events-none absolute right-0 top-16 h-64 w-64 rounded-full bg-orange-200/35 blur-3xl" />

      <div className="page-wrap relative space-y-8 pb-12 pt-6 md:space-y-10 md:pb-20">
        <header className="panel flex flex-col gap-5 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="grid h-14 w-14 place-items-center rounded-[22px] bg-gradient-to-br from-sky-600 to-sky-800 text-white shadow-[0_20px_40px_rgba(22,118,210,0.24)]">
              <LogoMark />
            </div>
            <div>
              <p className="eyebrow">ABC Hospital</p>
              <h1 className="text-xl font-semibold text-slate-900">Care Portal</h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span className="chip">Next.js frontend</span>
            <span className="chip">Tailwind styling</span>
            <span className="chip">API-first backend</span>
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-[1.15fr,0.85fr]">
          <div className="panel fade-in-up relative overflow-hidden px-7 py-8 sm:px-9 sm:py-10">
            <div className="absolute inset-y-0 right-0 hidden w-1/2 bg-gradient-to-l from-sky-100/80 to-transparent lg:block" />
            <div className="float-drift absolute -right-10 top-10 hidden h-36 w-36 rounded-full bg-white/70 blur-3xl lg:block" />
            <div className="relative space-y-6">
              <div className="space-y-4">
                <span className="chip bg-white/90 text-sky-700">Unified portal login for every care role</span>
                <h2 className="max-w-2xl text-4xl font-semibold leading-tight text-slate-950 md:text-6xl">
                  A cleaner hospital sign-in experience for patients, doctors, nurses, and admins.
                </h2>
                <p className="max-w-2xl text-base leading-8 text-slate-600">
                  The login flow now feels more premium and more practical: quick role shortcuts,
                  Google sign-in, clearer password controls, returning-user cues, and a calmer
                  healthcare visual language across desktop and mobile.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                {TRUST_MARKERS.map((item) => (
                  <div key={item.label} className="auth-stat">
                    <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-700">
                      {item.label}
                    </p>
                    <p className="mt-3 text-2xl font-semibold text-slate-950">{item.value}</p>
                  </div>
                ))}
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                {LANDING_FEATURES.map((feature) => (
                  <article key={feature.title} className="panel-soft p-5">
                    <p className="eyebrow">Care flow</p>
                    <h3 className="mt-3 text-lg font-semibold text-slate-900">{feature.title}</h3>
                    <p className="mt-2 text-sm leading-7 text-slate-600">{feature.description}</p>
                  </article>
                ))}
              </div>

              <div className="panel-soft p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="eyebrow">Workspace access</p>
                    <h3 className="mt-2 text-2xl font-semibold text-slate-900">
                      Login paths tuned for each hospital role
                    </h3>
                  </div>
                  <p className="max-w-xl text-sm leading-7 text-slate-600">
                    Load any demo role in one tap, then use the same polished entry point for staff,
                    clinical teams, or patient onboarding.
                  </p>
                </div>

                <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {ACCESS_ORDER.map((role) => {
                    const config = ROLE_CONFIGS[role];

                    return (
                      <article key={role} className="role-tile">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-base font-semibold text-slate-900">
                              {config?.label || formatRole(role)}
                            </p>
                            <p className="mt-1 text-sm text-slate-500">{config?.subtitle}</p>
                          </div>
                          <span className="chip bg-sky-50 text-sky-700">Live</span>
                        </div>
                        <p className="mt-4 text-sm leading-6 text-slate-600">
                          {config?.description}
                        </p>
                        <button
                          className="btn-ghost mt-4 rounded-full border border-slate-200 bg-white"
                          onClick={() => loadDemo(role)}
                          type="button"
                        >
                          Use {formatRole(role)} demo
                        </button>
                      </article>
                    );
                  })}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-4">
                {LANDING_STATS.map((stat) => (
                  <div key={stat.label} className="summary-card">
                    <p className="text-3xl font-semibold text-slate-950">{stat.value}</p>
                    <p className="mt-2 text-sm text-slate-600">{stat.label}</p>
                  </div>
                ))}
              </div>

              <div className="panel-soft grid gap-5 p-5 md:grid-cols-[1fr,1.1fr]">
                <div className="space-y-3">
                  <p className="eyebrow">Clinical focus</p>
                  <h3 className="text-2xl font-semibold text-slate-900">
                    Cleaner digital front door for care delivery
                  </h3>
                  <p className="text-sm leading-7 text-slate-600">
                    The refreshed interface keeps a bright medical palette, layered cards, and a
                    polished appointment-to-dashboard journey inspired by premium health templates.
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  {SERVICE_SPOTLIGHTS.map((item) => (
                    <article
                      key={item.title}
                      className="rounded-[24px] border border-slate-200/70 bg-white/90 p-4"
                    >
                      <h4 className="text-base font-semibold text-slate-900">{item.title}</h4>
                      <p className="mt-2 text-sm leading-6 text-slate-600">{item.copy}</p>
                    </article>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <aside className="panel fade-in-up px-6 py-6 sm:px-7 sm:py-7">
            <div className="rounded-[28px] bg-gradient-to-br from-sky-700 via-sky-600 to-cyan-500 p-5 text-white shadow-[0_24px_70px_rgba(22,118,210,0.26)]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-sky-100/85">
                    Secure portal access
                  </p>
                  <h3 className="mt-2 text-2xl font-semibold">
                    Welcome back to coordinated care
                  </h3>
                  <p className="mt-3 max-w-lg text-sm leading-7 text-sky-50/90">
                    Faster entry, clearer feedback, and role-based routing right after sign-in.
                  </p>
                </div>
                <span className="rounded-full bg-white/18 px-3 py-1 text-xs font-semibold text-white">
                  UI/UX refreshed
                </span>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-[24px] border border-white/18 bg-white/12 p-4 backdrop-blur-md">
                  <p className="text-xs font-semibold uppercase tracking-[0.26em] text-sky-100/75">
                    Local time
                  </p>
                  <p className="mt-3 text-lg font-semibold">
                    {new Intl.DateTimeFormat("en-IN", {
                      hour: "numeric",
                      minute: "2-digit",
                      hour12: true
                    }).format(localTime)}
                  </p>
                  <p className="mt-1 text-sm text-sky-100/80">India Standard Time</p>
                </div>

                <div className="rounded-[24px] border border-white/18 bg-white/12 p-4 backdrop-blur-md">
                  <p className="text-xs font-semibold uppercase tracking-[0.26em] text-sky-100/75">
                    Recent secure sign-in
                  </p>
                  <p className="mt-3 text-lg font-semibold">
                    {recentLogin ? formatDateTime(recentLogin.loggedInAt) : "First visit"}
                  </p>
                  <p className="mt-1 text-sm text-sky-100/80">
                    {recentLogin
                      ? `${formatRole(recentLogin.role)} workspace`
                      : "Use Google or email to continue"}
                  </p>
                </div>
              </div>
            </div>

            <div className="mb-5 mt-6 grid grid-cols-2 rounded-full bg-slate-100 p-1">
              {["login", "register"].map((item) => (
                <button
                  key={item}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                    tab === item ? "bg-white text-slate-950 shadow-sm" : "text-slate-500"
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
                className={`mb-5 rounded-[22px] border px-4 py-3 text-sm ${
                  message.type === "error"
                    ? "border-rose-200 bg-rose-50 text-rose-700"
                    : "border-emerald-200 bg-emerald-50 text-emerald-700"
                }`}
              >
                {message.text}
              </div>
            ) : null}

            <div className="rounded-[24px] border border-slate-200/70 bg-slate-50/90 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="eyebrow">Google access</p>
                  <h4 className="mt-2 text-lg font-semibold text-slate-950">
                    {tab === "register"
                      ? "Continue with Google to create a patient workspace"
                      : "Continue with Google for a faster sign-in"}
                  </h4>
                </div>
                <span
                  className={`chip ${
                    googleConfig.enabled ? "bg-emerald-50 text-emerald-700" : "bg-slate-100"
                  }`}
                >
                  {googleConfig.loading
                    ? "Checking"
                    : googleConfig.enabled
                      ? "Available"
                      : "Setup needed"}
                </span>
              </div>

              <div className={`mt-4 ${googleBusy ? "pointer-events-none opacity-60" : ""}`}>
                {googleConfig.enabled ? (
                  googleScriptReady ? (
                    <div
                      ref={googleButtonRef}
                      className="min-h-[44px] rounded-full"
                    />
                  ) : (
                    <div className="btn-secondary w-full justify-center">Loading Google sign-in...</div>
                  )
                ) : (
                  <button className="btn-secondary w-full justify-center opacity-75" disabled type="button">
                    Enable Google sign-in in `.env`
                  </button>
                )}
              </div>

              <p className="mt-3 text-xs leading-6 text-slate-500">
                {googleConfig.enabled
                  ? "Linked Google emails can sign in quickly. First-time Google access creates a patient workspace."
                  : "Add a real GOOGLE_CLIENT_ID value in your environment to activate this button for deployment."}
              </p>
            </div>

            <div className="divider-label my-5">or continue with email</div>

            {tab === "login" ? (
              <form className="space-y-4" onSubmit={handleLogin}>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Email or phone</label>
                  <input
                    autoComplete="username"
                    className="input-field"
                    onChange={(event) =>
                      setLoginForm((current) => ({
                        ...current,
                        identifier: event.target.value
                      }))
                    }
                    placeholder="admin@abchospital.com"
                    value={loginForm.identifier}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Password</label>
                  <div className="relative">
                    <input
                      autoComplete="current-password"
                      className="input-field pr-20"
                      onChange={(event) =>
                        setLoginForm((current) => ({
                          ...current,
                          password: event.target.value
                        }))
                      }
                      placeholder="Enter your password"
                      type={showLoginPassword ? "text" : "password"}
                      value={loginForm.password}
                    />
                    <button
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full px-3 py-1 text-xs font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                      onClick={() => setShowLoginPassword((current) => !current)}
                      type="button"
                    >
                      {showLoginPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                </div>

                <button className="btn-primary w-full" disabled={busy} type="submit">
                  {busy ? "Signing in..." : "Login to dashboard"}
                </button>
                <p className="text-center text-xs text-slate-500">
                  Press Enter to sign in faster.
                </p>
              </form>
            ) : (
              <form className="space-y-4" onSubmit={handleRegister}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-2">
                    <label className="text-sm font-medium text-slate-700">Full name</label>
                    <input
                      autoComplete="name"
                      className="input-field"
                      onChange={(event) =>
                        setRegisterForm((current) => ({
                          ...current,
                          name: event.target.value
                        }))
                      }
                      placeholder="Aarav Mehta"
                      value={registerForm.name}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Email</label>
                    <input
                      autoComplete="email"
                      className="input-field"
                      onChange={(event) =>
                        setRegisterForm((current) => ({
                          ...current,
                          email: event.target.value
                        }))
                      }
                      placeholder="patient@abchospital.com"
                      value={registerForm.email}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Phone</label>
                    <input
                      autoComplete="tel"
                      className="input-field"
                      inputMode="numeric"
                      onChange={(event) =>
                        setRegisterForm((current) => ({
                          ...current,
                          phone: event.target.value
                        }))
                      }
                      placeholder="9876543210"
                      value={registerForm.phone}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Password</label>
                  <div className="relative">
                    <input
                      autoComplete="new-password"
                      className="input-field pr-20"
                      onChange={(event) =>
                        setRegisterForm((current) => ({
                          ...current,
                          password: event.target.value
                        }))
                      }
                      placeholder="At least 8 characters"
                      type={showRegisterPassword ? "text" : "password"}
                      value={registerForm.password}
                    />
                    <button
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full px-3 py-1 text-xs font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                      onClick={() => setShowRegisterPassword((current) => !current)}
                      type="button"
                    >
                      {showRegisterPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                </div>

                <button className="btn-primary w-full" disabled={busy} type="submit">
                  {busy ? "Creating account..." : "Create patient account"}
                </button>
                <p className="text-center text-xs text-slate-500">
                  Press Enter to create the account instantly.
                </p>
              </form>
            )}

            <div className="mt-6 rounded-[24px] border border-slate-200/70 bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="eyebrow">Demo roles</p>
                  <p className="mt-2 text-sm text-slate-600">
                    Switch between every workspace without leaving this screen.
                  </p>
                </div>
                <span className="chip bg-white text-slate-700">All roles covered</span>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {Object.keys(DEMO_CREDENTIALS).map((role) => (
                  <button
                    key={role}
                    className="btn-ghost rounded-full border border-slate-200 bg-white"
                    onClick={() => loadDemo(role)}
                    type="button"
                  >
                    {formatRole(role)}
                  </button>
                ))}
              </div>
            </div>
          </aside>
        </section>
      </div>
    </div>
  );
}

function LogoMark() {
  return (
    <svg aria-hidden="true" className="h-8 w-8" viewBox="0 0 64 64">
      <rect fill="currentColor" height="40" rx="12" width="56" x="4" y="14" />
      <rect fill="rgba(255,255,255,0.28)" height="16" rx="7" width="20" x="22" y="8" />
      <rect fill="#ffffff" height="24" rx="3" width="8" x="28" y="18" />
      <rect fill="#ffffff" height="8" rx="3" width="24" x="20" y="26" />
    </svg>
  );
}
