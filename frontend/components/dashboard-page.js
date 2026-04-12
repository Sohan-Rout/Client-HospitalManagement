"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { apiDownload, apiFetch } from "../lib/api";
import {
  ROLE_CONFIGS,
  SECTION_LABELS,
  formatCurrency,
  formatDate,
  formatDateTime,
  formatRole,
  sortEmergencyQueue
} from "../lib/constants";
import {
  clearStoredSession,
  getStoredSession,
  saveStoredSession
} from "../lib/session";

const APPOINTMENT_STYLES = {
  pending: "bg-amber-100 text-amber-800",
  accepted: "bg-emerald-100 text-emerald-800",
  rejected: "bg-rose-100 text-rose-800",
  in_progress: "bg-sky-100 text-sky-800",
  completed: "bg-slate-200 text-slate-700",
  cancelled: "bg-slate-100 text-slate-500"
};

const EMERGENCY_STYLES = {
  waiting: "bg-amber-100 text-amber-800",
  triaged: "bg-sky-100 text-sky-800",
  assigned: "bg-indigo-100 text-indigo-800",
  in_treatment: "bg-orange-100 text-orange-800",
  stable: "bg-emerald-100 text-emerald-800",
  closed: "bg-slate-200 text-slate-700"
};
const ACTIVE_OPD_STATUSES = new Set(["pending", "accepted", "in_progress"]);
const BILLING_STYLES = {
  pending: "bg-amber-100 text-amber-800",
  partial: "bg-sky-100 text-sky-800",
  paid: "bg-emerald-100 text-emerald-800"
};
const SEVERITY_PRESETS = [
  {
    key: "very_critical",
    label: "Level 5",
    range: "Critical",
    value: 5,
    activeClass: "border-rose-200 bg-rose-50 text-rose-700",
    idleClass: "border-slate-200 bg-white text-slate-600 hover:border-rose-200 hover:text-rose-700"
  },
  {
    key: "high",
    label: "Level 4",
    range: "High",
    value: 4,
    activeClass: "border-orange-200 bg-orange-50 text-orange-700",
    idleClass: "border-slate-200 bg-white text-slate-600 hover:border-orange-200 hover:text-orange-700"
  },
  {
    key: "medium",
    label: "Level 3",
    range: "Moderate",
    value: 3,
    activeClass: "border-amber-200 bg-amber-50 text-amber-700",
    idleClass: "border-slate-200 bg-white text-slate-600 hover:border-amber-200 hover:text-amber-700"
  },
  {
    key: "mild",
    label: "Level 2",
    range: "Mild",
    value: 2,
    activeClass: "border-cyan-200 bg-cyan-50 text-cyan-700",
    idleClass: "border-slate-200 bg-white text-slate-600 hover:border-cyan-200 hover:text-cyan-700"
  },
  {
    key: "low",
    label: "Level 1",
    range: "Low",
    value: 1,
    activeClass: "border-emerald-200 bg-emerald-50 text-emerald-700",
    idleClass: "border-slate-200 bg-white text-slate-600 hover:border-emerald-200 hover:text-emerald-700"
  }
];

