"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "../lib/api";
import {
  DEMO_CREDENTIALS,
  LANDING_FEATURES,
  LANDING_STATS,
  SERVICE_SPOTLIGHTS,
  formatRole
} from "../lib/constants";
import {
  clearStoredSession,
  getStoredSession,
  saveStoredSession
} from "../lib/session";

export default function HomePage() {
  const router = useRouter();
  const [tab, setTab] = useState("login");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
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
        router.replace(`/dashboard/${response.user.role}`);
      })
      .catch(() => {
        clearStoredSession();
      });

    return () => {
      ignore = true;
    };
  }, [router]);

  async function handleLogin(event) {
    event.preventDefault();
    setBusy(true);
    setMessage({ type: "", text: "" });

    try {
      const response = await apiFetch("/auth/login", {
        method: "POST",
        body: loginForm
      });

      saveStoredSession({
        token: response.token,
        user: response.user
      });

      setMessage({
        type: "success",
        text: "Login successful. Opening your care dashboard."
      });
      router.push(`/dashboard/${response.user.role}`);
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

      saveStoredSession({
        token: response.token,
        user: response.user
      });

      setMessage({
        type: "success",
        text: "Registration complete. Opening your patient dashboard."
      });
      router.push(`/dashboard/${response.user.role}`);
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
    setMessage({
      type: "success",
      text: `${formatRole(role)} demo credentials loaded.`
    });
  }

  return (
    <div className="relative overflow-hidden">
      <div className="page-wrap space-y-8 pb-12 pt-6 md:space-y-10 md:pb-20">
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
          <div className="panel relative overflow-hidden px-7 py-8 sm:px-9 sm:py-10">
            <div className="absolute inset-y-0 right-0 hidden w-1/2 bg-gradient-to-l from-sky-100/80 to-transparent lg:block" />
            <div className="relative space-y-6">
              <div className="space-y-4">
                <span className="chip bg-white/90 text-sky-700">Medilo-inspired hospital UI refresh</span>
                <h2 className="max-w-2xl text-4xl font-semibold leading-tight text-slate-950 md:text-6xl">
                  Modern medical experiences for patients, doctors, and hospital operations.
                </h2>
                <p className="max-w-2xl text-base leading-8 text-slate-600">
                  This frontend replaces the old static pages and WebAssembly queue helper with a
                  cleaner Next.js experience, a stronger healthcare visual system, and responsive
                  dashboards designed around the existing backend APIs.
                </p>
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

          <aside className="panel px-6 py-6 sm:px-7 sm:py-7">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="eyebrow">Portal access</p>
                <h3 className="mt-2 text-2xl font-semibold text-slate-950">
                  Sign in to your workspace
                </h3>
              </div>
              <span className="chip bg-orange-50 text-orange-700">Secure role routing</span>
            </div>

            <div className="mb-5 grid grid-cols-2 rounded-full bg-slate-100 p-1">
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
                className={`mb-5 rounded-2xl border px-4 py-3 text-sm ${
                  message.type === "error"
                    ? "border-rose-200 bg-rose-50 text-rose-700"
                    : "border-emerald-200 bg-emerald-50 text-emerald-700"
                }`}
              >
                {message.text}
              </div>
            ) : null}

            {tab === "login" ? (
              <form className="space-y-4" onSubmit={handleLogin}>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Email or phone</label>
                  <input
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
                  <input
                    className="input-field"
                    onChange={(event) =>
                      setLoginForm((current) => ({
                        ...current,
                        password: event.target.value
                      }))
                    }
                    placeholder="Enter your password"
                    type="password"
                    value={loginForm.password}
                  />
                </div>

                <button className="btn-primary w-full" disabled={busy} type="submit">
                  {busy ? "Signing in..." : "Login to dashboard"}
                </button>
              </form>
            ) : (
              <form className="space-y-4" onSubmit={handleRegister}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-2">
                    <label className="text-sm font-medium text-slate-700">Full name</label>
                    <input
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
                      className="input-field"
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
                  <input
                    className="input-field"
                    onChange={(event) =>
                      setRegisterForm((current) => ({
                        ...current,
                        password: event.target.value
                      }))
                    }
                    placeholder="At least 8 characters"
                    type="password"
                    value={registerForm.password}
                  />
                </div>

                <button className="btn-primary w-full" disabled={busy} type="submit">
                  {busy ? "Creating account..." : "Create patient account"}
                </button>
              </form>
            )}

            <div className="mt-6 rounded-[24px] border border-slate-200/70 bg-slate-50 p-4">
              <p className="eyebrow">Demo roles</p>
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
