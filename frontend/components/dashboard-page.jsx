"use client";
import Loader from "./ui/loader";
import Activity from "lucide-react/dist/esm/icons/activity";
import SessionExpiry from "./ui/sessionExpiry";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { apiDownload, apiFetch } from "../lib/api";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import {
  ROLE_CONFIGS,
  SECTION_LABELS,
  formatCurrency,
  formatDate,
  formatDateTime,
  formatRole,
  sortEmergencyQueue,
} from "../lib/constants";
import {
  clearStoredSession,
  getStoredSession,
  saveStoredSession,
} from "../lib/session";

const APPOINTMENT_STYLES = {
  pending: "bg-amber-100 text-amber-800",
  accepted: "bg-emerald-100 text-emerald-800",
  rejected: "bg-rose-100 text-rose-800",
  in_progress: "bg-sky-100 text-sky-800",
  completed: "bg-slate-200 text-slate-700",
  cancelled: "bg-slate-100 text-slate-500",
};

const EMERGENCY_STYLES = {
  waiting: "bg-amber-100 text-amber-800",
  triaged: "bg-sky-100 text-sky-800",
  assigned: "bg-indigo-100 text-indigo-800",
  in_treatment: "bg-orange-100 text-orange-800",
  stable: "bg-emerald-100 text-emerald-800",
  closed: "bg-slate-200 text-slate-700",
};
const ACTIVE_OPD_STATUSES = new Set(["pending", "accepted", "in_progress"]);
const BILLING_STYLES = {
  pending: "bg-amber-100 text-amber-800",
  partial: "bg-sky-100 text-sky-800",
  paid: "bg-emerald-100 text-emerald-800",
};
const SEVERITY_PRESETS = [
  {
    key: "very_critical",
    label: "Level 5",
    range: "Critical",
    value: 5,
    activeClass: "border-rose-200 bg-rose-50 text-rose-700",
    idleClass:
      "border-slate-200 bg-white text-slate-600 hover:border-rose-200 hover:text-rose-700",
  },
  {
    key: "high",
    label: "Level 4",
    range: "High",
    value: 4,
    activeClass: "border-orange-200 bg-orange-50 text-orange-700",
    idleClass:
      "border-slate-200 bg-white text-slate-600 hover:border-orange-200 hover:text-orange-700",
  },
  {
    key: "medium",
    label: "Level 3",
    range: "Moderate",
    value: 3,
    activeClass: "border-amber-200 bg-amber-50 text-amber-700",
    idleClass:
      "border-slate-200 bg-white text-slate-600 hover:border-amber-200 hover:text-amber-700",
  },
  {
    key: "mild",
    label: "Level 2",
    range: "Mild",
    value: 2,
    activeClass: "border-cyan-200 bg-cyan-50 text-cyan-700",
    idleClass:
      "border-slate-200 bg-white text-slate-600 hover:border-cyan-200 hover:text-cyan-700",
  },
  {
    key: "low",
    label: "Level 1",
    range: "Low",
    value: 1,
    activeClass: "border-emerald-200 bg-emerald-50 text-emerald-700",
    idleClass:
      "border-slate-200 bg-white text-slate-600 hover:border-emerald-200 hover:text-emerald-700",
  },
];