export default function DashboardPage({ role }) {
  const router = useRouter();
  const refreshDashboardRef = useRef(null);
  const [state, setState] = useState({
    loading: true,
    refreshing: false,
    error: "",
    token: "",
    user: null,
    bootstrap: null,
    activeSection: "overview",
    themeMode: "system",
    selectedChatId: null,
    chatBody: "",
    notice: "",
    processingNotificationIds: [],
    processingSeverityKeys: [],
    downloadingPrescriptionKeys: []
  });

  useEffect(() => {
    const savedThemeMode = window.localStorage.getItem("portal-theme-mode");
    const nextMode = savedThemeMode || "system";
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const shouldDark = nextMode === "dark" || (nextMode === "system" && prefersDark);
    document.body.classList.toggle("theme-dark", shouldDark);
    setState((current) => ({
      ...current,
      themeMode: nextMode
    }));
  }, []);

  useEffect(() => {
    let ignore = false;

    async function loadDashboard() {
      const session = getStoredSession();

      if (!session?.token) {
        router.replace("/");
        return;
      }

      try {
        const me = await apiFetch("/auth/me", {
          token: session.token
        });

        if (ignore) {
          return;
        }

        if (me.user.role !== role) {
          router.replace(`/dashboard/${me.user.role}`);
          return;
        }

        const bootstrap = await apiFetch("/bootstrap", {
          token: session.token
        });

        if (ignore) {
          return;
        }

        const config = ROLE_CONFIGS[me.user.role] || ROLE_CONFIGS.patient;
        const queue = sortEmergencyQueue(bootstrap.emergencyQueue || []);

        saveStoredSession({
          token: session.token,
          user: me.user
        });

        setState((current) => ({
          ...current,
          loading: false,
          refreshing: false,
          error: "",
          token: session.token,
          user: me.user,
          bootstrap: {
            ...bootstrap,
            emergencyQueue: queue
          },
          activeSection: config.sections.includes(current.activeSection)
            ? current.activeSection
            : config.sections[0],
          selectedChatId: bootstrap.chats?.some((thread) => thread.id === current.selectedChatId)
            ? current.selectedChatId
            : bootstrap.chats?.[0]?.id || null
        }));
      } catch (error) {
        clearStoredSession();
        if (!ignore) {
          router.replace("/");
        }
      }
    }

    loadDashboard();

    return () => {
      ignore = true;
    };
  }, [role, router]);

  async function refreshDashboard(notice = "") {
    setState((current) => ({
      ...current,
      refreshing: true,
      error: ""
    }));

    const session = getStoredSession();

    if (!session?.token) {
      router.replace("/");
      return;
    }

    try {
      const bootstrap = await apiFetch("/bootstrap", {
        token: session.token
      });

      setState((current) => ({
        ...current,
        refreshing: false,
        token: session.token,
        error: "",
        bootstrap: {
          ...bootstrap,
          emergencyQueue: sortEmergencyQueue(bootstrap.emergencyQueue || [])
        },
        selectedChatId: bootstrap.chats?.some((thread) => thread.id === current.selectedChatId)
          ? current.selectedChatId
          : bootstrap.chats?.[0]?.id || null,
        notice,
        processingNotificationIds: [],
        processingSeverityKeys: [],
        downloadingPrescriptionKeys: []
      }));
    } catch (error) {
      setState((current) => ({
        ...current,
        refreshing: false,
        error: error.message
      }));
    }
  }

  refreshDashboardRef.current = refreshDashboard;

  useEffect(() => {
    if (state.loading || !state.token || !state.user) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      refreshDashboardRef.current?.();
    }, 10_000);

    return () => {
      window.clearInterval(timer);
    };
  }, [state.loading, state.token, state.user]);

  async function handleLogout() {
    const session = getStoredSession();

    if (session?.token) {
      await apiFetch("/auth/logout", {
        method: "POST",
        token: session.token
      }).catch(() => null);
    }

    clearStoredSession();
    router.replace("/");
  }

  async function handleMarkNotificationRead(notificationId) {
    if (state.processingNotificationIds.includes(notificationId)) {
      return;
    }

    setState((current) => ({
      ...current,
      error: "",
      processingNotificationIds: [...current.processingNotificationIds, notificationId]
    }));

    try {
      await apiFetch(`/notifications/${notificationId}/read`, {
        method: "PATCH",
        token: state.token
      });
      await wait(220);
      await refreshDashboard("Notification updated.");
    } catch (error) {
      setState((current) => ({
        ...current,
        processingNotificationIds: current.processingNotificationIds.filter((id) => id !== notificationId),
        error: error.message
      }));
    }
  }

  async function handleMarkAllNotificationsRead() {
    const unreadIds = (state.bootstrap?.notifications || [])
      .filter((item) => !item.isRead)
      .map((item) => item.id);

    if (!unreadIds.length) {
      return;
    }

    setState((current) => ({
      ...current,
      error: "",
      processingNotificationIds: unreadIds
    }));

    try {
      await apiFetch("/notifications/read-all", {
        method: "POST",
        token: state.token
      });
      await wait(260);
      await refreshDashboard("All notifications marked as read.");
    } catch (error) {
      setState((current) => ({
        ...current,
        processingNotificationIds: [],
        error: error.message
      }));
    }
  }

  async function handleAppointmentSeverityChange(appointmentId, severity) {
    const key = `appointment:${appointmentId}`;

    if (state.processingSeverityKeys.includes(key)) {
      return;
    }

    setState((current) => ({
      ...current,
      error: "",
      processingSeverityKeys: [...current.processingSeverityKeys, key]
    }));

    try {
      await apiFetch(`/appointments/${appointmentId}`, {
        method: "PATCH",
        token: state.token,
        body: { severity }
      });
      await refreshDashboard(
        `Appointment severity changed to ${formatSeverityTierLabel(severity)}.`
      );
    } catch (error) {
      setState((current) => ({
        ...current,
        processingSeverityKeys: current.processingSeverityKeys.filter((item) => item !== key),
        error: error.message
      }));
    }
  }

  async function handleEmergencySeverityChange(emergencyId, severity) {
    const key = `emergency:${emergencyId}`;

    if (state.processingSeverityKeys.includes(key)) {
      return;
    }

    setState((current) => ({
      ...current,
      error: "",
      processingSeverityKeys: [...current.processingSeverityKeys, key]
    }));

    try {
      await apiFetch(`/emergency/${emergencyId}`, {
        method: "PATCH",
        token: state.token,
        body: { severity }
      });
      await refreshDashboard(
        `Emergency severity changed to ${formatSeverityTierLabel(severity)}.`
      );
    } catch (error) {
      setState((current) => ({
        ...current,
        processingSeverityKeys: current.processingSeverityKeys.filter((item) => item !== key),
        error: error.message
      }));
    }
  }

  async function handleCreateAppointment(payload) {
    try {
      await apiFetch("/appointments", {
        method: "POST",
        token: state.token,
        body: payload
      });
      await refreshDashboard("Appointment booked successfully.");
      return { success: true };
    } catch (error) {
      setState((current) => ({
        ...current,
        error: error.message
      }));

      return {
        success: false,
        error: error.message
      };
    }
  }

  async function handleSendChat(event) {
    event.preventDefault();

    const selectedChat = getSelectedChat(state.bootstrap?.chats || [], state.selectedChatId);
    if (!selectedChat || !state.chatBody.trim()) {
      return;
    }

    const recipientId =
      state.user.role === "doctor" ? selectedChat.patient.id : selectedChat.doctor.id;

    try {
      await apiFetch("/chat/send", {
        method: "POST",
        token: state.token,
        body: {
          recipientId,
          body: state.chatBody.trim()
        }
      });

      setState((current) => ({
        ...current,
        chatBody: ""
      }));

      await refreshDashboard("Message sent.");
    } catch (error) {
      setState((current) => ({
        ...current,
        error: error.message
      }));
    }
  }

  async function handlePrescriptionDownload(prescriptionId, format, fallbackTitle) {
    const key = `${prescriptionId}:${format}`;

    if (state.downloadingPrescriptionKeys.includes(key)) {
      return;
    }

    setState((current) => ({
      ...current,
      error: "",
      downloadingPrescriptionKeys: [...current.downloadingPrescriptionKeys, key]
    }));

    try {
      const { blob, filename } = await apiDownload(
        `/prescriptions/${prescriptionId}/export/${format}`,
        { token: state.token }
      );
      const href = window.URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = href;
      link.download =
        filename ||
        `${sanitizeClientFilename(fallbackTitle || `prescription-${prescriptionId}`)}.${
          format === "excel" ? "xls" : "pdf"
        }`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(href);

      setState((current) => ({
        ...current,
        downloadingPrescriptionKeys: current.downloadingPrescriptionKeys.filter(
          (item) => item !== key
        ),
        notice: `Prescription downloaded as ${format === "excel" ? "Excel sheet" : "PDF"}.`
      }));
    } catch (error) {
      setState((current) => ({
        ...current,
        downloadingPrescriptionKeys: current.downloadingPrescriptionKeys.filter(
          (item) => item !== key
        ),
        error: error.message
      }));
    }
  }

  async function handleUserUpdate(userId, payload) {
    try {
      await apiFetch(`/users/${userId}`, {
        method: "PATCH",
        token: state.token,
        body: payload
      });
      await refreshDashboard("User updated successfully.");
      return { success: true };
    } catch (error) {
      setState((current) => ({ ...current, error: error.message }));
      return { success: false, error: error.message };
    }
  }

  async function handleUserDelete(userId) {
    try {
      await apiFetch(`/users/${userId}`, {
        method: "DELETE",
        token: state.token
      });
      await refreshDashboard("User deleted successfully.");
      return { success: true };
    } catch (error) {
      setState((current) => ({ ...current, error: error.message }));
      return { success: false, error: error.message };
    }
  }

  async function handleUserCreate(payload) {
    try {
      await apiFetch("/users", {
        method: "POST",
        token: state.token,
        body: payload
      });
      await refreshDashboard("User created successfully.");
      return { success: true };
    } catch (error) {
      setState((current) => ({ ...current, error: error.message }));
      return { success: false, error: error.message };
    }
  }

  async function handleAdmissionShiftUpdate(admissionId, shiftedTo) {
    try {
      await apiFetch(`/admissions/${admissionId}/shift`, {
        method: "PATCH",
        token: state.token,
        body: { shiftedTo }
      });
      await refreshDashboard("Patient shift location updated.");
    } catch (error) {
      setState((current) => ({
        ...current,
        error: error.message
      }));
    }
  }

  function handleThemeModeChange(nextMode) {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const shouldDark = nextMode === "dark" || (nextMode === "system" && prefersDark);
    document.body.classList.toggle("theme-dark", shouldDark);
    window.localStorage.setItem("portal-theme-mode", nextMode);
    setState((current) => ({
      ...current,
      themeMode: nextMode
    }));
  }

  if (state.loading) {
    return (
      <div className="page-wrap py-12">
        <div className="panel grid min-h-[60vh] place-items-center p-10">
          <div className="space-y-3 text-center">
            <p className="eyebrow">Preparing workspace</p>
            <h1 className="text-3xl font-semibold text-slate-950">Loading dashboard</h1>
            <p className="text-sm text-slate-600">
              Connecting your role-specific hospital view and live bootstrap data.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!state.user || !state.bootstrap) {
    return (
      <div className="page-wrap py-12">
        <div className="panel p-10 text-center">
          <p className="eyebrow">Session required</p>
          <h1 className="mt-3 text-3xl font-semibold text-slate-950">Unable to load dashboard</h1>
          <p className="mt-3 text-sm text-slate-600">{state.error || "Please sign in again."}</p>
          <button className="btn-primary mt-6" onClick={() => router.replace("/")} type="button">
            Back to login
          </button>
        </div>
      </div>
    );
  }

  const config = ROLE_CONFIGS[state.user.role] || ROLE_CONFIGS.patient;
  const unreadCount = (state.bootstrap.notifications || []).filter((item) => !item.isRead).length;
  const activeSectionLabel = SECTION_LABELS[state.activeSection];

  return (
    <div className="page-wrap space-y-6 py-6 pb-14">
      <div className="grid gap-6 xl:grid-cols-[280px,1fr]">
        <aside className="panel h-fit p-6 xl:sticky xl:top-6">
          <div className="mb-6 flex items-center gap-4">
            <div className="grid h-14 w-14 place-items-center rounded-[22px] bg-gradient-to-br from-sky-600 to-sky-800 text-white">
              <LogoMark />
            </div>
            <div>
              <p className="eyebrow">ABC Hospital</p>
              <h1 className="text-xl font-semibold text-slate-950">{config.label} Dashboard</h1>
            </div>
          </div>

          <p className="rounded-[24px] border border-sky-100 bg-sky-50/80 p-4 text-sm leading-7 text-slate-600">
            {config.description}
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <div className="auth-stat">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-700">
                Department
              </p>
              <p className="mt-3 text-lg font-semibold text-slate-950">
                {state.user.department || "General"}
              </p>
            </div>

            <div className="auth-stat">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-700">
                Workspace email
              </p>
              <p className="mt-3 break-all text-sm font-medium text-slate-700">{state.user.email}</p>
            </div>
          </div>

          <nav className="mt-6 space-y-2">
            {config.sections.map((section) => (
              <button
                key={section}
                className={`sidebar-link ${state.activeSection === section ? "active" : ""}`}
                onClick={() =>
                  setState((current) => ({
                    ...current,
                    activeSection: section,
                    notice: ""
                  }))
                }
                type="button"
              >
                <span>{SECTION_LABELS[section]}</span>
                <span className="text-xs uppercase tracking-[0.24em] opacity-70">
                  {String(config.sections.indexOf(section) + 1).padStart(2, "0")}
                </span>
              </button>
            ))}
          </nav>

          <div className="mt-6 space-y-3 rounded-[26px] bg-slate-950 px-5 py-5 text-white">
            <p className="eyebrow text-sky-200">Live access</p>
            <h2 className="text-xl font-semibold">{state.user.name}</h2>
            <p className="text-sm leading-7 text-slate-300">{config.subtitle}</p>
            <div className="flex flex-wrap gap-2">
              <span className="chip border-white/10 bg-white/10 text-white">
                {formatRole(state.user.role)}
              </span>
              <span className="chip border-white/10 bg-white/10 text-white">
                {unreadCount} unread alerts
              </span>
            </div>
          </div>
        </aside>

        <main className="space-y-6">
          <header className="panel overflow-hidden p-0">
            <div className="bg-gradient-to-r from-slate-950 via-sky-900 to-cyan-600 px-6 py-6 text-white">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                <div className="space-y-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-sky-100/80">
                    {config.label} workspace
                  </p>
                  <h2 className="text-3xl font-semibold md:text-4xl">{state.user.name}</h2>
                  <p className="max-w-3xl text-sm leading-7 text-sky-50/85">
                    {state.bootstrap.summary.headline}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <select
                    className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white outline-none"
                    onChange={(event) => handleThemeModeChange(event.target.value)}
                    value={state.themeMode}
                  >
                    <option className="text-slate-900" value="system">
                      Theme: System
                    </option>
                    <option className="text-slate-900" value="light">
                      Theme: Light
                    </option>
                    <option className="text-slate-900" value="dark">
                      Theme: Dark
                    </option>
                  </select>
                  <span className="rounded-full bg-white/14 px-4 py-2 text-sm font-semibold text-white backdrop-blur-md">
                    {config.subtitle}
                  </span>
                  <button className="btn-secondary" onClick={() => refreshDashboard()} type="button">
                    {state.refreshing ? "Refreshing..." : "Refresh"}
                  </button>
                  <button
                    className="rounded-full border border-white/16 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/16"
                    onClick={handleLogout}
                    type="button"
                  >
                    Logout
                  </button>
                </div>
              </div>

              <div className="mt-6 grid gap-3 md:grid-cols-3">
                <div className="rounded-[24px] border border-white/16 bg-white/10 p-4 backdrop-blur-md">
                  <p className="text-xs font-semibold uppercase tracking-[0.26em] text-sky-100/78">
                    Active section
                  </p>
                  <p className="mt-3 text-xl font-semibold">{activeSectionLabel}</p>
                </div>
                <div className="rounded-[24px] border border-white/16 bg-white/10 p-4 backdrop-blur-md">
                  <p className="text-xs font-semibold uppercase tracking-[0.26em] text-sky-100/78">
                    Auto refresh
                  </p>
                  <p className="mt-3 text-xl font-semibold">10 sec</p>
                </div>
                <div className="rounded-[24px] border border-white/16 bg-white/10 p-4 backdrop-blur-md">
                  <p className="text-xs font-semibold uppercase tracking-[0.26em] text-sky-100/78">
                    Workspace modules
                  </p>
                  <p className="mt-3 text-xl font-semibold">{config.sections.length}</p>
                </div>
              </div>
            </div>

            <div className="space-y-5 px-6 py-6">
              {state.notice ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  {state.notice}
                </div>
              ) : null}

              {state.error ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {state.error}
                </div>
              ) : null}
            </div>
          </header>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {(state.bootstrap.summary.cards || []).map((card) => (
              <article key={card.label} className="summary-card relative overflow-hidden">
                <div className="pointer-events-none absolute right-0 top-0 h-24 w-24 rounded-full bg-sky-100/70 blur-2xl" />
                <p className="eyebrow">{card.label}</p>
                <h3 className="mt-3 text-4xl font-semibold text-slate-950">{card.value}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">{card.helper}</p>
              </article>
            ))}
          </section>

          <section className="panel p-6">
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="eyebrow">Section view</p>
                <h3 className="mt-2 text-2xl font-semibold text-slate-950">{activeSectionLabel}</h3>
              </div>
              <p className="max-w-2xl text-sm leading-7 text-slate-600">
                A Medilo-inspired surface built on top of the existing hospital APIs, now without the
                browser-side WebAssembly dependency.
              </p>
            </div>

            <SectionRenderer
              activeSection={state.activeSection}
              bootstrap={state.bootstrap}
              chatBody={state.chatBody}
              onAppointmentSeverityChange={handleAppointmentSeverityChange}
              onCreateAppointment={handleCreateAppointment}
              onOpenChatFromAppointment={(appointment) => {
                const targetThread = (state.bootstrap?.chats || []).find(
                  (thread) => thread.patient.id === appointment.patient.id
                );
                setState((current) => ({
                  ...current,
                  activeSection: "chat",
                  selectedChatId: targetThread?.id || current.selectedChatId
                }));
              }}
              onChatBodyChange={(value) =>
                setState((current) => ({
                  ...current,
                  chatBody: value
                }))
              }
              onChatSelect={(chatId) =>
                setState((current) => ({
                  ...current,
                  selectedChatId: chatId
                }))
              }
              onEmergencySeverityChange={handleEmergencySeverityChange}
              onAdmissionShiftUpdate={handleAdmissionShiftUpdate}
              onMarkAllNotificationsRead={handleMarkAllNotificationsRead}
              onMarkNotificationRead={handleMarkNotificationRead}
              onPrescriptionDownload={handlePrescriptionDownload}
              onSendChat={handleSendChat}
              onUserCreate={handleUserCreate}
              onUserDelete={handleUserDelete}
              onUserUpdate={handleUserUpdate}
              processingNotificationIds={state.processingNotificationIds}
              downloadingPrescriptionKeys={state.downloadingPrescriptionKeys}
              processingSeverityKeys={state.processingSeverityKeys}
              selectedChatId={state.selectedChatId}
              user={state.user}
            />
          </section>
        </main>
      </div>
    </div>
  );
}

