const STORAGE_KEY = "abcHospitalSession";
const RECENT_LOGIN_KEY = "abcHospitalRecentLogin";

export function getStoredSession() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    return null;
  }
}

export function saveStoredSession(session) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function clearStoredSession() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(STORAGE_KEY);
}

export function rememberRecentLogin(user, loggedInAt = new Date().toISOString()) {
  if (typeof window === "undefined" || !user) {
    return null;
  }

  const payload = {
    email: user.email,
    loggedInAt,
    name: user.name,
    role: user.role
  };

  window.localStorage.setItem(RECENT_LOGIN_KEY, JSON.stringify(payload));
  return payload;
}

export function getRecentLogin() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(RECENT_LOGIN_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    return null;
  }
}
