"use client";
import { useState, useRef } from "react";

export default function AuthSection() {
  const [tab, setTab] = useState("login");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });

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

  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);

  // Google (kept same structure)
  const googleButtonRef = useRef(null);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [googleScriptReady, setGoogleScriptReady] = useState(false);

  const googleConfig = {
    enabled: false,
    loading: false,
  };

  // ===== HANDLERS (keep your original logic here) =====
  const handleLogin = (e) => {
    e.preventDefault();
    setBusy(true);

    setTimeout(() => {
      setBusy(false);
      setMessage({ text: "Logged in (demo)", type: "success" });
    }, 1000);
  };

  const handleRegister = (e) => {
    e.preventDefault();
    setBusy(true);

    setTimeout(() => {
      setBusy(false);
      setMessage({ text: "Account created (demo)", type: "success" });
    }, 1000);
  };

  return (
    <div className="panel px-6 py-6 sm:px-7 sm:py-7 w-full max-w-md">
      {/* Tabs */}
      <div className="mb-5 mt-2 grid grid-cols-2 rounded-full bg-slate-100 p-1">
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

      {/* Message */}
      {message.text && (
        <div className="mb-5 rounded-[22px] border px-4 py-3 text-sm">
          {message.text}
        </div>
      )}

      {/* Google */}
      <div className="rounded-[24px] border p-4">
        <p className="text-sm font-semibold">Google Sign In</p>
        <div className="mt-3">
          <button className="btn-secondary w-full" disabled>
            Enable Google in env
          </button>
        </div>
      </div>

      <div className="my-5 text-center text-sm text-slate-500">
        or continue with email
      </div>

      {/* LOGIN */}
      {tab === "login" ? (
        <form className="space-y-4" onSubmit={handleLogin}>
          <input
            className="input-field"
            placeholder="Email or phone"
            value={loginForm.identifier}
            onChange={(e) =>
              setLoginForm((c) => ({ ...c, identifier: e.target.value }))
            }
          />

          <div className="relative">
            <input
              className="input-field pr-20"
              type={showLoginPassword ? "text" : "password"}
              placeholder="Password"
              value={loginForm.password}
              onChange={(e) =>
                setLoginForm((c) => ({ ...c, password: e.target.value }))
              }
            />
            <button
              type="button"
              onClick={() => setShowLoginPassword((c) => !c)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs"
            >
              {showLoginPassword ? "Hide" : "Show"}
            </button>
          </div>

          <button className="btn-primary w-full" disabled={busy}>
            {busy ? "Signing in..." : "Login"}
          </button>
        </form>
      ) : (
        <form className="space-y-4" onSubmit={handleRegister}>
          <input
            className="input-field"
            placeholder="Full Name"
            value={registerForm.name}
            onChange={(e) =>
              setRegisterForm((c) => ({ ...c, name: e.target.value }))
            }
          />

          <input
            className="input-field"
            placeholder="Email"
            value={registerForm.email}
            onChange={(e) =>
              setRegisterForm((c) => ({ ...c, email: e.target.value }))
            }
          />

          <input
            className="input-field"
            placeholder="Phone"
            value={registerForm.phone}
            onChange={(e) =>
              setRegisterForm((c) => ({ ...c, phone: e.target.value }))
            }
          />

          <div className="relative">
            <input
              className="input-field pr-20"
              type={showRegisterPassword ? "text" : "password"}
              placeholder="Password"
              value={registerForm.password}
              onChange={(e) =>
                setRegisterForm((c) => ({ ...c, password: e.target.value }))
              }
            />
            <button
              type="button"
              onClick={() => setShowRegisterPassword((c) => !c)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs"
            >
              {showRegisterPassword ? "Hide" : "Show"}
            </button>
          </div>

          <button className="btn-primary w-full" disabled={busy}>
            {busy ? "Creating..." : "Register"}
          </button>
        </form>
      )}
    </div>
  );
}