function SectionRenderer({
  activeSection,
  bootstrap,
  chatBody,
  onAppointmentSeverityChange,
  onCreateAppointment,
  onChatBodyChange,
  onChatSelect,
  onOpenChatFromAppointment,
  onEmergencySeverityChange,
  onAdmissionShiftUpdate,
  onMarkAllNotificationsRead,
  onMarkNotificationRead,
  onPrescriptionDownload,
  onSendChat,
  onUserCreate,
  onUserDelete,
  onUserUpdate,
  downloadingPrescriptionKeys,
  processingNotificationIds,
  processingSeverityKeys,
  selectedChatId,
  user
}) {
  if (activeSection === "overview") {
    return (
      <OverviewSection
        bootstrap={bootstrap}
        onAppointmentSeverityChange={onAppointmentSeverityChange}
        onCreateAppointment={onCreateAppointment}
        onEmergencySeverityChange={onEmergencySeverityChange}
        processingSeverityKeys={processingSeverityKeys}
        user={user}
      />
    );
  }

  if (activeSection === "appointments") {
    return (
      <AppointmentsSection
        appointments={bootstrap.appointments || []}
        doctors={bootstrap.doctors || []}
        onCreateAppointment={onCreateAppointment}
        onOpenChatFromAppointment={onOpenChatFromAppointment}
        onAppointmentSeverityChange={onAppointmentSeverityChange}
        patients={bootstrap.patients || []}
        processingSeverityKeys={processingSeverityKeys}
        user={user}
      />
    );
  }

  if (activeSection === "admissions") {
    return (
      <AdmissionsSection
        admissions={bootstrap.admissions || []}
        onAdmissionShiftUpdate={onAdmissionShiftUpdate}
        prescriptions={bootstrap.prescriptions || []}
        user={user}
      />
    );
  }

  if (activeSection === "billing") {
    return <BillingSection records={bootstrap.billingRecords || []} />;
  }

  if (activeSection === "queue") {
    return (
      <QueueSection
        onEmergencySeverityChange={onEmergencySeverityChange}
        processingSeverityKeys={processingSeverityKeys}
        queue={bootstrap.emergencyQueue || []}
        user={user}
      />
    );
  }

  if (activeSection === "opd") {
    return <OpdQueueSection appointments={bootstrap.appointments || []} />;
  }

  if (activeSection === "chat") {
    return (
      <ChatSection
        chatBody={chatBody}
        chats={bootstrap.chats || []}
        onChatBodyChange={onChatBodyChange}
        onChatSelect={onChatSelect}
        onSendChat={onSendChat}
        selectedChatId={selectedChatId}
        user={user}
      />
    );
  }

  if (activeSection === "prescriptions") {
    return (
      <PrescriptionsSection
        downloadingPrescriptionKeys={downloadingPrescriptionKeys}
        onPrescriptionDownload={onPrescriptionDownload}
        prescriptions={bootstrap.prescriptions || []}
        user={user}
      />
    );
  }

  if (activeSection === "users") {
    return (
      <UsersSection
        onUserCreate={onUserCreate}
        onUserDelete={onUserDelete}
        onUserUpdate={onUserUpdate}
        user={user}
        users={bootstrap.users || []}
      />
    );
  }

  if (activeSection === "patients") {
    return <PatientsSection patients={bootstrap.patients || []} />;
  }

  if (activeSection === "reports") {
    return <ReportsSection reports={bootstrap.reports} />;
  }

  if (activeSection === "notifications") {
    return (
      <NotificationsSection
        notifications={bootstrap.notifications || []}
        onMarkAllNotificationsRead={onMarkAllNotificationsRead}
        onMarkNotificationRead={onMarkNotificationRead}
        processingNotificationIds={processingNotificationIds}
      />
    );
  }

  return <EmptyState message="This section is not available for your role." />;
}

