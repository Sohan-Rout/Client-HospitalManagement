"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "../lib/api";
import {
  ROLE_CONFIGS,
  SECTION_LABELS,
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

export default function DashboardPage({ role }) {
  const router = useRouter();
  const [state, setState] = useState({
    loading: true,
    error: "",
    token: "",
    user: null,
    bootstrap: null,
    activeSection: "overview",
    selectedChatId: null,
    chatBody: "",
    notice: ""
  });

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
        token: session.token,
        bootstrap: {
          ...bootstrap,
          emergencyQueue: sortEmergencyQueue(bootstrap.emergencyQueue || [])
        },
        selectedChatId: bootstrap.chats?.some((thread) => thread.id === current.selectedChatId)
          ? current.selectedChatId
          : bootstrap.chats?.[0]?.id || null,
        notice
      }));
    } catch (error) {
      setState((current) => ({
        ...current,
        error: error.message
      }));
    }
  }

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
    try {
      await apiFetch(`/notifications/${notificationId}/read`, {
        method: "PATCH",
        token: state.token
      });
      await refreshDashboard("Notification updated.");
    } catch (error) {
      setState((current) => ({
        ...current,
        error: error.message
      }));
    }
  }

  async function handleMarkAllNotificationsRead() {
    try {
      await apiFetch("/notifications/read-all", {
        method: "POST",
        token: state.token
      });
      await refreshDashboard("All notifications marked as read.");
    } catch (error) {
      setState((current) => ({
        ...current,
        error: error.message
      }));
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

  return (
    <div className="page-wrap space-y-6 py-6 pb-14">
      <div className="grid gap-6 xl:grid-cols-[280px,1fr]">
        <aside className="panel h-fit p-6">
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
          <header className="panel overflow-hidden p-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-3">
                <p className="eyebrow">{config.label} workspace</p>
                <h2 className="section-title">{state.user.name}</h2>
                <p className="section-copy">{state.bootstrap.summary.headline}</p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <span className="chip bg-orange-50 text-orange-700">{config.subtitle}</span>
                <button className="btn-secondary" onClick={() => refreshDashboard()} type="button">
                  Refresh
                </button>
                <button className="btn-ghost" onClick={handleLogout} type="button">
                  Logout
                </button>
              </div>
            </div>

            {state.notice ? (
              <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {state.notice}
              </div>
            ) : null}

            {state.error ? (
              <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {state.error}
              </div>
            ) : null}
          </header>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {(state.bootstrap.summary.cards || []).map((card) => (
              <article key={card.label} className="summary-card">
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
                <h3 className="mt-2 text-2xl font-semibold text-slate-950">
                  {SECTION_LABELS[state.activeSection]}
                </h3>
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
              onMarkAllNotificationsRead={handleMarkAllNotificationsRead}
              onMarkNotificationRead={handleMarkNotificationRead}
              onSendChat={handleSendChat}
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
  onChatBodyChange,
  onChatSelect,
  onMarkAllNotificationsRead,
  onMarkNotificationRead,
  onSendChat,
  selectedChatId,
  user
}) {
  if (activeSection === "overview") {
    return <OverviewSection bootstrap={bootstrap} />;
  }

  if (activeSection === "appointments") {
    return <AppointmentsSection appointments={bootstrap.appointments || []} />;
  }

  if (activeSection === "queue") {
    return <QueueSection queue={bootstrap.emergencyQueue || []} user={user} />;
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
    return <PrescriptionsSection prescriptions={bootstrap.prescriptions || []} />;
  }

  if (activeSection === "users") {
    return <UsersSection users={bootstrap.users || []} />;
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
      />
    );
  }

  return <EmptyState message="This section is not available for your role." />;
}

function OverviewSection({ bootstrap }) {
  const appointments = (bootstrap.appointments || []).slice(0, 3);
  const emergencies = (bootstrap.emergencyQueue || []).slice(0, 3);
  const notifications = (bootstrap.notifications || []).slice(0, 3);

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
                <AppointmentCard appointment={appointment} key={appointment.id} />
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
              emergencies.map((entry) => <EmergencyCard entry={entry} key={entry.id} />)
            ) : (
              <EmptyState message="No emergency cases are visible for this role." />
            )}
          </div>
        </article>
      </div>
    </div>
  );
}

function AppointmentsSection({ appointments }) {
  if (!appointments.length) {
    return <EmptyState message="No appointments matched this workspace." />;
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {appointments.map((appointment) => (
        <AppointmentCard appointment={appointment} key={appointment.id} detailed />
      ))}
    </div>
  );
}

function QueueSection({ queue, user }) {
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
        <EmergencyCard entry={entry} key={entry.id} />
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

function PrescriptionsSection({ prescriptions }) {
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
            <span className="chip">v{prescription.currentVersionNumber}</span>
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

function UsersSection({ users }) {
  if (!users.length) {
    return <EmptyState message="No users are available in this access level." />;
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {users.map((user) => (
        <article className="info-card" key={user.id}>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="eyebrow">{formatRole(user.role)}</p>
              <h4 className="mt-2 text-xl font-semibold text-slate-900">{user.name}</h4>
            </div>
            <span className="chip">{user.department || "General"}</span>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <InfoRow label="Email" value={user.email} />
            <InfoRow label="Phone" value={user.phone} />
            <InfoRow label="Specialization" value={user.specialization || "Not assigned"} />
            <InfoRow label="Experience" value={`${user.experienceYears || 0} years`} />
          </div>
        </article>
      ))}
    </div>
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
  onMarkNotificationRead
}) {
  if (!notifications.length) {
    return <EmptyState message="No notifications are waiting right now." />;
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="eyebrow">Alert stream</p>
          <h4 className="mt-2 text-xl font-semibold text-slate-900">Notification center</h4>
        </div>
        <button className="btn-secondary" onClick={onMarkAllNotificationsRead} type="button">
          Mark all as read
        </button>
      </div>

      <div className="grid gap-4">
        {notifications.map((notification) => (
          <article className="info-card" key={notification.id}>
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
                  className="btn-ghost rounded-full border border-slate-200 bg-white"
                  onClick={() => onMarkNotificationRead(notification.id)}
                  type="button"
                >
                  Mark read
                </button>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function AppointmentCard({ appointment, detailed = false }) {
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
    </article>
  );
}

function EmergencyCard({ entry }) {
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
  const severity = Number(value || 1);

  if (severity >= 4) {
    return "bg-rose-100 text-rose-800";
  }

  if (severity === 3) {
    return "bg-amber-100 text-amber-800";
  }

  return "bg-emerald-100 text-emerald-800";
}
