let currentTab = "login";
const API_BASE = "/api/auth";

document.addEventListener("DOMContentLoaded", () => {
  const tabs = document.querySelectorAll(".tab-button");
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => activateTab(tab.dataset.tab));
  });

  const demoCard = document.querySelector(".demo");
  if (demoCard) {
    demoCard.addEventListener("click", (event) => {
      if (event.target.closest("button")) {
        return;
      }
      fillDemoLogin();
    });
  }

  const demoButton = document.querySelector(".demo-pill");
  if (demoButton) {
    demoButton.addEventListener("click", fillDemoLogin);
  }

  const registerSwitch = document.querySelector(".switch-register");
  if (registerSwitch) {
    registerSwitch.addEventListener("click", () => activateTab("register"));
  }

  activateTab(currentTab);
});

function activateTab(tab) {
  currentTab = tab === "register" ? "register" : "login";

  document.querySelectorAll(".tab-button").forEach((button) => {
    const active = button.dataset.tab === currentTab;
    button.classList.toggle("active", active);
    button.setAttribute("aria-selected", active ? "true" : "false");
  });

  showTab(currentTab);
}

function switchTab(event) {
  const tabName =
    event?.target?.dataset?.tab ||
    event?.target?.textContent?.trim()?.toLowerCase() ||
    "login";

  activateTab(tabName);
}

function showTab(tab) {
  const loginForm = document.getElementById("login-form");
  const registerForm = document.getElementById("register-form");

  if (!loginForm || !registerForm) {
    return;
  }

  const loginActive = tab === "login";
  loginForm.classList.toggle("hidden", !loginActive);
  registerForm.classList.toggle("hidden", loginActive);
}

function fillDemoLogin() {
  activateTab("login");
  const loginInput = document.getElementById("login-phone");
  if (loginInput) {
    loginInput.value = "9876543210";
    loginInput.focus();
  }
}

function showMessage(el, msg, type = "error") {
  const host = el.closest(".input-group") || el.parentNode;
  let msgEl = host.querySelector(".error, .success");

  if (!msgEl) {
    msgEl = document.createElement("div");
    host.appendChild(msgEl);
  }

  msgEl.textContent = msg;
  msgEl.className = type;
}

async function apiPost(endpoint, data) {
  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });

    return await res.json();
  } catch (error) {
    return { error: "Network error" };
  }
}

async function handleRegister() {
  const form = document.getElementById("register-form");
  const btn = form.querySelector("button.primary-btn");
  const name = document.getElementById("reg-name").value.trim();
  const phone = document.getElementById("reg-phone").value.trim();
  const email = document.getElementById("reg-email").value.trim();
  const password = document.getElementById("reg-password").value;

  btn.textContent = "Creating account...";
  btn.classList.add("loading");

  const result = await apiPost("/register", { name, phone, email, password });

  btn.textContent = "Create Account";
  btn.classList.remove("loading");

  if (result.success) {
    activateTab("login");
    document.getElementById("login-phone").value = phone || email;
    showMessage(
      document.getElementById("login-phone"),
      "Registration complete. Enter the OTP sent to continue.",
      "success"
    );
    return;
  }

  showMessage(
    document.getElementById("reg-phone"),
    result.error || "Registration failed"
  );
}

async function handleLogin() {
  const loginInput = document.getElementById("login-phone");
  const identifier = loginInput.value.trim();

  if (!identifier) {
    showMessage(loginInput, "Phone number or email is required");
    return;
  }

  const btn = document.querySelector("#login-form button.primary-btn");
  btn.textContent = "Sending access code...";
  btn.classList.add("loading");

  const result = await apiPost("/login", { phone: identifier });

  btn.textContent = "Continue with Phone/Email";
  btn.classList.remove("loading");

  if (result.demo) {
    window.location.href = "/dashboard";
    return;
  }

  if (result.success) {
    document.getElementById("otp-input").classList.remove("hidden");
    showMessage(
      loginInput,
      "OTP sent successfully. Check your phone or email for the code.",
      "success"
    );
    return;
  }

  showMessage(loginInput, result.error || "Login failed");
}

async function handleOTP() {
  const phone = document.getElementById("login-phone").value.trim();
  const otpInput = document.getElementById("otp");
  const otp = otpInput.value.trim();

  if (!otp) {
    showMessage(otpInput, "OTP is required");
    return;
  }

  const btn = document.getElementById("otp-btn");
  btn.textContent = "Verifying...";
  btn.classList.add("loading");

  const result = await apiPost("/otp-verify", { phone, otp });

  btn.textContent = "Verify OTP";
  btn.classList.remove("loading");

  if (result.success) {
    window.location.href = result.redirect || "/dashboard";
    return;
  }

  showMessage(otpInput, result.error || "Invalid OTP");
  otpInput.value = "";
}

async function handleSocial(type) {
  const result = await apiPost(`/${type}`);
  if (result.success) {
    window.location.href = "/dashboard";
  }
}

function logout() {
  fetch("/api/auth/logout", { method: "POST" });
  window.location.href = "/";
}

if (window.location.pathname.includes("dashboard")) {
  fetch("/api/auth/me")
    .then((res) => res.json())
    .then((user) => {
      if (!user.id) {
        window.location.href = "/";
        return;
      }

      const userName = document.getElementById("user-name");
      if (userName) {
        userName.textContent = user.name;
      }
    });
}