function OverviewSection({
  bootstrap,
  onAppointmentSeverityChange,
  onCreateAppointment,
  onEmergencySeverityChange,
  processingSeverityKeys,
  user
}) {
  const appointments = (bootstrap.appointments || []).slice(0, 3);
  const emergencies = (bootstrap.emergencyQueue || []).slice(0, 3);
  const notifications = (bootstrap.notifications || []).slice(0, 3);
  const admissions = (bootstrap.admissions || []).slice(0, 3);
  const billingRecords = (bootstrap.billingRecords || []).slice(0, 3);
  const opdGroups = buildOpdQueueGroups(bootstrap.appointments || []).slice(0, 3);

  if (user.role === "nurse") {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 lg:grid-cols-2">
          <article className="info-card">
            <p className="eyebrow">Recommended next steps</p>
            <ul className="mt-4 space-y-3">
              {(bootstrap.summary.tasks || []).map((task) => (
                <li
                  key={task}
                  className="rounded-2xl border border-slate-100 bg-white/90 px-4 py-3 text-sm text-slate-700"
                >
                  {task}
                </li>
              ))}
            </ul>
          </article>

          <article className="info-card">
            <div className="mb-4">
              <p className="eyebrow">Ward snapshot</p>
              <h4 className="mt-2 text-xl font-semibold text-slate-900">Admitted patients</h4>
            </div>
            <div className="card-stack">
              {admissions.length ? (
                admissions.map((admission) => (
                  <article
                    key={admission.id}
                    className="rounded-[22px] border border-slate-100 bg-white/90 px-4 py-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-900">{admission.patient.name}</p>
                        <p className="mt-1 text-sm text-slate-500">
                          {admission.roomLabel || "Ward room not assigned"}
                        </p>
                      </div>
                      <span className={`status-pill ${severityClass(admission.status === "under_observation" ? 3 : 1)}`}>
                        {admission.status.replace(/_/g, " ")}
                      </span>
                    </div>
                  </article>
                ))
              ) : (
                <EmptyState message="No admitted patients are active right now." />
              )}
            </div>
          </article>
        </div>

        <AdmissionsSection admissions={bootstrap.admissions || []} prescriptions={bootstrap.prescriptions || []} />
      </div>
    );
  }

  if (user.role === "receptionist") {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 lg:grid-cols-2">
          <article className="info-card">
            <p className="eyebrow">Recommended next steps</p>
            <ul className="mt-4 space-y-3">
              {(bootstrap.summary.tasks || []).map((task) => (
                <li
                  key={task}
                  className="rounded-2xl border border-slate-100 bg-white/90 px-4 py-3 text-sm text-slate-700"
                >
                  {task}
                </li>
              ))}
            </ul>
          </article>

          <article className="info-card">
            <div className="mb-4">
              <p className="eyebrow">Live signal</p>
              <h4 className="mt-2 text-xl font-semibold text-slate-900">Front desk focus</h4>
            </div>
            <div className="card-stack">
              {billingRecords.length ? (
                billingRecords.map((record) => (
                  <article
                    key={record.id}
                    className="rounded-[22px] border border-slate-100 bg-white/90 px-4 py-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-900">{record.patient.name}</p>
                        <p className="mt-1 text-sm text-slate-500">{record.category}</p>
                      </div>
                      <span className={`status-pill ${BILLING_STYLES[record.status] || BILLING_STYLES.pending}`}>
                        {record.status}
                      </span>
                    </div>
                    <p className="mt-3 text-sm text-slate-600">{formatCurrency(record.amount)}</p>
                  </article>
                ))
              ) : notifications[0] ? (
                <div className="rounded-[24px] bg-slate-950 p-5 text-white">
                  <h4 className="text-lg font-semibold">{notifications[0].title}</h4>
                  <p className="mt-3 text-sm leading-7 text-slate-300">{notifications[0].body}</p>
                </div>
              ) : (
                <EmptyState message="No front-desk alerts are waiting right now." />
              )}
            </div>
          </article>
        </div>

        <div className="grid gap-4 xl:grid-cols-3">
          <article className="info-card xl:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="eyebrow">Upcoming OPD queue</p>
                <h4 className="mt-2 text-xl font-semibold text-slate-900">Next patient by doctor</h4>
              </div>
              <span className="chip">{opdGroups.length} doctors</span>
            </div>
            <div className="card-stack">
              {opdGroups.length ? (
                opdGroups.map((group) => (
                  <OpdQueueCard group={group} key={group.doctor.id} />
                ))
              ) : (
                <EmptyState message="No OPD queue is active right now." />
              )}
            </div>
          </article>

          <article className="info-card">
            <div className="mb-4">
              <p className="eyebrow">Billing pulse</p>
              <h4 className="mt-2 text-xl font-semibold text-slate-900">Pending collections</h4>
            </div>
            <div className="card-stack">
              {billingRecords.length ? (
                billingRecords.map((record) => (
                  <BillingCard key={record.id} record={record} />
                ))
              ) : (
                <EmptyState message="No billing records are waiting right now." />
              )}
            </div>
          </article>
        </div>
      </div>
    );
  }

  if (["patient", "receptionist"].includes(user.role)) {
    return (
      <div className="space-y-6">
        <AppointmentBookingCard
          doctors={bootstrap.doctors || []}
          onCreateAppointment={onCreateAppointment}
          patients={bootstrap.patients || []}
          user={user}
        />

        <div className="grid gap-4 lg:grid-cols-2">
          <article className="info-card">
            <p className="eyebrow">Recommended next steps</p>
            <ul className="mt-4 space-y-3">
              {(bootstrap.summary.tasks || []).map((task) => (
                <li
                  key={task}
                  className="rounded-2xl border border-slate-100 bg-white/90 px-4 py-3 text-sm text-slate-700"
                >
                  {task}
                </li>
              ))}
            </ul>
          </article>

          <article className="info-card">
            <p className="eyebrow">Live signal</p>
            {notifications[0] ? (
              <div className="mt-4 rounded-[24px] bg-slate-950 p-5 text-white">
                <h4 className="text-lg font-semibold">{notifications[0].title}</h4>
                <p className="mt-3 text-sm leading-7 text-slate-300">{notifications[0].body}</p>
              </div>
            ) : (
              <EmptyState message="No alerts are waiting right now." />
            )}
          </article>
        </div>

        <div className="grid gap-4 xl:grid-cols-3">
          <article className="info-card xl:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="eyebrow">Recent appointments</p>
                <h4 className="mt-2 text-xl font-semibold text-slate-900">Clinical schedule</h4>
              </div>
              <span className="chip">{appointments.length} items</span>
            </div>
            <div className="card-stack">
              {appointments.length ? (
                appointments.map((appointment) => (
                  <AppointmentCard
                    appointment={appointment}
                    key={appointment.id}
                    onSeverityChange={onAppointmentSeverityChange}
                    processingSeverityKeys={processingSeverityKeys}
                    user={user}
                  />
                ))
              ) : (
                <EmptyState message="No appointments are available." />
              )}
            </div>
          </article>

          <article className="info-card">
            <div className="mb-4">
              <p className="eyebrow">{user.role === "receptionist" ? "OPD pulse" : "Queue pulse"}</p>
              <h4 className="mt-2 text-xl font-semibold text-slate-900">
                {user.role === "receptionist" ? "Upcoming OPD flow" : "Emergency priority board"}
              </h4>
            </div>
            <div className="card-stack">
              {user.role === "receptionist" ? (
                buildOpdQueueGroups(bootstrap.appointments || []).length ? (
                  buildOpdQueueGroups(bootstrap.appointments || [])
                    .slice(0, 3)
                    .map((group) => <OpdQueueCard group={group} key={group.doctor.id} />)
                ) : (
                  <EmptyState message="No OPD queue is active right now." />
                )
              ) : emergencies.length ? (
                emergencies.map((entry) => (
                  <EmergencyCard
                    entry={entry}
                    key={entry.id}
                    onSeverityChange={onEmergencySeverityChange}
                    processingSeverityKeys={processingSeverityKeys}
                    user={user}
                  />
                ))
              ) : (
                <EmptyState message="No emergency cases are visible for this role." />
              )}
            </div>
          </article>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-2">
        <article className="info-card">
          <p className="eyebrow">Recommended next steps</p>
          <ul className="mt-4 space-y-3">
            {(bootstrap.summary.tasks || []).map((task) => (
              <li
                key={task}
                className="rounded-2xl border border-slate-100 bg-white/90 px-4 py-3 text-sm text-slate-700"
              >
                {task}
              </li>
            ))}
          </ul>
        </article>

        <article className="info-card">
          <p className="eyebrow">Live signal</p>
          {notifications[0] ? (
            <div className="mt-4 rounded-[24px] bg-slate-950 p-5 text-white">
              <h4 className="text-lg font-semibold">{notifications[0].title}</h4>
              <p className="mt-3 text-sm leading-7 text-slate-300">{notifications[0].body}</p>
            </div>
          ) : (
            <EmptyState message="No alerts are waiting right now." />
          )}
        </article>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <article className="info-card xl:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="eyebrow">Recent appointments</p>
              <h4 className="mt-2 text-xl font-semibold text-slate-900">Clinical schedule</h4>
            </div>
            <span className="chip">{appointments.length} items</span>
          </div>
          <div className="card-stack">
            {appointments.length ? (
              appointments.map((appointment) => (
                <AppointmentCard
                  appointment={appointment}
                  key={appointment.id}
                  onSeverityChange={onAppointmentSeverityChange}
                  processingSeverityKeys={processingSeverityKeys}
                  user={user}
                />
              ))
            ) : (
              <EmptyState message="No appointments are available." />
            )}
          </div>
        </article>

        <article className="info-card">
          <div className="mb-4">
            <p className="eyebrow">Queue pulse</p>
            <h4 className="mt-2 text-xl font-semibold text-slate-900">Emergency priority board</h4>
          </div>
          <div className="card-stack">
            {emergencies.length ? (
              emergencies.map((entry) => (
                <EmergencyCard
                  entry={entry}
                  key={entry.id}
                  onSeverityChange={onEmergencySeverityChange}
                  processingSeverityKeys={processingSeverityKeys}
                  user={user}
                />
              ))
            ) : (
              <EmptyState message="No emergency cases are visible for this role." />
            )}
          </div>
        </article>
      </div>
    </div>
  );
}

