export const DEMO_CREDENTIALS = {
  super_admin: {
    identifier: "superadmin@abchospital.com",
    password: "SuperAdmin@123"
  },
  admin: {
    identifier: "admin@abchospital.com",
    password: "Admin@123"
  },
  doctor: {
    identifier: "doctor@abchospital.com",
    password: "Doctor@123"
  },
  nurse: {
    identifier: "nurse@abchospital.com",
    password: "Nurse@123"
  },
  receptionist: {
    identifier: "receptionist@abchospital.com",
    password: "Reception@123"
  },
  patient: {
    identifier: "patient@abchospital.com",
    password: "Patient@123"
  }
};

export const SECTION_LABELS = {
  overview: "Overview",
  appointments: "Appointments",
  admissions: "Admitted Patients",
  billing: "Billing",
  queue: "Emergency Queue",
  opd: "OPD Queue",
  chat: "Doctor Chat",
  prescriptions: "Prescriptions",
  users: "Users",
  patients: "Patients",
  reports: "Reports",
  notifications: "Notifications"
};

export const ROLE_CONFIGS = {
  patient: {
    label: "Patient",
    subtitle: "Personal care workspace",
    description:
      "Book appointments, chat with your doctor, and review prescription history.",
    sections: ["appointments", "chat", "prescriptions", "notifications"]
  },
  doctor: {
    label: "Doctor",
    subtitle: "Clinical workspace",
    description:
      "Review appointment requests, manage urgency, chat with patients, and publish prescription versions.",
    sections: ["appointments", "queue", "chat", "prescriptions", "notifications"]
  },
  admin: {
    label: "Admin",
    subtitle: "Operations console",
    description:
      "Manage staff, oversee reports, watch hospital traffic, and coordinate queue pressure.",
    sections: ["users", "appointments", "reports", "notifications"]
  },
  super_admin: {
    label: "Super Admin",
    subtitle: "System command center",
    description:
      "Full control over hospital access, operations reporting, queue risk, and account governance.",
    sections: ["users", "appointments", "reports", "notifications"]
  },
  nurse: {
    label: "Nurse",
    subtitle: "Ward medication desk",
    description:
      "See only admitted patients, review ward care notes, and follow doctor-prescribed medicine doses.",
    sections: ["admissions", "prescriptions", "notifications"]
  },
  receptionist: {
    label: "Receptionist",
    subtitle: "Front desk workflow",
    description:
      "Register patients, manage appointments, follow the OPD queue, and handle front-desk billing without emergency access.",
    sections: ["patients", "appointments", "admissions", "opd", "billing", "notifications"]
  }
};

export const LANDING_FEATURES = [
  {
    title: "24/7 emergency intake",
    description:
      "Role-based triage views, faster decision-making, and a cleaner patient handoff experience."
  },
  {
    title: "Connected care teams",
    description:
      "Appointments, doctor chat, prescriptions, and alerts stay visible inside one dashboard rhythm."
  },
  {
    title: "Operations clarity",
    description:
      "Admins and super admins can track hospital load, user roles, and active risk in real time."
  }
];

export const LANDING_STATS = [
  { label: "Care pathways", value: "07" },
  { label: "Clinical teams", value: "18" },
  { label: "Live dashboards", value: "24/7" },
  { label: "Patient-first UX", value: "100%" }
];

export const SERVICE_SPOTLIGHTS = [
  {
    title: "Primary care",
    copy: "Fast access to general consultations, follow-ups, and health records in one responsive flow."
  },
  {
    title: "Emergency coordination",
    copy: "Triage ordering, severity visibility, and queue updates without the old WebAssembly layer."
  },
  {
    title: "Doctor collaboration",
    copy: "Chat, prescriptions, and patient summaries presented in a calm, clinical interface."
  }
];

export function formatRole(role) {
  return ROLE_CONFIGS[role]?.label || String(role || "").replace(/_/g, " ");
}

export function formatDateTime(value) {
  if (!value) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

export function formatDate(value) {
  if (!value) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium"
  }).format(new Date(value));
}

export function formatCurrency(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(Number(value || 0));
}

export function sortEmergencyQueue(queue) {
  return [...(queue || [])]
    .sort((left, right) => {
      if (Number(right.severity || 1) !== Number(left.severity || 1)) {
        return Number(right.severity || 1) - Number(left.severity || 1);
      }

      return new Date(left.createdAt) - new Date(right.createdAt);
    })
    .map((item, index) => ({
      ...item,
      queueRank: index + 1
    }));
}