export default function DashboardPage({ role }) {
  const router = useRouter();
  const refreshDashboardRef = useRef(null);
  const roleConfig = ROLE_CONFIGS[role];
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
    downloadingPrescriptionKeys: [],
  });

  useEffect(() => {
    if (roleConfig) {
      return;
    }

    clearStoredSession();
    router.replace("/");
  }, [roleConfig, router]);

  useEffect(() => {
    if (!roleConfig) {
      return undefined;
    }

    const savedThemeMode = window.localStorage.getItem("portal-theme-mode");
    const nextMode = savedThemeMode || "system";
    const prefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)",
    ).matches;
    const shouldDark =
      nextMode === "dark" || (nextMode === "system" && prefersDark);
    document.body.classList.toggle("theme-dark", shouldDark);
    setState((current) => ({
      ...current,
      themeMode: nextMode,
    }));
  }, [roleConfig]);

  useEffect(() => {
    if (!roleConfig) {
      return undefined;
    }

    let ignore = false;

    async function loadDashboard() {
      const session = getStoredSession();

      if (!session?.token) {
        router.replace("/");
        return;
      }

      try {
        const me = await apiFetch("/auth/me", {
          token: session.token,
        });

        if (ignore) {
          return;
        }

        if (me.user.role !== role) {
          router.replace(`/dashboard/${me.user.role}`);
          return;
        }

        const bootstrap = await apiFetch("/bootstrap", {
          token: session.token,
        });

        if (ignore) {
          return;
        }

        const config = ROLE_CONFIGS[me.user.role];

        if (!config) {
          clearStoredSession();
          router.replace("/");
          return;
        }
        const queue = sortEmergencyQueue(bootstrap.emergencyQueue || []);

        saveStoredSession({
          token: session.token,
          user: me.user,
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
            emergencyQueue: queue,
          },
          activeSection: config.sections.includes(current.activeSection)
            ? current.activeSection
            : config.sections[0],
          selectedChatId: bootstrap.chats?.some(
            (thread) => thread.id === current.selectedChatId,
          )
            ? current.selectedChatId
            : bootstrap.chats?.[0]?.id || null,
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
  }, [role, roleConfig, router]);

  async function refreshDashboard(notice = "") {
    setState((current) => ({
      ...current,
      refreshing: true,
      error: "",
    }));

    const session = getStoredSession();

    if (!session?.token) {
      router.replace("/");
      return;
    }

    try {
      const bootstrap = await apiFetch("/bootstrap", {
        token: session.token,
      });

      setState((current) => ({
        ...current,
        refreshing: false,
        token: session.token,
        error: "",
        bootstrap: {
          ...bootstrap,
          emergencyQueue: sortEmergencyQueue(bootstrap.emergencyQueue || []),
        },
        selectedChatId: bootstrap.chats?.some(
          (thread) => thread.id === current.selectedChatId,
        )
          ? current.selectedChatId
          : bootstrap.chats?.[0]?.id || null,
        notice,
        processingNotificationIds: [],
        processingSeverityKeys: [],
        downloadingPrescriptionKeys: [],
      }));
    } catch (error) {
      setState((current) => ({
        ...current,
        refreshing: false,
        error: error.message,
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
        token: session.token,
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
      processingNotificationIds: [
        ...current.processingNotificationIds,
        notificationId,
      ],
    }));

    try {
      await apiFetch(`/notifications/${notificationId}/read`, {
        method: "PATCH",
        token: state.token,
      });
      await wait(220);
      await refreshDashboard("Notification updated.");
    } catch (error) {
      setState((current) => ({
        ...current,
        processingNotificationIds: current.processingNotificationIds.filter(
          (id) => id !== notificationId,
        ),
        error: error.message,
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
      processingNotificationIds: unreadIds,
    }));

    try {
      await apiFetch("/notifications/read-all", {
        method: "POST",
        token: state.token,
      });
      await wait(260);
      await refreshDashboard("All notifications marked as read.");
    } catch (error) {
      setState((current) => ({
        ...current,
        processingNotificationIds: [],
        error: error.message,
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
      processingSeverityKeys: [...current.processingSeverityKeys, key],
    }));

    try {
      await apiFetch(`/appointments/${appointmentId}`, {
        method: "PATCH",
        token: state.token,
        body: { severity },
      });
      await refreshDashboard(
        `Appointment severity changed to ${formatSeverityTierLabel(severity)}.`,
      );
    } catch (error) {
      setState((current) => ({
        ...current,
        processingSeverityKeys: current.processingSeverityKeys.filter(
          (item) => item !== key,
        ),
        error: error.message,
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
      processingSeverityKeys: [...current.processingSeverityKeys, key],
    }));

    try {
      await apiFetch(`/emergency/${emergencyId}`, {
        method: "PATCH",
        token: state.token,
        body: { severity },
      });
      await refreshDashboard(
        `Emergency severity changed to ${formatSeverityTierLabel(severity)}.`,
      );
    } catch (error) {
      setState((current) => ({
        ...current,
        processingSeverityKeys: current.processingSeverityKeys.filter(
          (item) => item !== key,
        ),
        error: error.message,
      }));
    }
  }

  async function handleCreateAppointment(payload) {
    try {
      await apiFetch("/appointments", {
        method: "POST",
        token: state.token,
        body: payload,
      });
      await refreshDashboard("Appointment booked successfully.");
      return { success: true };
    } catch (error) {
      setState((current) => ({
        ...current,
        error: error.message,
      }));

      return {
        success: false,
        error: error.message,
      };
    }
  }

  async function handleSendChat(event) {
    event.preventDefault();

    const selectedChat = getSelectedChat(
      state.bootstrap?.chats || [],
      state.selectedChatId,
    );
    if (!selectedChat || !state.chatBody.trim()) {
      return;
    }

    const recipientId =
      state.user.role === "doctor"
        ? selectedChat.patient.id
        : selectedChat.doctor.id;

    try {
      await apiFetch("/chat/send", {
        method: "POST",
        token: state.token,
        body: {
          recipientId,
          body: state.chatBody.trim(),
        },
      });

      setState((current) => ({
        ...current,
        chatBody: "",
      }));

      await refreshDashboard("Message sent.");
    } catch (error) {
      setState((current) => ({
        ...current,
        error: error.message,
      }));
    }
  }

  async function handlePrescriptionDownload(
    prescriptionId,
    format,
    fallbackTitle,
  ) {
    const key = `${prescriptionId}:${format}`;

    if (state.downloadingPrescriptionKeys.includes(key)) {
      return;
    }

    setState((current) => ({
      ...current,
      error: "",
      downloadingPrescriptionKeys: [
        ...current.downloadingPrescriptionKeys,
        key,
      ],
    }));

    try {
      const { blob, filename } = await apiDownload(
        `/prescriptions/${prescriptionId}/export/${format}`,
        { token: state.token },
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
          (item) => item !== key,
        ),
        notice: `Prescription downloaded as ${format === "excel" ? "Excel sheet" : "PDF"}.`,
      }));
    } catch (error) {
      setState((current) => ({
        ...current,
        downloadingPrescriptionKeys: current.downloadingPrescriptionKeys.filter(
          (item) => item !== key,
        ),
        error: error.message,
      }));
    }
  }

  async function handleUserUpdate(userId, payload) {
    try {
      await apiFetch(`/users/${userId}`, {
        method: "PATCH",
        token: state.token,
        body: payload,
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
        token: state.token,
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
        body: payload,
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
        body: { shiftedTo },
      });
      await refreshDashboard("Patient shift location updated.");
    } catch (error) {
      setState((current) => ({
        ...current,
        error: error.message,
      }));
    }
  }

  function handleThemeModeChange(nextMode) {
    const prefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)",
    ).matches;
    const shouldDark =
      nextMode === "dark" || (nextMode === "system" && prefersDark);
    document.body.classList.toggle("theme-dark", shouldDark);
    window.localStorage.setItem("portal-theme-mode", nextMode);
    setState((current) => ({
      ...current,
      themeMode: nextMode,
    }));
  }

  if (state.loading) {
    return 
    <main className="h-screen items-center justify-center flex">
      <Loader />
    </main>;
  }

  if (!state.user || !state.bootstrap) {
    return <SessionExpiry />;
  }

  const config = ROLE_CONFIGS[state.user.role] || ROLE_CONFIGS.patient;
  const unreadCount = (state.bootstrap.notifications || []).filter(
    (item) => !item.isRead,
  ).length;
  const activeSectionLabel = SECTION_LABELS[state.activeSection];

  return (
    <div className="py-6 pb-14">
      <div className="grid gap-6 xl:grid-cols-[280px,1fr]">
        <header className="flex bg-none py-2 px-24 justify-between items-center">
          <div className="flex items-center justify-center gap-2">
            <span className="p-2 bg-blue-500 rounded-2xl">
              <Activity className="text-white" />
            </span>
            <div className="flex flex-col items-start">
              <h1 className="text-black text-2xl">Doctera</h1>
            </div>
          </div>

          <nav className="flex justify-center items-center gap-4">
            {config.sections.map((section) => (
              <button
                key={section}
                className={`p-2 text-sm flex gap-2 ${
  state.activeSection === section
    ? "text-blue-600 border-b-2 border-blue-600"
    : "text-black"
}`}
                onClick={() =>
                  setState((current) => ({
                    ...current,
                    activeSection: section,
                    notice: "",
                  }))
                }
                type="button"
              >
                <span>{SECTION_LABELS[section]}</span>
              </button>
            ))}
          </nav>

          <div className="flex flex-wrap items-center gap-2">
            <button
              className="border border-blue-500 text-blue-500 px-6 py-2 rounded-full"
              onClick={() => refreshDashboard()}
              type="button"
            >
              {state.refreshing ? "Refreshing..." : "Refresh"}
            </button>
            <button
              className="rounded-full border border-blue-500 bg-blue-500 px-6 py-2 text-white transition hover:scale-110 duration-300"
              onClick={handleLogout}
              type="button"
            >
              Logout
            </button>
          </div>
        </header>

        <main className="">
          <header className="max-w-6xl mx-auto">
            <div className="bg-neutral-100 rounded-2xl px-6 py-6 text-black">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                <div className="space-y-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-neutral-700">
                    {config.label} workspace
                  </p>
                  <h2 className="text-4xl md:text-4xl">{state.user.name}</h2>
                </div>
              </div>

              <div className="mt-6 grid gap-3 md:grid-cols-3">
                <div className="rounded-2xl flex flex-col gap-4 justify-between items-center bg-blue-500 p-4 backdrop-blur-md">
                  <p className="text-xs uppercase font-semibold tracking-[0.26em] text-white">
                    Active section
                  </p>
                  <p className="text-xl text-white">{activeSectionLabel}</p>
                </div>
                <div className="rounded-2xl flex flex-col gap-4 justify-between items-center border border-neutral-200 bg-white p-4 backdrop-blur-md">
                  <p className="text-xs uppercase font-semibold tracking-[0.26em] text-black">
                    Department
                  </p>
                  <p className="text-xl text-black">
                    {state.user.department || "General"}
                  </p>
                </div>
                <div className="rounded-2xl flex flex-col gap-4 justify-between items-center border border-neutral-200 bg-white p-4 backdrop-blur-md">
                  <p className="text-xs uppercase font-semibold tracking-[0.26em] text-black">
                    Workspace email
                  </p>
                  <p className="text-xl text-black">{state.user.email}</p>
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

          <section className="max-w-6xl mx-auto grid gap-8 md:grid-cols-2 xl:grid-cols-3">
            {(state.bootstrap.summary.cards || []).map((card) => (
              <div
                key={card.label}
                className="bg-neutral-100 border flex flex-col items-center justify-center border-neutral-200 p-6 rounded-2xl relative overflow-hidden"
              >
                <p className="eyebrow">{card.label}</p>
                <h3 className="mt-3 text-4xl font-semibold text-slate-950">
                  {card.value}
                </h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  {card.helper}
                </p>
              </div>
            ))}
            <div className="bg-blue-500 text-white border flex flex-col items-center justify-center border-neutral-200 p-6 rounded-2xl relative overflow-hidden">
              <p className="text-neutral-100">Current Section View</p>
              <p className="mt-3 text-2xl leading-7">{activeSectionLabel}</p>
            </div>
          </section>

          <section className="max-w-6xl mx-auto bg-neutral-100 p-6 rounded-2xl my-12 border border-neutral-200">
            <SectionRenderer
              activeSection={state.activeSection}
              bootstrap={state.bootstrap}
              chatBody={state.chatBody}
              onAppointmentSeverityChange={handleAppointmentSeverityChange}
              onCreateAppointment={handleCreateAppointment}
              onOpenChatFromAppointment={(appointment) => {
                const targetThread = (state.bootstrap?.chats || []).find(
                  (thread) => thread.patient.id === appointment.patient.id,
                );
                setState((current) => ({
                  ...current,
                  activeSection: "chat",
                  selectedChatId: targetThread?.id || current.selectedChatId,
                }));
              }}
              onChatBodyChange={(value) =>
                setState((current) => ({
                  ...current,
                  chatBody: value,
                }))
              }
              onChatSelect={(chatId) =>
                setState((current) => ({
                  ...current,
                  selectedChatId: chatId,
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
  user,
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
        appointments={bootstrap.appointments || []}
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
  user,
}) {
  const appointments = (bootstrap.appointments || []).slice(0, 3);
  const emergencies = (bootstrap.emergencyQueue || []).slice(0, 3);
  const notifications = (bootstrap.notifications || []).slice(0, 3);
  const admissions = (bootstrap.admissions || []).slice(0, 3);
  const billingRecords = (bootstrap.billingRecords || []).slice(0, 3);
  const opdGroups = buildOpdQueueGroups(bootstrap.appointments || []).slice(
    0,
    3,
  );

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
              <h4 className="mt-2 text-xl font-semibold text-slate-900">
                Admitted patients
              </h4>
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
                        <p className="font-semibold text-slate-900">
                          {admission.patient.name}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          {admission.roomLabel || "Ward room not assigned"}
                        </p>
                      </div>
                      <span
                        className={`status-pill ${severityClass(admission.status === "under_observation" ? 3 : 1)}`}
                      >
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

        <AdmissionsSection
          admissions={bootstrap.admissions || []}
          prescriptions={bootstrap.prescriptions || []}
        />
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
              <h4 className="mt-2 text-xl font-semibold text-slate-900">
                Front desk focus
              </h4>
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
                        <p className="font-semibold text-slate-900">
                          {record.patient.name}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          {record.category}
                        </p>
                      </div>
                      <span
                        className={`status-pill ${BILLING_STYLES[record.status] || BILLING_STYLES.pending}`}
                      >
                        {record.status}
                      </span>
                    </div>
                    <p className="mt-3 text-sm text-slate-600">
                      {formatCurrency(record.amount)}
                    </p>
                  </article>
                ))
              ) : notifications[0] ? (
                <div className="rounded-[24px] bg-slate-950 p-5 text-white">
                  <h4 className="text-lg font-semibold">
                    {notifications[0].title}
                  </h4>
                  <p className="mt-3 text-sm leading-7 text-slate-300">
                    {notifications[0].body}
                  </p>
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
                <h4 className="mt-2 text-xl font-semibold text-slate-900">
                  Next patient by doctor
                </h4>
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
              <h4 className="mt-2 text-xl font-semibold text-slate-900">
                Pending collections
              </h4>
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
                <h4 className="text-lg font-semibold">
                  {notifications[0].title}
                </h4>
                <p className="mt-3 text-sm leading-7 text-slate-300">
                  {notifications[0].body}
                </p>
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
                <h4 className="mt-2 text-xl font-semibold text-slate-900">
                  Clinical schedule
                </h4>
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
              <p className="eyebrow">
                {user.role === "receptionist" ? "OPD pulse" : "Queue pulse"}
              </p>
              <h4 className="mt-2 text-xl font-semibold text-slate-900">
                {user.role === "receptionist"
                  ? "Upcoming OPD flow"
                  : "Emergency priority board"}
              </h4>
            </div>
            <div className="card-stack">
              {user.role === "receptionist" ? (
                buildOpdQueueGroups(bootstrap.appointments || []).length ? (
                  buildOpdQueueGroups(bootstrap.appointments || [])
                    .slice(0, 3)
                    .map((group) => (
                      <OpdQueueCard group={group} key={group.doctor.id} />
                    ))
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
              <h4 className="text-lg font-semibold">
                {notifications[0].title}
              </h4>
              <p className="mt-3 text-sm leading-7 text-slate-300">
                {notifications[0].body}
              </p>
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
              <h4 className="mt-2 text-xl font-semibold text-slate-900">
                Clinical schedule
              </h4>
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
            <h4 className="mt-2 text-xl font-semibold text-slate-900">
              Emergency priority board
            </h4>
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
  user,
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

function AppointmentBookingCard({
  doctors,
  onCreateAppointment,
  patients,
  user,
}) {
  const specializationOptions = getDoctorSpecializations(doctors);
  const [form, setForm] = useState(() => ({
    medicalField: String(
      doctors?.[0]?.specialization || doctors?.[0]?.department || "",
    ).trim(),
    doctorId: String(doctors?.[0]?.id || ""),
    patientId: String(patients?.[0]?.id || ""),
    appointmentDate: "",
    reason: "",
    symptoms: "",
    patientNotes: "",
    gender: "",
    age: "",
    bloodGroup: "",
  }));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  
  const filteredDoctors = doctors.filter((doctor) => {
    if (!form.medicalField) return true;
    return (
      normalizeFieldLabel(doctor.specialization || doctor.department) ===
      normalizeFieldLabel(form.medicalField)
    );
  });

  useEffect(() => {
    setForm((current) => ({
      ...current,
      medicalField:
        current.medicalField ||
        String(doctors?.[0]?.specialization || doctors?.[0]?.department || "").trim(),
      doctorId: current.doctorId || String(doctors?.[0]?.id || ""),
      patientId: current.patientId || String(patients?.[0]?.id || ""),
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
      doctorId: String(filteredDoctors?.[0]?.id || ""),
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
      severity: 3,
      gender: form.gender,
      age: form.age ? Number(form.age) : null,
      bloodGroup: form.bloodGroup,
    };

    if (user.role === "receptionist") {
      payload.patientId = Number(form.patientId);
    }

    const response = await onCreateAppointment?.(payload);

    if (response?.success) {
      setMessage({
        type: "success",
        text: "Appointment booked successfully.",
      });
      setForm((current) => ({
        ...current,
        appointmentDate: "",
        reason: "",
        symptoms: "",
        patientNotes: "",
        gender: "",
        age: "",
        bloodGroup: "",
      }));
    } else {
      setMessage({
        type: "error",
        text: response?.error || "Unable to book the appointment.",
      });
    }

    setBusy(false);
  }

  return (
    <article className="rounded-xl border border-neutral-200 bg-white">
      {/* Header */}
      <div className="border-b border-slate-100 px-6 py-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Patient Intake Form
            </h2>
            <p className="mt-0.5 text-sm text-slate-500">
              Complete all sections below
            </p>
          </div>
          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
            New Visit
          </span>
        </div>
      </div>

      {/* Alert */}
      {message.text && (
        <div className="mx-6 mt-4">
          <div className={`rounded-lg border px-4 py-3 text-sm ${
            message.type === "error"
              ? "border-red-200 bg-red-50 text-red-800"
              : "border-emerald-200 bg-emerald-50 text-emerald-800"
          }`}>
            {message.text}
          </div>
        </div>
      )}

      <form className="p-6" onSubmit={handleSubmit}>
        {/* Section 1: Visit Information */}
        <div className="mb-6">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">
            1. Visit Information
          </h3>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Department *
              </label>
              <select
                required
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={form.medicalField}
                onChange={(e) => setForm((c) => ({ ...c, medicalField: e.target.value }))}
              >
                <option value="">Select department</option>
                {specializationOptions.map((field) => (
                  <option key={field} value={field}>{field}</option>
                ))}
              </select>
            </div>

            {user.role === "receptionist" && (
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Patient *
                </label>
                <select
                  required
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  value={form.patientId}
                  onChange={(e) => setForm((c) => ({ ...c, patientId: e.target.value }))}
                >
                  <option value="">Select patient</option>
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Physician *
              </label>
              <select
                required
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={form.doctorId}
                onChange={(e) => setForm((c) => ({ ...c, doctorId: e.target.value }))}
              >
                <option value="">Select physician</option>
                {filteredDoctors.map((doc) => (
                  <option key={doc.id} value={doc.id}>
                    Dr. {doc.name} {doc.specialization ? `(${doc.specialization})` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Appointment Date & Time *
              </label>
              <DatePicker
                selected={form.appointmentDate ? new Date(form.appointmentDate) : null}
                onChange={(date) => setForm((c) => ({ ...c, appointmentDate: date }))}
                showTimeSelect
                timeFormat="HH:mm"
                timeIntervals={15}
                dateFormat="MMMM d, yyyy h:mm aa"
                minDate={new Date()}
                placeholderText="Select date & time"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Patient Demographics */}
        <div className="mb-6 border-t border-slate-100 pt-6">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">
            2. Patient Demographics
          </h3>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Gender *
              </label>
              <select
                required
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={form.gender}
                onChange={(e) => setForm((c) => ({ ...c, gender: e.target.value }))}
              >
                <option value="">Select</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
                <option value="prefer-not-to-say">Prefer not to say</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Age
              </label>
              <input
                type="number"
                min="0"
                max="150"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Years"
                value={form.age}
                onChange={(e) => setForm((c) => ({ ...c, age: e.target.value }))}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Blood Group
              </label>
              <select
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={form.bloodGroup}
                onChange={(e) => setForm((c) => ({ ...c, bloodGroup: e.target.value }))}
              >
                <option value="">Select</option>
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 3: Clinical Details */}
        <div className="mb-6 border-t border-slate-100 pt-6">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">
            3. Clinical Details
          </h3>
          
          <div className="mb-4">
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Chief Complaint *
            </label>
            <input
              type="text"
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Reason for visit"
              value={form.reason}
              onChange={(e) => setForm((c) => ({ ...c, reason: e.target.value }))}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Presenting Symptoms
              </label>
              <textarea
                rows={3}
                maxLength={200}
                className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Current symptoms and duration"
                value={form.symptoms}
                onChange={(e) => setForm((c) => ({ ...c, symptoms: e.target.value }))}
              />
              <div className="mt-1 text-right text-xs text-slate-400">
                {form.symptoms?.length || 0}/200
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Medical History & Notes
              </label>
              <textarea
                rows={3}
                maxLength={200}
                className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Allergies, medications, conditions"
                value={form.patientNotes}
                onChange={(e) => setForm((c) => ({ ...c, patientNotes: e.target.value }))}
              />
              <div className="mt-1 text-right text-xs text-slate-400">
                {form.patientNotes?.length || 0}/200
              </div>
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center justify-between border-t border-slate-100 pt-6">
          <p className="text-xs text-slate-500">* Required fields</p>
          <button
            disabled={busy}
            type="submit"
            className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {busy ? "Submitting..." : "Submit Form"}
          </button>
        </div>
      </form>
    </article>
  );
}

function AdmissionsSection({
  admissions,
  onAdmissionShiftUpdate,
  prescriptions,
  user,
}) {
  if (!admissions.length) {
    return (
      <EmptyState message="No admitted patients are available in this workspace." />
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
  {admissions.map((admission) => {
    const prescription = getPrescriptionByPatient(
      prescriptions,
      admission.patient.id
    );
    const medicines = prescription?.currentVersion?.medicines || [];

    const isObservation = admission.status === "under_observation";

    return (
      <article
        key={admission.id}
        className="rounded-3xl border border-neutral-200 bg-white/80 p-6 transition-all"
      >

        {/* 🔹 Header */}
        <div className="flex items-start justify-between gap-4">

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-500">
              Ward • Room {admission.roomLabel || "TBD"}
            </p>

            <h4 className="mt-1 text-xl font-semibold text-gray-900">
              {admission.patient.name}
            </h4>

            <p className="text-xs text-gray-500 mt-1">
              {admission.patient.phone}
            </p>
          </div>

          {/* Status */}
          <span
            className={`text-xs font-medium px-3 py-1 rounded-full border ${
              isObservation
                ? "bg-amber-50 text-amber-700 border-amber-200"
                : "bg-emerald-50 text-emerald-700 border-emerald-200"
            }`}
          >
            {admission.status.replace(/_/g, " ")}
          </span>

        </div>

        {/* 🔹 Info */}
        <div className="mt-5 grid gap-4 sm:grid-cols-2 text-sm">
          <InfoRow label="Doctor" value={admission.doctor.name} />
          <InfoRow
            label="Admitted"
            value={formatDateTime(admission.admittedAt)}
          />
          <InfoRow
            label="Reason"
            value={admission.appointment?.reason || "Ward follow-up"}
          />
          <InfoRow
            label="Shifted to"
            value={admission.shiftedTo || "Not shifted"}
          />
        </div>

        {/* Shift Control */}
        {["doctor", "nurse"].includes(user?.role) && (
          <div className="mt-5 border-t border-gray-100 pt-5">
            <AdmissionShiftControl
              admissionId={admission.id}
              currentShiftedTo={admission.shiftedTo}
              onUpdate={onAdmissionShiftUpdate}
            />
          </div>
        )}

        {/* Care Notes */}
        <div className="mt-5 rounded-2xl border border-gray-100 bg-gray-50/70 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
            Care Notes
          </p>
          <p className="mt-2 text-sm text-gray-700 leading-6">
            {admission.careNotes || "No care notes added yet."}
          </p>
        </div>

        {/* 🔹 Medicines */}
        <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50/40 p-4">
          
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-500">
              Prescribed Medicines
            </p>

            {prescription && (
              <span className="text-xs font-medium px-3 py-1 rounded-full bg-white border border-blue-100 text-blue-600">
                v{prescription.currentVersionNumber}
              </span>
            )}
          </div>

          <div className="mt-3">
            <MedicineList medicines={medicines} />
          </div>
        </div>
      </article>
    );
  })}
</div>
  );
}

function QueueSection({
  appointments,
  onEmergencySeverityChange,
  processingSeverityKeys,
  queue,
  user,
}) {
  const doctorQueue =
    user.role === "doctor"
      ? queue.filter((item) => item.status !== "closed")
      : queue;
  const severitySummary = {
    critical: doctorQueue.filter((item) => Number(item.severity || 1) >= 4)
      .length,
    moderate: doctorQueue.filter((item) => Number(item.severity || 1) === 3)
      .length,
    low: doctorQueue.filter((item) => Number(item.severity || 1) <= 2).length,
  };
  const todayOpdAppointments = buildDoctorTodayOpdQueue(appointments, user.id);

  if (!doctorQueue.length) {
    return (
      <EmptyState message="No emergency queue entries are visible right now." />
    );
  }

  return (
    <div className="space-y-4">
      {user.role === "doctor" ? (
        <article className="info-card border-rose-100 bg-rose-50/40">
          <p className="eyebrow text-rose-700">Doctor priority view</p>
          <h4 className="mt-2 text-xl font-semibold text-slate-900">
            Emergency sorting by critical level
          </h4>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-rose-200 bg-white px-4 py-3">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                Critical (L4-L5)
              </p>
              <p className="mt-2 text-2xl font-semibold text-rose-700">
                {severitySummary.critical}
              </p>
            </div>
            <div className="rounded-2xl border border-amber-200 bg-white px-4 py-3">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                Moderate (L3)
              </p>
              <p className="mt-2 text-2xl font-semibold text-amber-700">
                {severitySummary.moderate}
              </p>
            </div>
            <div className="rounded-2xl border border-emerald-200 bg-white px-4 py-3">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                Normal (L1-L2)
              </p>
              <p className="mt-2 text-2xl font-semibold text-emerald-700">
                {severitySummary.low}
              </p>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
              Today OPD working list
            </p>
            {todayOpdAppointments.length ? (
              <div className="mt-3 space-y-2">
                {todayOpdAppointments.map((appointment) => (
                  <div
                    className="flex items-center justify-between rounded-xl border border-slate-100 px-3 py-2"
                    key={appointment.id}
                  >
                    <p className="text-sm font-medium text-slate-800">
                      {appointment.patient.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      Queue #{appointment.queueRank || "-"} ·{" "}
                      {formatDateTime(appointment.appointmentDate)}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-sm text-slate-500">
                No OPD appointments for today.
              </p>
            )}
          </div>
        </article>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        {doctorQueue.map((entry) => (
          <EmergencyCard
            entry={entry}
            key={entry.id}
            onSeverityChange={onEmergencySeverityChange}
            processingSeverityKeys={processingSeverityKeys}
            user={user}
          />
        ))}
      </div>
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
  user,
}) {
  const selectedChat = getSelectedChat(chats, selectedChatId);

  if (!chats.length) {
    return <EmptyState message="No active doctor-patient conversations yet." />;
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[300px,1fr]">

  {/* 🔹 Sidebar */}
  <aside className="rounded-3xl border border-gray-100 bg-white/80 backdrop-blur-xl p-4 shadow-sm">

    {/* Header */}
    <div className="mb-4 rounded-2xl bg-gradient-to-r from-emerald-50 to-emerald-100 px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
        Conversations
      </p>
      <p className="mt-1 text-sm text-emerald-900">
        {chats.length} active {chats.length > 1 ? "patients" : "patient"}
      </p>
    </div>

    {/* Chat List */}
    <div className="space-y-2">
      {chats.map((thread) => {
        const peer = user.role === "doctor" ? thread.patient : thread.doctor;
        const firstInitial = peer.name?.slice(0, 1)?.toUpperCase() || "?";
        const isActive = selectedChat?.id === thread.id;

        return (
          <button
            key={thread.id}
            onClick={() => onChatSelect(thread.id)}
            type="button"
            className={`w-full text-left rounded-2xl p-3 transition-all duration-200
              ${
                isActive
                  ? "bg-emerald-50 border border-emerald-100 shadow-sm"
                  : "hover:bg-gray-50"
              }
            `}
          >
            <div className="flex items-start gap-3">

              {/* Avatar */}
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-sm font-semibold text-emerald-700">
                {firstInitial}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-semibold text-gray-900">
                    {peer.name}
                  </p>
                  <span className="text-[11px] text-gray-400">
                    {formatDateTime(thread.updatedAt)}
                  </span>
                </div>

                <p className="mt-1 text-[11px] uppercase tracking-[0.2em] text-gray-400">
                  {user.role === "doctor"
                    ? "Patient"
                    : peer.specialization || "Doctor"}
                </p>

                <p className="mt-1 truncate text-sm text-gray-600">
                  {thread.latestMessage || "No messages yet."}
                </p>
              </div>

            </div>
          </button>
        );
      })}
    </div>

  </aside>

  {/* 🔹 Chat Panel */}
  <div className="flex flex-col rounded-3xl border border-gray-100 bg-white/80 backdrop-blur-xl shadow-sm overflow-hidden">

    {/* Header */}
    <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-blue-500 font-semibold">
          Active Thread
        </p>
        <h4 className="text-lg font-semibold text-gray-900">
          {selectedChat
            ? user.role === "doctor"
              ? selectedChat.patient.name
              : selectedChat.doctor.name
            : "Conversation"}
        </h4>
      </div>

      {selectedChat?.doctor?.specialization && (
        <span className="text-xs font-medium px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
          {selectedChat.doctor.specialization}
        </span>
      )}
    </div>

    {/* Messages */}
    <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 bg-gray-50/60">

      {selectedChat?.messages?.map((message) => {
        const mine = message.sender.id === user.id;

        return (
          <div
            key={message.id}
            className={`flex ${mine ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm shadow-sm transition-all
                ${
                  mine
                    ? "bg-green-600 text-white"
                    : "bg-white border border-gray-200 text-gray-700"
                }
              `}
            >
              <p className="text-[10px] uppercase opacity-60 mb-1">
                {mine ? "You" : message.sender.name}
              </p>

              <p>{message.body}</p>

              <p className="mt-2 text-[10px] opacity-60 text-right">
                {formatDateTime(message.createdAt)}
              </p>
            </div>
          </div>
        );
      })}

    </div>

    {/* Input */}
    <form
      onSubmit={onSendChat}
      className="border-t border-gray-100 p-4 bg-white"
    >
      <div className="flex items-end gap-3">

        <textarea
          value={chatBody}
          onChange={(e) => onChatBodyChange(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 resize-none rounded-xl border border-gray-200 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-100 focus:border-emerald-400"
        />

        <button
          type="submit"
          className="px-5 py-2.5 rounded-xl bg-linear-to-r from-blue-500 to-blue-600 text-white text-md shadow-md hover:shadow-lg hover:scale-[1.02] transition-all"
        >
          Send
        </button>

      </div>
    </form>

  </div>

</div>
  );
}

function PrescriptionsSection({
  downloadingPrescriptionKeys,
  onPrescriptionDownload,
  prescriptions,
  user,
}) {
  if (!prescriptions.length) {
    return (
      <EmptyState message="No prescriptions are available for this workspace." />
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
  {prescriptions.map((prescription) => (
    <article
      key={prescription.id}
      className="rounded-3xl border border-gray-100 bg-white/80 backdrop-blur-xl p-6 shadow-sm hover:shadow-xl transition-all"
    >

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-500">
            Prescription #{prescription.id}
          </p>
          <h4 className="mt-1 text-xl font-semibold text-gray-900">
            {prescription.title || "Prescription"}
          </h4>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-2">

          <span className="text-xs font-medium px-3 py-1 rounded-full bg-blue-50 text-blue-600 border border-blue-100">
            v{prescription.currentVersionNumber}
          </span>

          {user.role === "patient" && (
            <>
              <button
                disabled={downloadingPrescriptionKeys.includes(`${prescription.id}:excel`)}
                onClick={() =>
                  onPrescriptionDownload?.(
                    prescription.id,
                    "excel",
                    prescription.title
                  )
                }
                type="button"
                className="text-xs px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-200 hover:bg-gray-100 transition"
              >
                {downloadingPrescriptionKeys.includes(`${prescription.id}:excel`)
                  ? "Downloading..."
                  : "Excel"}
              </button>

              <button
                disabled={downloadingPrescriptionKeys.includes(`${prescription.id}:pdf`)}
                onClick={() =>
                  onPrescriptionDownload?.(
                    prescription.id,
                    "pdf",
                    prescription.title
                  )
                }
                type="button"
                className="text-xs px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-200 hover:bg-gray-100 transition"
              >
                {downloadingPrescriptionKeys.includes(`${prescription.id}:pdf`)
                  ? "Downloading..."
                  : "PDF"}
              </button>
            </>
          )}

        </div>
      </div>

      {/* Info */}
      <div className="mt-5 grid gap-4 sm:grid-cols-2 text-sm">
        <InfoRow label="Patient" value={prescription.patient.name} />
        <InfoRow label="Doctor" value={prescription.doctor.name} />
        <InfoRow
          label="Visit date"
          value={formatDateTime(prescription.appointmentDate)}
        />
        <InfoRow label="Reason" value={prescription.reason} />
      </div>

      {/* Versions Timeline */}
      <div className="mt-6 border-t border-gray-100 pt-5 space-y-4">

        {(prescription.versions || []).slice(0, 3).map((version, index) => (
          <div key={version.id} className="relative pl-6">

            {/* Timeline line */}
            {index !== 2 && (
              <div className="absolute left-[9px] top-6 h-full w-[2px] bg-gray-200"></div>
            )}

            {/* Dot */}
            <div className="absolute left-0 top-1.5 h-4 w-4 rounded-full bg-blue-500 border-2 border-white shadow"></div>

            {/* Card */}
            <div className="rounded-2xl border border-gray-100 bg-gray-50/70 p-4">

              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-gray-900">
                  Version {version.versionNumber}
                </p>
                <p className="text-[11px] uppercase tracking-[0.2em] text-gray-400">
                  {formatDate(version.createdAt)}
                </p>
              </div>

              <p className="mt-2 text-sm text-gray-700 leading-6">
                {version.changeSummary || "No change summary."}
              </p>

              <p className="mt-1 text-sm text-gray-500 leading-6">
                {version.diagnosis || "Diagnosis not provided."}
              </p>
            </div>
          </div>
        ))}
      </div>
    </article>
  ))}
</div>
  );
}

function UsersSection({
  onUserCreate,
  onUserDelete,
  onUserUpdate,
  user,
  users,
}) {
  const canManage = ["admin", "super_admin"].includes(user?.role);
  const canCreateDelete = user?.role === "super_admin";

  if (!users.length) {
    return (
      <EmptyState message="No users are available in this access level." />
    );
  }

  return (
    <div className="space-y-6">

  {/* Create Card */}
  {canCreateDelete ? <CreateUserCard onCreate={onUserCreate} /> : null}

  {/* Grid */}
  <div className="grid gap-6 lg:grid-cols-2">

    {users.map((item) => (
      <article
        key={item.id}
        className="group relative bg-white/80 backdrop-blur-xl border border-gray-100 rounded-3xl p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
      >

        {/* Top Section */}
        <div className="flex items-start justify-between">

          <div>
            {/* Tags */}
            <div className="flex gap-2 flex-wrap">
              <span className="text-xs font-medium px-3 py-1 rounded-full bg-blue-50 text-blue-600 border border-blue-100">
                {formatRole(item.role)}
              </span>

              <span className="text-xs font-medium px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100">
                {item.department || "General"}
              </span>
            </div>

            {/* Name */}
            <h2 className="mt-3 text-lg font-semibold text-gray-900">
              {item.name}
            </h2>
          </div>

        </div>

        {/* Info Grid */}
        <div className="mt-5 grid gap-4 sm:grid-cols-2 text-sm">
          <InfoRow label="Email" value={item.email} />
          <InfoRow label="Phone" value={item.phone} />
          <InfoRow
            label="Specialization"
            value={item.specialization || "Not assigned"}
          />
          <InfoRow
            label="Experience"
            value={`${item.experienceYears || 0} years`}
          />
        </div>

        {/* Divider */}
        {(canManage && item.role === "doctor") || canCreateDelete ? (
          <div className="mt-6 border-t border-gray-100 pt-5 space-y-4">
            
            {/* Edit */}
            {canManage && item.role === "doctor" ? (
              <EditDoctorCard onUpdate={onUserUpdate} target={item} />
            ) : null}

            {/* Delete */}
            {canCreateDelete &&
              !["super_admin", "admin"].includes(item.role) && (
                <button
                  onClick={() => onUserDelete?.(item.id)}
                  type="button"
                  className="w-full text-sm font-medium px-4 py-2 rounded-xl bg-red-50 text-red-600 border border-red-400 transition-all"
                >
                  Delete User
                </button>
              )}

          </div>
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
    password: "",
  });

  return (
    <div className="mt-6 max-w-xl rounded-2xl border border-neutral-100 bg-white/80 backdrop-blur-xl p-6">
  
  {/* Header */}
  <div className="mb-6">
    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-500">
      Doctor Access
    </p>
    <h3 className="text-xl font-semibold text-gray-800 mt-1">
      Edit Doctor Details
    </h3>
  </div>

  {/* Form */}
  <div className="flex flex-col gap-5">

    {/* Name */}
    <div className="flex flex-col gap-1">
      <label className="text-sm text-gray-600">Full Name</label>
      <input
        className="border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all bg-white px-4 py-3 rounded-xl outline-none"
        placeholder="Doctor name"
        value={form.name}
        onChange={(e) =>
          setForm((c) => ({ ...c, name: e.target.value }))
        }
      />
    </div>

    {/* Email */}
    <div className="flex flex-col gap-1">
      <label className="text-sm text-gray-600">Email Address</label>
      <input
        className="border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all bg-white px-4 py-3 rounded-xl outline-none"
        placeholder="Doctor email"
        value={form.email}
        onChange={(e) =>
          setForm((c) => ({ ...c, email: e.target.value }))
        }
      />
    </div>

    {/* Password */}
    <div className="flex flex-col gap-1">
      <label className="text-sm text-gray-600">Password</label>
      <input
        type="password"
        className="border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all bg-white px-4 py-3 rounded-xl outline-none"
        placeholder="Leave empty to keep current password"
        value={form.password}
        onChange={(e) =>
          setForm((c) => ({ ...c, password: e.target.value }))
        }
      />
    </div>

  </div>

  {/* CTA */}
  <div className="mt-6 flex justify-end">
    <button
      onClick={() => onUpdate?.(target.id, form)}
      type="button"
      className="bg-linear-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 transition-all px-5 py-2.5 text-white rounded-xl shadow-md shadow-neutral-200 text-sm font-medium"
    >
      Update Doctor
    </button>
  </div>

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
    department: "",
  });

  return (
    <article className="flex justify-center items-center">
  <div className="w-full bg-white/80 border border-neutral-200 rounded-2xl p-8">
    
    <h4 className="text-2xl text-gray-800 mb-6">
      Create New User
    </h4>

    <div className="grid gap-5 md:grid-cols-2">

      {/* Name */}
      <input
        className="border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all bg-white px-4 py-3 rounded-xl outline-none"
        placeholder="Full Name"
        value={form.name}
        onChange={(e) =>
          setForm((c) => ({ ...c, name: e.target.value }))
        }
      />

      {/* Email */}
      <input
        className="border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all bg-white px-4 py-3 rounded-xl outline-none"
        placeholder="Email Address"
        value={form.email}
        onChange={(e) =>
          setForm((c) => ({ ...c, email: e.target.value }))
        }
      />

      {/* Phone */}
      <input
        className="border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all bg-white px-4 py-3 rounded-xl outline-none"
        placeholder="Phone Number"
        value={form.phone}
        onChange={(e) =>
          setForm((c) => ({ ...c, phone: e.target.value }))
        }
      />

      {/* Password */}
      <input
        type="password"
        className="border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all bg-white px-4 py-3 rounded-xl outline-none"
        placeholder="Password"
        value={form.password}
        onChange={(e) =>
          setForm((c) => ({ ...c, password: e.target.value }))
        }
      />

      {/* Role */}
      <select
        className="border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all bg-white px-4 py-3 rounded-xl outline-none col-span-2"
        value={form.role}
        onChange={(e) =>
          setForm((c) => ({ ...c, role: e.target.value }))
        }
      >
        <option value="">Select Role</option>
        <option value="doctor">Doctor</option>
        <option value="nurse">Nurse</option>
        <option value="receptionist">Receptionist</option>
        <option value="patient">Patient</option>
        <option value="staff">Staff</option>
        <option value="admin">Admin</option>
      </select>

      {/* Specialization */}
      <input
        className="border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all bg-white px-4 py-3 rounded-xl outline-none col-span-2"
        placeholder="Specialization (for doctors)"
        value={form.specialization}
        onChange={(e) =>
          setForm((c) => ({ ...c, specialization: e.target.value }))
        }
      />

    </div>

    {/* CTA */}
    <div className="mt-8 flex justify-end">
      <button
        onClick={() => onCreate?.(form)}
        type="button"
        className="bg-linear-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 transition-all px-6 py-3 text-white rounded-xl font-medium"
      >
        Create User
      </button>
    </div>

  </div>
</article>
  );
}

function PatientsSection({ patients }) {
  if (!patients.length) {
    return <EmptyState message="No patient records are available yet." />;
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
  {patients.map((patient) => {
    const initial = patient.name?.slice(0, 1)?.toUpperCase() || "?";

    return (
      <article
        key={patient.id}
        className="rounded-3xl border border-gray-100 bg-white/80 backdrop-blur-xl p-6 shadow-sm hover:shadow-xl transition-all"
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {/* Avatar */}
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-100 text-blue-700 font-semibold">
              {initial}
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-500">
                Patient Record
              </p>
              <h4 className="text-lg font-semibold text-gray-900">
                {patient.name}
              </h4>
            </div>
          </div>

          {/* Department Badge */}
          <span className="text-xs font-medium px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
            {patient.department || "General"}
          </span>
        </div>

        {/* Info */}
        <div className="mt-5 grid gap-4 sm:grid-cols-2 text-sm">
          <InfoRow label="Email" value={patient.email} />
          <InfoRow label="Phone" value={patient.phone} />
        </div>

        {/* Notes */}
        <div className="mt-5 rounded-2xl border border-gray-100 bg-gray-50/70 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
            Notes
          </p>
          <p className="mt-2 text-sm text-gray-700 leading-6">
            {patient.notes || "No notes added"}
          </p>
        </div>

        {/* Actions */}
        <div className="mt-5 flex items-center justify-between gap-3 border-t border-gray-100 pt-4">
          <button
            type="button"
            className="text-sm px-4 py-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 hover:bg-blue-100 transition"
          >
            View Details
          </button>

          <button
            type="button"
            className="text-sm px-4 py-2 rounded-xl bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100 transition"
          >
            Contact
          </button>
        </div>
      </article>
    );
  })}
</div>
  );
}

function BillingSection({ records }) {
  if (!records.length) {
    return (
      <EmptyState message="No billing records are available for this workspace." />
    );
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
      items: reports.roleDistribution || [],
    },
    {
      title: "Appointment status",
      items: reports.appointmentStatus || [],
    },
    {
      title: "Emergency severity",
      items: reports.emergencySeverity || [],
    },
    {
      title: "Doctor load",
      items: reports.doctorLoad || [],
    },
  ];

  return (
    <div className="space-y-8">

  {/* 🔹 Highlights */}
  <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
    {(reports.highlights || []).map((item) => (
      <article
        key={item.label}
        className="relative overflow-hidden rounded-3xl border border-neutral-200 bg-white p-4 transition-all"
      >
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-500">
          {item.label}
        </p>

        <h4 className="mt-3 text-3xl font-bold text-gray-900">
          {item.value}
        </h4>
      </article>
    ))}
  </div>

  {/* Analytics Groups */}
  <div className="grid gap-6 lg:grid-cols-2">
    {groups.map((group) => (
      <article
        key={group.title}
        className="rounded-2xl border border-neutral-200 bg-white/80 p-4 transition-all"
      >

        {/* Header */}
        <div className="mb-5">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-500">
            Analytics
          </p>
          <h4 className="mt-1 text-xl text-gray-900">
            {group.title}
          </h4>
        </div>

        {/* Items */}
        <div className="space-y-5">
          {group.items.map((item) => {
            const width = Math.max(10, Math.min(100, item.value * 12));

            return (
              <div key={item.label} className="group">

                {/* Label Row */}
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="text-gray-600">
                    {item.label}
                  </span>
                  <span className="font-semibold text-gray-900">
                    {item.value}
                  </span>
                </div>

                {/* Progress */}
                <div className="relative h-2.5 rounded-full bg-gray-100 overflow-hidden">
                  
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all duration-700 ease-out group-hover:brightness-110"
                    style={{ width: `${width}%` }}
                  />

                  {/* glow effect */}
                  <div
                    className="absolute top-0 h-full w-6 bg-white/30 blur-md"
                    style={{ left: `${width - 5}%` }}
                  />
                </div>
              </div>
            );
          })}
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
  processingNotificationIds,
}) {
  if (!notifications.length) {
    return <EmptyState message="No notifications are waiting right now." />;
  }

  const hasUnread = notifications.some((notification) => !notification.isRead);

  return (
    <div className="space-y-6">

  {/* Header */}
  <div className="flex flex-wrap items-center justify-between gap-4">
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-500">
        Alert Stream
      </p>
      <h4 className="mt-1 text-2xl font-semibold text-gray-900">
        Notification Center
      </h4>
    </div>

    <button
      disabled={!hasUnread || Boolean(processingNotificationIds.length)}
      onClick={onMarkAllNotificationsRead}
      type="button"
      className={`px-4 py-2 rounded-xl text-sm font-medium transition-all
        ${
          hasUnread
            ? "bg-blue-500 text-white"
            : "bg-gray-50 text-gray-400 border border-gray-100 cursor-not-allowed"
        }
        ${processingNotificationIds.length ? "animate-pulse" : ""}
      `}
    >
      Mark all as read
    </button>
  </div>

  {/* Notifications */}
  <div className="grid gap-5">

    {notifications.map((notification) => {
      const isProcessing = processingNotificationIds.includes(notification.id);

      return (
        <article
          key={notification.id}
          className={`group relative rounded-2xl border p-5 transition-all duration-300
            ${
              notification.isRead
                ? "bg-white border-neutral-200 opacity-80"
                : "bg-white border-amber-300"
            }
            ${isProcessing ? "translate-x-2 scale-[0.98] opacity-50" : "hover:shadow-lg hover:-translate-y-0.5"}
          `}
        >

          <div className="flex flex-wrap items-start justify-between gap-4">

            {/* Left Content */}
            <div className="space-y-3">

              {/* Tags */}
              <div className="flex flex-wrap items-center gap-2">
                
                <span className={`text-xs font-medium px-3 py-1 rounded-full border ${severityClass(notification.severity)}`}>
                  {notification.severity}
                </span>

                <span className="text-xs font-medium px-3 py-1 rounded-full bg-gray-100 text-gray-600 border border-gray-200">
                  {notification.type}
                </span>

                {!notification.isRead && (
                  <span className="text-xs font-medium px-3 py-1 rounded-full bg-blue-100 text-blue-700 border border-blue-200 animate-pulse">
                    New
                  </span>
                )}

              </div>

              {/* Content */}
              <div>
                <h4 className="text-lg font-semibold text-gray-900">
                  {notification.title}
                </h4>
                <p className="mt-1 text-sm leading-6 text-gray-600">
                  {notification.body}
                </p>
              </div>

              {/* Time */}
              <p className="text-xs uppercase tracking-[0.2em] text-gray-400">
                {formatDateTime(notification.createdAt)}
              </p>

            </div>

            {/* Action */}
            {!notification.isRead && (
              <button
                disabled={isProcessing}
                onClick={() => onMarkNotificationRead(notification.id)}
                type="button"
                className={`text-sm px-4 py-2 rounded-xl border transition-all
                  ${
                    isProcessing
                      ? "bg-gray-100 text-gray-400"
                      : "bg-emerald-500 text-white"
                  }
                `}
              >
                {isProcessing ? "Reading..." : "Mark as read"}
              </button>
            )}

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
  user,
}) {
  const canEditSeverity = user?.role === "doctor";
  const severityKey = `appointment:${appointment.id}`;
  const isUpdatingSeverity = processingSeverityKeys.includes(severityKey);

  return (
    <div className="relative rounded-2xl border border-neutral-200 bg-white/80 p-6 transition-all">

  {/* Header */}
  <div className="flex flex-wrap items-start justify-between gap-4">

    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-500">
        {appointment.medicalField || "General"}
      </p>

      <h4 className="mt-1 text-xl font-semibold text-gray-900">
        {appointment.reason}
      </h4>
    </div>

    {/* Status */}
    <div className="flex flex-wrap items-center gap-2">

      <span
        className={`text-xs font-medium px-3 py-1 rounded-full border ${APPOINTMENT_STYLES[appointment.status] || "bg-gray-100 text-gray-600 border-gray-200"}`}
      >
        {appointment.status.replace(/_/g, " ")}
      </span>

      {appointment.queueRank && (
        <span className="text-xs font-medium px-3 py-1 rounded-full bg-blue-50 text-blue-600 border border-blue-100">
          Queue #{appointment.queueRank}
        </span>
      )}

    </div>

  </div>

  {/* Info Grid */}
  <div className="mt-5 grid gap-4 sm:grid-cols-2 text-sm">
    <InfoRow label="Patient" value={appointment.patient.name} />
    <InfoRow label="Doctor" value={appointment.doctor.name} />
    <InfoRow
      label="Visit time"
      value={formatDateTime(appointment.appointmentDate)}
    />
    <InfoRow
      label="Severity"
      value={
        <span className="inline-flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-red-500"></span>
          Level {appointment.severity}
        </span>
      }
    />
  </div>

  {/* Details */}
  {detailed && (
    <div className="mt-6 rounded-2xl border border-gray-100 bg-gray-50/70 p-4 space-y-2">
      
      <p className="text-sm text-gray-600 leading-6">
        <span className="font-semibold text-gray-900">Symptoms:</span>{" "}
        {appointment.symptoms || "No symptoms provided."}
      </p>

      <p className="text-sm text-gray-600 leading-6">
        <span className="font-semibold text-gray-900">Notes:</span>{" "}
        {appointment.patientNotes ||
          appointment.decisionNotes ||
          "No notes added."}
      </p>

    </div>
  )}

  {/* Actions */}
  {(canEditSeverity) && (
    <div className="mt-6 border-t border-gray-100 pt-5 space-y-4">

      {/* Chat */}
      <button
        onClick={() => onOpenChatFromAppointment?.(appointment)}
        type="button"
        className="w-full text-sm font-medium px-4 py-2.5 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 hover:bg-blue-100 transition-all"
      >
        Open chat with {appointment.patient.name}
      </button>

      {/* Severity Control */}
      <div className="rounded-2xl border border-gray-100 bg-white p-4">
        <SeverityControl
          currentSeverity={appointment.severity}
          isBusy={isUpdatingSeverity}
          label="Doctor severity control"
          onChange={(severity) =>
            onSeverityChange?.(appointment.id, severity)
          }
        />
      </div>

    </div>
  )}

</div>
  );
}

function EmergencyCard({
  entry,
  onSeverityChange,
  processingSeverityKeys = [],
  user,
}) {
  const canEditSeverity = user?.role === "doctor";
  const severityKey = `emergency:${entry.id}`;
  const isUpdatingSeverity = processingSeverityKeys.includes(severityKey);

  return (
    <article className="info-card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="eyebrow">Queue rank #{entry.queueRank}</p>
          <h4 className="mt-2 text-xl font-semibold text-slate-900">
            {entry.patientName}
          </h4>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`status-pill ${EMERGENCY_STYLES[entry.status] || "bg-slate-100 text-slate-700"}`}
          >
            {entry.status.replace(/_/g, " ")}
          </span>
          <span className={`status-pill ${severityClass(entry.severity)}`}>
            Severity {entry.severity}
          </span>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <InfoRow label="Symptoms" value={entry.symptoms} />
        <InfoRow label="Added by" value={entry.addedBy.name} />
        <InfoRow
          label="Assigned doctor"
          value={entry.assignedDoctor?.name || "Not assigned"}
        />
        <InfoRow
          label="Assigned nurse"
          value={entry.assignedNurse?.name || "Not assigned"}
        />
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
    <div className="">
  {/* Header */}
  <div className="flex flex-wrap items-center justify-between gap-3">
    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-500">
      {label}
    </p>

    <span
      className={`text-xs font-medium px-3 py-1 rounded-full border ${severityClass(currentSeverity)}`}
    >
      {formatSeverityTierLabel(currentSeverity)}
    </span>
  </div>

  {/* Options */}
  <div className="mt-5 grid gap-3 sm:grid-cols-5">
    {SEVERITY_PRESETS.map((preset) => {
      const isActive = activeTier === preset.key;

      return (
        <button
          key={preset.key}
          disabled={isBusy || isActive}
          onClick={() => onChange?.(preset.value)}
          type="button"
          className={`group relative rounded-2xl border px-4 py-3 text-left transition-all duration-300
            ${
              isActive
                ? `${preset.activeClass} shadow-xs scale-[1.02]`
                : `${preset.idleClass} hover:shadow-xs hover:-translate-y-0.5`
            }
            ${isBusy ? "opacity-60" : ""}
          `}
        >

          {/* Label */}
          <span className="block text-xs font-semibold">
            {preset.label}
          </span>

          {/* Range */}
          <span className="mt-1 block text-xs opacity-70">
            {preset.range}
          </span>

          {/* Active indicator */}
          {isActive && (
            <div className="absolute inset-0 rounded-2xl pointer-events-none"></div>
          )}

        </button>
      );
    })}
  </div>

  {/* Footer */}
  <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
    <span>
      {isBusy
        ? "Updating severity..."
        : "Select severity level based on patient condition"}
    </span>

    {!isBusy && (
      <span className="text-blue-500 font-medium">
        {formatSeverityTierLabel(currentSeverity)}
      </span>
    )}
  </div>

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
        <button
          className="btn-primary"
          disabled={busy || !shiftedTo.trim()}
          onClick={handleUpdate}
          type="button"
        >
          {busy ? "Updating..." : "Update shift"}
        </button>
      </div>
    </div>
  );
}

function OpdQueueCard({ group }) {
  return (
    <article className="rounded-2xl border border-neutral-200 bg-white/80 p-6 transition-all">
  {/* Header */}
  <div className="flex items-start justify-between gap-4">
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-500">
        {group.doctor.specialization || "General OPD"}
      </p>

      <h4 className="mt-1 text-xl font-semibold text-gray-900">
        Dr. {group.doctor.name}
      </h4>
    </div>

    <span className="text-xs font-medium px-3 py-1 rounded-full bg-gray-50 text-gray-600 border border-gray-200">
      {group.queue.length} patient{group.queue.length > 1 ? "s" : ""}
    </span>
  </div>

  {/* Next Patient (Highlighted) */}
  <div className="mt-5 rounded-2xl border border-blue-100 bg-linear-to-r from-blue-50 to-blue-100/60 p-4 shadow-sm">
    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">
      Next Patient
    </p>

    <div className="mt-2 flex items-center justify-between">
      <div>
        <p className="text-lg font-semibold text-gray-900">
          {group.next.patient.name}
        </p>
        <p className="text-sm text-gray-600">
          Queue #{group.next.queueRank || 1} ·{" "}
          {formatDateTime(group.next.appointmentDate)}
        </p>
      </div>

      {/* Pulse indicator */}
      <div className="h-3 w-3 rounded-full bg-blue-500 animate-pulse"></div>
    </div>
  </div>

  {/* Queue List */}
  <div className="mt-6 space-y-3">
    {group.queue.map((appointment, index) => {
      const isNext = appointment.queueRank === 1;
      return (
        <div
          key={appointment.id}
          className={`relative rounded-2xl border px-4 py-4 transition-all
            ${
              isNext
                ? "border-blue-200 bg-blue-50/60"
                : "border-gray-100 bg-white hover:bg-gray-50"
            }
          `}
        >

          {/* Left timeline line */}
          {index !== group.queue.length - 1 && (
            <div className="absolute left-3 top-10 h-full w-[2px] bg-gray-200"></div>
          )}
          <div className="flex items-start justify-between gap-3">
            <div className="pl-4">
              <p className="font-semibold text-gray-900">
                {appointment.patient.name}
              </p>

              <p className="mt-1 text-sm text-gray-500">
                {appointment.reason}
              </p>

              <p className="mt-2 text-sm text-gray-600">
                {formatDateTime(appointment.appointmentDate)}
              </p>
            </div>

            {/* Badge */}
            <span
              className={`text-xs font-medium px-3 py-1 rounded-full border
                ${
                  isNext
                    ? "bg-blue-100 text-blue-700 border-blue-200"
                    : "bg-gray-50 text-gray-600 border-gray-200"
                }
              `}
            >
              {isNext ? "Next" : `#${appointment.queueRank}`}
            </span>
          </div>
        </div>
      );
    })}
  </div>
</article>
  );
}

function BillingCard({ record, detailed = false }) {
  return (
    <article className="rounded-2xl border border-neutral-200 bg-white/80 p-6 transition-all">
  {/* Header */}
  <div className="flex items-start justify-between gap-4">

    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-500">
        {record.category}
      </p>

      <h4 className="mt-1 text-lg font-semibold text-gray-900">
        {record.patient.name}
      </h4>
    </div>

    <span
      className={`text-xs font-medium px-3 py-1 rounded-full border ${
        BILLING_STYLES[record.status] || BILLING_STYLES.pending
      }`}
    >
      {record.status}
    </span>

  </div>

  {/* Amount (highlighted) */}
  <div className="mt-5 rounded-2xl border border-emerald-100 bg-linear-to-r from-emerald-50 to-emerald-100/60 p-4">
    <p className="text-xs uppercase tracking-[0.2em] text-emerald-600 font-semibold">
      Total Amount
    </p>

    <h3 className="mt-1 text-2xl font-bold text-gray-900">
      {formatCurrency(record.amount)}
    </h3>

    <p className="text-sm text-gray-600 mt-1">
      Due by {formatDateTime(record.dueDate)}
    </p>
  </div>

  {/* Info */}
  <div className="mt-5 grid gap-4 sm:grid-cols-2 text-sm">
    <InfoRow
      label="Doctor"
      value={record.appointment?.doctorName || "Not assigned"}
    />
    <InfoRow
      label="Appointment"
      value={record.appointment?.reason || "Front desk charge"}
    />
  </div>

  {/* Details */}
  {detailed && (
    <div className="mt-6 border-t border-gray-100 pt-5 space-y-3">
      <div className="rounded-2xl border border-gray-100 bg-gray-50/70 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
          Created By
        </p>
        <p className="mt-1 text-sm text-gray-700">
          {record.createdBy.name}
        </p>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-gray-50/70 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
          Notes
        </p>
        <p className="mt-1 text-sm text-gray-700">
          {record.notes || "No billing notes added."}
        </p>
      </div>
    </div>
  )}
</article>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="rounded-[22px] border border-slate-100 bg-white/90 px-4 py-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
        {label}
      </p>
      <p className="mt-2 text-sm leading-7 text-slate-700">
        {value || "Not available"}
      </p>
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

function getSelectedChat(chats, selectedChatId) {
  return (
    chats.find((thread) => thread.id === selectedChatId) || chats[0] || null
  );
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
  return (
    (prescriptions || []).find((item) => item.patient.id === patientId) || null
  );
}

function buildDoctorTodayOpdQueue(appointments, doctorId) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  return [...(appointments || [])]
    .filter((appointment) => {
      if (Number(appointment.doctor?.id) !== Number(doctorId)) {
        return false;
      }

      if (!ACTIVE_OPD_STATUSES.has(appointment.status)) {
        return false;
      }

      const appointmentTime = new Date(appointment.appointmentDate);
      return appointmentTime >= start && appointmentTime < end;
    })
    .sort((left, right) => {
      if (Number(left.queueRank || 999) !== Number(right.queueRank || 999)) {
        return Number(left.queueRank || 999) - Number(right.queueRank || 999);
      }

      return new Date(left.appointmentDate) - new Date(right.appointmentDate);
    });
}

function buildOpdQueueGroups(appointments) {
  const groups = new Map();

  (appointments || [])
    .filter((appointment) => ACTIVE_OPD_STATUSES.has(appointment.status))
    .forEach((appointment) => {
      const current = groups.get(appointment.doctor.id) || {
        doctor: appointment.doctor,
        queue: [],
      };

      current.queue.push(appointment);
      groups.set(appointment.doctor.id, current);
    });

  return [...groups.values()]
    .map((group) => ({
      ...group,
      queue: group.queue.slice().sort((left, right) => {
        if (Number(left.queueRank || 999) !== Number(right.queueRank || 999)) {
          return Number(left.queueRank || 999) - Number(right.queueRank || 999);
        }

        return new Date(left.appointmentDate) - new Date(right.appointmentDate);
      }),
    }))
    .map((group) => ({
      ...group,
      next: group.queue[0],
    }))
    .sort(
      (left, right) =>
        new Date(left.next.appointmentDate) -
        new Date(right.next.appointmentDate),
    );
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
            {medicine.dosage || "Dose not specified"} ·{" "}
            {medicine.timing || "Timing not specified"}
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
  return [
    ...new Set(
      (doctors || [])
        .map((doctor) =>
          String(doctor.specialization || doctor.department || "").trim(),
        )
        .filter(Boolean),
    ),
  ].sort((left, right) => left.localeCompare(right));
}

function normalizeFieldLabel(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function sanitizeClientFilename(value) {
  return (
    String(value || "prescription")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "prescription"
  );
}