function AppointmentsSection({
  appointments,
  doctors,
  onCreateAppointment,
  onAppointmentSeverityChange,
  onOpenChatFromAppointment,
  patients,
  processingSeverityKeys,
  user
}) {
  return (
    <div className="space-y-6">
      {["patient", "receptionist"].includes(user.role) ? (
        <AppointmentBookingCard
          doctors={doctors}
          onCreateAppointment={onCreateAppointment}
          patients={patients}
          user={user}
        />
      ) : null}

      {appointments.length ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {appointments.map((appointment) => (
            <AppointmentCard
              appointment={appointment}
              key={appointment.id}
              detailed={user.role !== "receptionist"}
              onSeverityChange={onAppointmentSeverityChange}
              onOpenChatFromAppointment={onOpenChatFromAppointment}
              processingSeverityKeys={processingSeverityKeys}
              user={user}
            />
          ))}
        </div>
      ) : (
        <EmptyState message="No appointments matched this workspace." />
      )}
    </div>
  );
}

function AppointmentBookingCard({ doctors, onCreateAppointment, patients, user }) {
  const specializationOptions = getDoctorSpecializations(doctors);
  const [form, setForm] = useState(() => ({
    medicalField: String(doctors?.[0]?.specialization || doctors?.[0]?.department || "").trim(),
    doctorId: String(doctors?.[0]?.id || ""),
    patientId: String(patients?.[0]?.id || ""),
    appointmentDate: "",
    reason: "",
    symptoms: "",
    patientNotes: "",
    severity: "3"
  }));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const filteredDoctors = doctors.filter((doctor) => {
    if (!form.medicalField) {
      return true;
    }

    return normalizeFieldLabel(doctor.specialization || doctor.department) ===
      normalizeFieldLabel(form.medicalField);
  });

  useEffect(() => {
    setForm((current) => ({
      ...current,
      medicalField:
        current.medicalField ||
        String(doctors?.[0]?.specialization || doctors?.[0]?.department || "").trim(),
      doctorId:
        current.doctorId ||
        String(doctors?.[0]?.id || ""),
      patientId: current.patientId || String(patients?.[0]?.id || "")
    }));
  }, [doctors, patients]);

  useEffect(() => {
    if (
      form.doctorId &&
      filteredDoctors.some((doctor) => String(doctor.id) === String(form.doctorId))
    ) {
      return;
    }

    setForm((current) => ({
      ...current,
      doctorId: String(filteredDoctors?.[0]?.id || "")
    }));
  }, [filteredDoctors, form.doctorId]);

  async function handleSubmit(event) {
    event.preventDefault();
    setBusy(true);
    setMessage({ type: "", text: "" });

    const payload = {
      doctorId: Number(form.doctorId),
      appointmentDate: form.appointmentDate,
      medicalField: form.medicalField,
      reason: form.reason.trim(),
      symptoms: form.symptoms.trim(),
      patientNotes: form.patientNotes.trim(),
      severity: Number(form.severity)
    };

    if (user.role === "receptionist") {
      payload.patientId = Number(form.patientId);
    }

    const response = await onCreateAppointment?.(payload);

    if (response?.success) {
      setMessage({
        type: "success",
        text: "Appointment booked successfully."
      });
      setForm((current) => ({
        ...current,
        appointmentDate: "",
        reason: "",
        symptoms: "",
        patientNotes: "",
        severity: "3"
      }));
    } else {
      setMessage({
        type: "error",
        text: response?.error || "Unable to book the appointment."
      });
    }

    setBusy(false);
  }

  return (
    <article className="info-card">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Book appointment</p>
          <h4 className="mt-2 text-2xl font-semibold text-slate-900">
            {user.role === "receptionist"
              ? "Create a patient appointment from the front desk"
              : "Book your next doctor visit"}
          </h4>
        </div>
        <span className="chip bg-sky-50 text-sky-700">Visible here now</span>
      </div>

      {message.text ? (
        <div
          className={`mt-5 rounded-[22px] border px-4 py-3 text-sm ${
            message.type === "error"
              ? "border-rose-200 bg-rose-50 text-rose-700"
              : "border-emerald-200 bg-emerald-50 text-emerald-700"
          }`}
        >
          {message.text}
        </div>
      ) : null}

      <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Medical field</label>
            <select
              className="select-field"
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  medicalField: event.target.value
                }))
              }
              value={form.medicalField}
            >
              <option value="">Select field</option>
              {specializationOptions.map((field) => (
                <option key={field} value={field}>
                  {field}
                </option>
              ))}
            </select>
          </div>

          {user.role === "receptionist" ? (
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Patient</label>
              <select
                className="select-field"
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    patientId: event.target.value
                  }))
                }
                value={form.patientId}
              >
                <option value="">Select patient</option>
                {patients.map((patient) => (
                  <option key={patient.id} value={patient.id}>
                    {patient.name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Doctor</label>
            <select
              className="select-field"
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  doctorId: event.target.value
                }))
              }
              value={form.doctorId}
            >
              <option value="">Select doctor</option>
              {filteredDoctors.map((doctor) => (
                <option key={doctor.id} value={doctor.id}>
                  {doctor.name} {doctor.specialization ? `- ${doctor.specialization}` : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Appointment date & time</label>
            <input
              className="input-field"
              min={new Date().toISOString().slice(0, 16)}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  appointmentDate: event.target.value
                }))
              }
              type="datetime-local"
              value={form.appointmentDate}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Severity</label>
            <select
              className="select-field"
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  severity: event.target.value
                }))
              }
              value={form.severity}
            >
              <option value="1">Low</option>
              <option value="3">Medium</option>
              <option value="5">Critical</option>
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">Reason</label>
          <input
            className="input-field"
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                reason: event.target.value
              }))
            }
            placeholder="Cardiology review, follow-up, consultation..."
            value={form.reason}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Symptoms</label>
            <textarea
              className="textarea-field"
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  symptoms: event.target.value
                }))
              }
              placeholder="Describe the symptoms"
              value={form.symptoms}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Patient notes</label>
            <textarea
              className="textarea-field"
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  patientNotes: event.target.value
                }))
              }
              placeholder="Extra front-desk or patient details"
              value={form.patientNotes}
            />
          </div>
        </div>

        <button className="btn-primary" disabled={busy} type="submit">
          {busy ? "Booking..." : "Book appointment"}
        </button>
      </form>
    </article>
  );
}

function AdmissionsSection({ admissions, onAdmissionShiftUpdate, prescriptions, user }) {
  if (!admissions.length) {
    return <EmptyState message="No admitted patients are available in this workspace." />;
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {admissions.map((admission) => {
        const prescription = getPrescriptionByPatient(prescriptions, admission.patient.id);
        const medicines = prescription?.currentVersion?.medicines || [];

        return (
          <article className="info-card" key={admission.id}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="eyebrow">Ward room {admission.roomLabel || "TBD"}</p>
                <h4 className="mt-2 text-xl font-semibold text-slate-900">
                  {admission.patient.name}
                </h4>
              </div>
              <span className={`status-pill ${severityClass(admission.status === "under_observation" ? 3 : 1)}`}>
                {admission.status.replace(/_/g, " ")}
              </span>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <InfoRow label="Doctor" value={admission.doctor.name} />
              <InfoRow label="Admitted at" value={formatDateTime(admission.admittedAt)} />
              <InfoRow label="Visit reason" value={admission.appointment?.reason || "Ward follow-up"} />
              <InfoRow label="Contact" value={admission.patient.phone} />
              <InfoRow label="Shifted to" value={admission.shiftedTo || "Not shifted"} />
            </div>

            {["doctor", "nurse"].includes(user?.role) ? (
              <AdmissionShiftControl
                admissionId={admission.id}
                currentShiftedTo={admission.shiftedTo}
                onUpdate={onAdmissionShiftUpdate}
              />
            ) : null}

            <div className="mt-5 rounded-[22px] border border-slate-100 bg-white/90 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                Care notes
              </p>
              <p className="mt-2 text-sm leading-7 text-slate-700">
                {admission.careNotes || "No care notes added yet."}
              </p>
            </div>

            <div className="mt-5 rounded-[22px] border border-slate-100 bg-slate-50/80 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                  Doctor-prescribed doses
                </p>
                {prescription ? <span className="chip">v{prescription.currentVersionNumber}</span> : null}
              </div>
              <MedicineList medicines={medicines} />
            </div>
          </article>
        );
      })}
    </div>
  );
}

function QueueSection({ onEmergencySeverityChange, processingSeverityKeys, queue, user }) {
  if (!queue.length) {
    return (
      <EmptyState
        message={
          user.role === "patient"
            ? "No emergency queue entries are currently linked to your account."
            : "No emergency queue entries are visible right now."
        }
      />
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {queue.map((entry) => (
        <EmergencyCard
          entry={entry}
          key={entry.id}
          onSeverityChange={onEmergencySeverityChange}
          processingSeverityKeys={processingSeverityKeys}
          user={user}
        />
      ))}
    </div>
  );
}

function OpdQueueSection({ appointments }) {
  const groups = buildOpdQueueGroups(appointments);

  if (!groups.length) {
    return <EmptyState message="No OPD queue is active right now." />;
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {groups.map((group) => (
        <OpdQueueCard group={group} key={group.doctor.id} />
      ))}
    </div>
  );
}

function ChatSection({
  chatBody,
  chats,
  onChatBodyChange,
  onChatSelect,
  onSendChat,
  selectedChatId,
  user
}) {
  const selectedChat = getSelectedChat(chats, selectedChatId);

  if (!chats.length) {
    return <EmptyState message="No active doctor-patient conversations yet." />;
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[320px,1fr]">
      <aside className="space-y-3">
        {chats.map((thread) => {
          const peer = user.role === "doctor" ? thread.patient : thread.doctor;

          return (
            <button
              key={thread.id}
              className={`w-full rounded-[24px] border p-4 text-left transition ${
                selectedChat?.id === thread.id
                  ? "border-sky-200 bg-sky-50/80"
                  : "border-slate-200 bg-white/90 hover:border-sky-100 hover:bg-slate-50"
              }`}
              onClick={() => onChatSelect(thread.id)}
              type="button"
            >
              <p className="text-sm font-semibold text-slate-900">{peer.name}</p>
              <p className="mt-1 text-xs uppercase tracking-[0.24em] text-slate-400">
                {user.role === "doctor" ? "Patient" : peer.specialization || "Doctor"}
              </p>
              <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-600">
                {thread.latestMessage || "No messages yet."}
              </p>
            </button>
          );
        })}
      </aside>

      <div className="info-card">
        <div className="mb-4 flex items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <p className="eyebrow">Active thread</p>
            <h4 className="mt-2 text-xl font-semibold text-slate-900">
              {selectedChat
                ? user.role === "doctor"
                  ? selectedChat.patient.name
                  : selectedChat.doctor.name
                : "Conversation"}
            </h4>
          </div>
          {selectedChat?.doctor?.specialization ? (
            <span className="chip">{selectedChat.doctor.specialization}</span>
          ) : null}
        </div>

        <div className="max-h-[420px] space-y-3 overflow-y-auto pr-2">
          {selectedChat?.messages?.map((message) => {
            const mine = message.sender.id === user.id;

            return (
              <div
                key={message.id}
                className={`max-w-[85%] rounded-[22px] px-4 py-3 text-sm leading-7 ${
                  mine
                    ? "ml-auto bg-sky-600 text-white"
                    : "bg-slate-100 text-slate-700"
                }`}
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] opacity-70">
                  {mine ? "You" : message.sender.name}
                </p>
                <p className="mt-1">{message.body}</p>
                <p className="mt-2 text-[11px] opacity-70">{formatDateTime(message.createdAt)}</p>
              </div>
            );
          })}
        </div>

        <form className="mt-5 space-y-3" onSubmit={onSendChat}>
          <textarea
            className="textarea-field"
            onChange={(event) => onChatBodyChange(event.target.value)}
            placeholder="Type a message to continue the conversation..."
            value={chatBody}
          />
          <button className="btn-primary" type="submit">
            Send message
          </button>
        </form>
      </div>
    </div>
  );
}

function PrescriptionsSection({
  downloadingPrescriptionKeys,
  onPrescriptionDownload,
  prescriptions,
  user
}) {
  if (!prescriptions.length) {
    return <EmptyState message="No prescriptions are available for this workspace." />;
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {prescriptions.map((prescription) => (
        <article className="info-card" key={prescription.id}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="eyebrow">Prescription #{prescription.id}</p>
              <h4 className="mt-2 text-xl font-semibold text-slate-900">
                {prescription.title || "Prescription"}
              </h4>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="chip">v{prescription.currentVersionNumber}</span>
              {user.role === "patient" ? (
                <>
                  <button
                    className="btn-ghost rounded-full border border-slate-200 bg-white"
                    disabled={downloadingPrescriptionKeys.includes(`${prescription.id}:excel`)}
                    onClick={() =>
                      onPrescriptionDownload?.(prescription.id, "excel", prescription.title)
                    }
                    type="button"
                  >
                    {downloadingPrescriptionKeys.includes(`${prescription.id}:excel`)
                      ? "Downloading Excel..."
                      : "Download Excel"}
                  </button>
                  <button
                    className="btn-ghost rounded-full border border-slate-200 bg-white"
                    disabled={downloadingPrescriptionKeys.includes(`${prescription.id}:pdf`)}
                    onClick={() =>
                      onPrescriptionDownload?.(prescription.id, "pdf", prescription.title)
                    }
                    type="button"
                  >
                    {downloadingPrescriptionKeys.includes(`${prescription.id}:pdf`)
                      ? "Downloading PDF..."
                      : "Download PDF"}
                  </button>
                </>
              ) : null}
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <InfoRow label="Patient" value={prescription.patient.name} />
            <InfoRow label="Doctor" value={prescription.doctor.name} />
            <InfoRow label="Visit date" value={formatDateTime(prescription.appointmentDate)} />
            <InfoRow label="Reason" value={prescription.reason} />
          </div>

          <div className="mt-5 space-y-3">
            {(prescription.versions || []).slice(0, 3).map((version) => (
              <div
                key={version.id}
                className="rounded-[22px] border border-slate-100 bg-white/90 px-4 py-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold text-slate-900">Version {version.versionNumber}</p>
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-400">
                    {formatDate(version.createdAt)}
                  </p>
                </div>
                <p className="mt-3 text-sm leading-7 text-slate-700">
                  {version.changeSummary || "No change summary."}
                </p>
                <p className="mt-2 text-sm leading-7 text-slate-500">
                  {version.diagnosis || "Diagnosis not provided."}
                </p>
              </div>
            ))}
          </div>
        </article>
      ))}
    </div>
  );
}

function UsersSection({ onUserCreate, onUserDelete, onUserUpdate, user, users }) {
  const canManage = ["admin", "super_admin"].includes(user?.role);
  const canCreateDelete = user?.role === "super_admin";

  if (!users.length) {
    return <EmptyState message="No users are available in this access level." />;
  }

  return (
    <div className="space-y-4">
      {canCreateDelete ? <CreateUserCard onCreate={onUserCreate} /> : null}
      <div className="grid gap-4 lg:grid-cols-2">
      {users.map((item) => (
        <article className="info-card" key={item.id}>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="eyebrow">{formatRole(item.role)}</p>
              <h4 className="mt-2 text-xl font-semibold text-slate-900">{item.name}</h4>
            </div>
            <span className="chip">{item.department || "General"}</span>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <InfoRow label="Email" value={item.email} />
            <InfoRow label="Phone" value={item.phone} />
            <InfoRow label="Specialization" value={item.specialization || "Not assigned"} />
            <InfoRow label="Experience" value={`${item.experienceYears || 0} years`} />
          </div>
          {canManage && item.role === "doctor" ? (
            <EditDoctorCard onUpdate={onUserUpdate} target={item} />
          ) : null}
          {canCreateDelete && !["super_admin", "admin"].includes(item.role) ? (
            <button className="btn-ghost mt-4 rounded-full border border-rose-200 bg-rose-50 text-rose-700" onClick={() => onUserDelete?.(item.id)} type="button">
              Delete user
            </button>
          ) : null}
        </article>
      ))}
      </div>
    </div>
  );
}

function EditDoctorCard({ onUpdate, target }) {
  const [form, setForm] = useState({
    name: target.name || "",
    email: target.email || "",
    password: ""
  });

  return (
    <div className="mt-4 rounded-[22px] border border-slate-100 bg-slate-50/85 p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">Edit doctor access</p>
      <div className="mt-3 grid gap-2 md:grid-cols-3">
        <input className="input-field" onChange={(event) => setForm((c) => ({ ...c, name: event.target.value }))} placeholder="Doctor name" value={form.name} />
        <input className="input-field" onChange={(event) => setForm((c) => ({ ...c, email: event.target.value }))} placeholder="Doctor email" value={form.email} />
        <input className="input-field" onChange={(event) => setForm((c) => ({ ...c, password: event.target.value }))} placeholder="New password (optional)" value={form.password} />
      </div>
      <button className="btn-primary mt-3" onClick={() => onUpdate?.(target.id, form)} type="button">
        Update doctor
      </button>
    </div>
  );
}

function CreateUserCard({ onCreate }) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    role: "doctor",
    specialization: "",
    department: ""
  });

  return (
    <article className="info-card">
      <p className="eyebrow">Super admin controls</p>
      <h4 className="mt-2 text-xl font-semibold text-slate-900">Create new user</h4>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <input className="input-field" onChange={(event) => setForm((c) => ({ ...c, name: event.target.value }))} placeholder="Name" value={form.name} />
        <input className="input-field" onChange={(event) => setForm((c) => ({ ...c, email: event.target.value }))} placeholder="Email" value={form.email} />
        <input className="input-field" onChange={(event) => setForm((c) => ({ ...c, phone: event.target.value }))} placeholder="Phone" value={form.phone} />
        <input className="input-field" onChange={(event) => setForm((c) => ({ ...c, password: event.target.value }))} placeholder="Password" value={form.password} />
        <select className="select-field" onChange={(event) => setForm((c) => ({ ...c, role: event.target.value }))} value={form.role}>
          <option value="doctor">Doctor</option>
          <option value="nurse">Nurse</option>
          <option value="receptionist">Receptionist</option>
          <option value="patient">Patient</option>
          <option value="staff">Staff</option>
          <option value="admin">Admin</option>
        </select>
        <input className="input-field" onChange={(event) => setForm((c) => ({ ...c, specialization: event.target.value }))} placeholder="Specialization (doctor)" value={form.specialization} />
      </div>
      <button className="btn-primary mt-4" onClick={() => onCreate?.(form)} type="button">
        Create user
      </button>
    </article>
  );
}

function PatientsSection({ patients }) {
  if (!patients.length) {
    return <EmptyState message="No patient records are available yet." />;
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {patients.map((patient) => (
        <article className="info-card" key={patient.id}>
          <p className="eyebrow">Patient record</p>
          <h4 className="mt-2 text-xl font-semibold text-slate-900">{patient.name}</h4>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <InfoRow label="Email" value={patient.email} />
            <InfoRow label="Phone" value={patient.phone} />
            <InfoRow label="Department" value={patient.department || "General"} />
            <InfoRow label="Notes" value={patient.notes || "No notes added"} />
          </div>
        </article>
      ))}
    </div>
  );
}

function BillingSection({ records }) {
  if (!records.length) {
    return <EmptyState message="No billing records are available for this workspace." />;
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {records.map((record) => (
        <BillingCard key={record.id} record={record} detailed />
      ))}
    </div>
  );
}

function ReportsSection({ reports }) {
  if (!reports) {
    return <EmptyState message="Reporting is not available for this role." />;
  }

  const groups = [
    {
      title: "Role distribution",
      items: reports.roleDistribution || []
    },
    {
      title: "Appointment status",
      items: reports.appointmentStatus || []
    },
    {
      title: "Emergency severity",
      items: reports.emergencySeverity || []
    },
    {
      title: "Doctor load",
      items: reports.doctorLoad || []
    }
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {(reports.highlights || []).map((item) => (
          <article className="summary-card" key={item.label}>
            <p className="eyebrow">{item.label}</p>
            <h4 className="mt-3 text-4xl font-semibold text-slate-950">{item.value}</h4>
          </article>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {groups.map((group) => (
          <article className="info-card" key={group.title}>
            <p className="eyebrow">Analytics</p>
            <h4 className="mt-2 text-xl font-semibold text-slate-900">{group.title}</h4>

            <div className="mt-5 space-y-4">
              {group.items.map((item) => (
                <div key={item.label}>
                  <div className="mb-2 flex items-center justify-between text-sm text-slate-600">
                    <span>{item.label}</span>
                    <span className="font-semibold text-slate-900">{item.value}</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100">
                    <div
                      className="h-2 rounded-full bg-gradient-to-r from-sky-500 to-cyan-400"
                      style={{ width: `${Math.max(12, Math.min(100, item.value * 12))}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function NotificationsSection({
  notifications,
  onMarkAllNotificationsRead,
  onMarkNotificationRead,
  processingNotificationIds
}) {
  if (!notifications.length) {
    return <EmptyState message="No notifications are waiting right now." />;
  }

  const hasUnread = notifications.some((notification) => !notification.isRead);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="eyebrow">Alert stream</p>
          <h4 className="mt-2 text-xl font-semibold text-slate-900">Notification center</h4>
        </div>
        <button
          className={`btn-secondary ${processingNotificationIds.length ? "animate-pulse opacity-70" : ""}`}
          disabled={!hasUnread || Boolean(processingNotificationIds.length)}
          onClick={onMarkAllNotificationsRead}
          type="button"
        >
          Mark all as read
        </button>
      </div>

      <div className="grid gap-4">
        {notifications.map((notification) => {
          const isProcessing = processingNotificationIds.includes(notification.id);

          return (
          <article
            className={`info-card transition duration-300 ${
              isProcessing ? "translate-x-2 scale-[0.98] opacity-55" : "opacity-100"
            }`}
            key={notification.id}
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`status-pill ${severityClass(notification.severity)}`}>
                    {notification.severity}
                  </span>
                  <span className="chip">{notification.type}</span>
                  {!notification.isRead ? <span className="chip bg-sky-50 text-sky-700">Unread</span> : null}
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-slate-900">{notification.title}</h4>
                  <p className="mt-2 text-sm leading-7 text-slate-600">{notification.body}</p>
                </div>
                <p className="text-xs uppercase tracking-[0.24em] text-slate-400">
                  {formatDateTime(notification.createdAt)}
                </p>
              </div>

              {!notification.isRead ? (
                <button
                  className={`btn-ghost rounded-full border border-slate-200 bg-white ${
                    isProcessing ? "animate-pulse" : ""
                  }`}
                  disabled={isProcessing}
                  onClick={() => onMarkNotificationRead(notification.id)}
                  type="button"
                >
                  {isProcessing ? "Reading..." : "Mark read"}
                </button>
              ) : null}
            </div>
          </article>
          );
        })}
      </div>
    </div>
  );
}

function AppointmentCard({
  appointment,
  detailed = false,
  onSeverityChange,
  onOpenChatFromAppointment,
  processingSeverityKeys = [],
  user
}) {
  const canEditSeverity = user?.role === "doctor";
  const severityKey = `appointment:${appointment.id}`;
  const isUpdatingSeverity = processingSeverityKeys.includes(severityKey);

  return (
    <article className="info-card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="eyebrow">{appointment.medicalField || "general"}</p>
          <h4 className="mt-2 text-xl font-semibold text-slate-900">{appointment.reason}</h4>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`status-pill ${APPOINTMENT_STYLES[appointment.status] || "bg-slate-100 text-slate-700"}`}>
            {appointment.status.replace(/_/g, " ")}
          </span>
          {appointment.queueRank ? <span className="chip">Queue #{appointment.queueRank}</span> : null}
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <InfoRow label="Patient" value={appointment.patient.name} />
        <InfoRow label="Doctor" value={appointment.doctor.name} />
        <InfoRow label="Visit time" value={formatDateTime(appointment.appointmentDate)} />
        <InfoRow label="Severity" value={`Level ${appointment.severity}`} />
      </div>

      {detailed ? (
        <div className="mt-5 rounded-[22px] border border-slate-100 bg-white/90 p-4">
          <p className="text-sm leading-7 text-slate-600">
            <span className="font-semibold text-slate-900">Symptoms:</span>{" "}
            {appointment.symptoms || "No symptoms provided."}
          </p>
          <p className="mt-2 text-sm leading-7 text-slate-600">
            <span className="font-semibold text-slate-900">Notes:</span>{" "}
            {appointment.patientNotes || appointment.decisionNotes || "No notes added."}
          </p>
        </div>
      ) : null}

      {canEditSeverity ? (
        <button
          className="btn-secondary mt-4"
          onClick={() => onOpenChatFromAppointment?.(appointment)}
          type="button"
        >
          Open chat with {appointment.patient.name}
        </button>
      ) : null}

      {canEditSeverity ? (
        <SeverityControl
          currentSeverity={appointment.severity}
          isBusy={isUpdatingSeverity}
          label="Doctor severity control"
          onChange={(severity) => onSeverityChange?.(appointment.id, severity)}
        />
      ) : null}
    </article>
  );
}

function EmergencyCard({ entry, onSeverityChange, processingSeverityKeys = [], user }) {
  const canEditSeverity = user?.role === "doctor";
  const severityKey = `emergency:${entry.id}`;
  const isUpdatingSeverity = processingSeverityKeys.includes(severityKey);

  return (
    <article className="info-card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="eyebrow">Queue rank #{entry.queueRank}</p>
          <h4 className="mt-2 text-xl font-semibold text-slate-900">{entry.patientName}</h4>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`status-pill ${EMERGENCY_STYLES[entry.status] || "bg-slate-100 text-slate-700"}`}>
            {entry.status.replace(/_/g, " ")}
          </span>
          <span className={`status-pill ${severityClass(entry.severity)}`}>Severity {entry.severity}</span>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <InfoRow label="Symptoms" value={entry.symptoms} />
        <InfoRow label="Added by" value={entry.addedBy.name} />
        <InfoRow label="Assigned doctor" value={entry.assignedDoctor?.name || "Not assigned"} />
        <InfoRow label="Assigned nurse" value={entry.assignedNurse?.name || "Not assigned"} />
      </div>

      {canEditSeverity ? (
        <SeverityControl
          currentSeverity={entry.severity}
          isBusy={isUpdatingSeverity}
          label="Doctor severity control"
          onChange={(severity) => onSeverityChange?.(entry.id, severity)}
        />
      ) : null}
    </article>
  );
}

function SeverityControl({ currentSeverity, isBusy, label, onChange }) {
  const activeTier = getSeverityTierKey(currentSeverity);

  return (
    <div className="mt-5 rounded-[22px] border border-slate-100 bg-slate-50/85 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
          {label}
        </p>
        <span className={`status-pill ${severityClass(currentSeverity)}`}>
          {formatSeverityTierLabel(currentSeverity)}
        </span>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-5">
        {SEVERITY_PRESETS.map((preset) => {
          const isActive = activeTier === preset.key;

          return (
            <button
              key={preset.key}
              className={`rounded-[18px] border px-4 py-3 text-left text-sm font-semibold transition ${
                isActive ? preset.activeClass : preset.idleClass
              } ${isBusy ? "opacity-70" : ""}`}
              disabled={isBusy || isActive}
              onClick={() => onChange?.(preset.value)}
              type="button"
            >
              <span className="block">{preset.label}</span>
              <span className="mt-1 block text-xs font-medium opacity-75">{preset.range}</span>
            </button>
          );
        })}
      </div>

      <p className="mt-3 text-xs leading-6 text-slate-500">
        {isBusy
          ? "Saving the new severity level..."
          : "Doctors can update patient severity directly from the dashboard."}
      </p>
    </div>
  );
}

function AdmissionShiftControl({ admissionId, currentShiftedTo, onUpdate }) {
  const [shiftedTo, setShiftedTo] = useState(currentShiftedTo || "");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setShiftedTo(currentShiftedTo || "");
  }, [currentShiftedTo]);

  async function handleUpdate() {
    if (!shiftedTo.trim()) {
      return;
    }

    setBusy(true);
    await onUpdate?.(admissionId, shiftedTo.trim());
    setBusy(false);
  }

  return (
    <div className="mt-4 rounded-[22px] border border-slate-100 bg-slate-50/85 p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
        Shift patient location
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <input
          className="input-field flex-1"
          onChange={(event) => setShiftedTo(event.target.value)}
          placeholder="Example: ICU-301 or OT-2"
          value={shiftedTo}
        />
        <button className="btn-primary" disabled={busy || !shiftedTo.trim()} onClick={handleUpdate} type="button">
          {busy ? "Updating..." : "Update shift"}
        </button>
      </div>
    </div>
  );
}

function OpdQueueCard({ group }) {
  return (
    <article className="info-card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="eyebrow">{group.doctor.specialization || "General OPD"}</p>
          <h4 className="mt-2 text-xl font-semibold text-slate-900">{group.doctor.name}</h4>
        </div>
        <span className="chip">
          {group.queue.length} patient{group.queue.length > 1 ? "s" : ""}
        </span>
      </div>

      <div className="mt-4 rounded-[22px] border border-sky-100 bg-sky-50/80 p-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-sky-700">
          Next patient
        </p>
        <p className="mt-2 text-lg font-semibold text-slate-900">{group.next.patient.name}</p>
        <p className="mt-1 text-sm text-slate-600">
          Queue #{group.next.queueRank || 1} · {formatDateTime(group.next.appointmentDate)}
        </p>
      </div>

      <div className="mt-5 space-y-3">
        {group.queue.map((appointment) => (
          <div
            className="rounded-[22px] border border-slate-100 bg-white/90 px-4 py-4"
            key={appointment.id}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-slate-900">{appointment.patient.name}</p>
                <p className="mt-1 text-sm text-slate-500">{appointment.reason}</p>
              </div>
              <span className="chip">
                {appointment.queueRank === 1 ? "Next" : `Queue #${appointment.queueRank}`}
              </span>
            </div>
            <p className="mt-3 text-sm text-slate-600">
              Slot: {formatDateTime(appointment.appointmentDate)}
            </p>
          </div>
        ))}
      </div>
    </article>
  );
}

function BillingCard({ record, detailed = false }) {
  return (
    <article className="info-card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="eyebrow">{record.category}</p>
          <h4 className="mt-2 text-xl font-semibold text-slate-900">{record.patient.name}</h4>
        </div>
        <span className={`status-pill ${BILLING_STYLES[record.status] || BILLING_STYLES.pending}`}>
          {record.status}
        </span>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <InfoRow label="Amount" value={formatCurrency(record.amount)} />
        <InfoRow label="Due date" value={formatDateTime(record.dueDate)} />
        <InfoRow label="Doctor" value={record.appointment?.doctorName || "Not assigned"} />
        <InfoRow label="Appointment" value={record.appointment?.reason || "Front desk charge"} />
      </div>

      {detailed ? (
        <div className="mt-5 rounded-[22px] border border-slate-100 bg-white/90 p-4">
          <p className="text-sm leading-7 text-slate-600">
            <span className="font-semibold text-slate-900">Created by:</span>{" "}
            {record.createdBy.name}
          </p>
          <p className="mt-2 text-sm leading-7 text-slate-600">
            <span className="font-semibold text-slate-900">Notes:</span>{" "}
            {record.notes || "No billing notes added."}
          </p>
        </div>
      ) : null}
    </article>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="rounded-[22px] border border-slate-100 bg-white/90 px-4 py-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">{label}</p>
      <p className="mt-2 text-sm leading-7 text-slate-700">{value || "Not available"}</p>
    </div>
  );
}

function EmptyState({ message }) {
  return (
    <div className="rounded-[26px] border border-dashed border-slate-200 bg-slate-50/90 px-5 py-10 text-center text-sm leading-7 text-slate-500">
      {message}
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

function getSelectedChat(chats, selectedChatId) {
  return chats.find((thread) => thread.id === selectedChatId) || chats[0] || null;
}

function severityClass(value) {
  if (value === "under_observation") {
    return "bg-amber-100 text-amber-800";
  }

  if (value === "admitted") {
    return "bg-emerald-100 text-emerald-800";
  }

  const severity = Number(value || 1);

  if (severity >= 4) {
    return "bg-rose-100 text-rose-800";
  }

  if (severity === 3) {
    return "bg-amber-100 text-amber-800";
  }

  return "bg-emerald-100 text-emerald-800";
}

function getSeverityTierKey(value) {
  const severity = Number(value || 1);

  if (severity >= 5) {
    return "very_critical";
  }

  if (severity >= 4) {
    return "high";
  }

  if (severity >= 3) {
    return "medium";
  }

  if (severity >= 2) {
    return "mild";
  }

  return "low";
}

function formatSeverityTierLabel(value) {
  const severity = Number(value || 1);
  const tier = getSeverityTierKey(value);

  if (tier === "very_critical") {
    return "Critical (Level 5)";
  }

  if (tier === "high") {
    return "High (Level 4)";
  }

  if (tier === "medium") {
    return "Medium (Level 3)";
  }

  if (tier === "mild") {
    return "Mild (Level 2)";
  }

  return `Low (Level ${severity})`;
}

function getPrescriptionByPatient(prescriptions, patientId) {
  return (prescriptions || []).find((item) => item.patient.id === patientId) || null;
}

function buildOpdQueueGroups(appointments) {
  const groups = new Map();

  (appointments || [])
    .filter((appointment) => ACTIVE_OPD_STATUSES.has(appointment.status))
    .forEach((appointment) => {
      const current = groups.get(appointment.doctor.id) || {
        doctor: appointment.doctor,
        queue: []
      };

      current.queue.push(appointment);
      groups.set(appointment.doctor.id, current);
    });

  return [...groups.values()]
    .map((group) => ({
      ...group,
      queue: group.queue
        .slice()
        .sort((left, right) => {
          if (Number(left.queueRank || 999) !== Number(right.queueRank || 999)) {
            return Number(left.queueRank || 999) - Number(right.queueRank || 999);
          }

          return new Date(left.appointmentDate) - new Date(right.appointmentDate);
        })
    }))
    .map((group) => ({
      ...group,
      next: group.queue[0]
    }))
    .sort((left, right) => new Date(left.next.appointmentDate) - new Date(right.next.appointmentDate));
}

function MedicineList({ medicines }) {
  if (!medicines.length) {
    return (
      <p className="mt-3 text-sm leading-7 text-slate-500">
        No active prescription doses are available yet.
      </p>
    );
  }

  return (
    <div className="mt-3 space-y-3">
      {medicines.map((medicine, index) => (
        <div
          className="rounded-[20px] border border-slate-100 bg-white px-4 py-3"
          key={`${medicine.name}-${index}`}
        >
          <p className="font-semibold text-slate-900">{medicine.name}</p>
          <p className="mt-1 text-sm text-slate-600">
            {medicine.dosage || "Dose not specified"} · {medicine.timing || "Timing not specified"}
          </p>
        </div>
      ))}
    </div>
  );
}

function wait(duration) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, duration);
  });
}

function getDoctorSpecializations(doctors) {
  return [...new Set((doctors || [])
    .map((doctor) => String(doctor.specialization || doctor.department || "").trim())
    .filter(Boolean))].sort((left, right) => left.localeCompare(right));
}

function normalizeFieldLabel(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function sanitizeClientFilename(value) {
  return String(value || "prescription")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "prescription";
}
