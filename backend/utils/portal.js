const jwt = require("jsonwebtoken");

const ROLE_LABELS = {
  super_admin: "Super Admin",
  admin: "Admin",
  doctor: "Doctor",
  nurse: "Nurse",
  receptionist: "Receptionist",
  staff: "Staff",
  patient: "Patient"
};

const DASHBOARD_ROLES = Object.keys(ROLE_LABELS);
const APPOINTMENT_ACTIVE_STATUSES = new Set(["pending", "accepted", "in_progress"]);
const APPOINTMENT_STATUSES = [
  "pending",
  "accepted",
  "rejected",
  "in_progress",
  "completed",
  "cancelled"
];
const EMERGENCY_STATUSES = [
  "waiting",
  "triaged",
  "assigned",
  "in_treatment",
  "stable",
  "closed"
];
const USER_CREATION_RULES = {
  super_admin: DASHBOARD_ROLES,
  admin: ["doctor", "nurse", "receptionist", "staff", "patient"],
  receptionist: ["patient"]
};

function sanitizeUser(user) {
  if (!user) {
    return null;
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    roleLabel: ROLE_LABELS[user.role] || user.role,
    specialization: user.specialization || "",
    experienceYears: Number(user.experience_years || user.experienceYears || 0),
    department: user.department || "",
    notes: user.notes || "",
    createdAt: user.created_at || user.createdAt
  };
}

function signToken(user) {
  const jwtSecret = process.env.JWT_SECRET || "abc-hospital-super-secret";

  return jwt.sign(
    {
      sub: user.id,
      role: user.role,
      email: user.email
    },
    jwtSecret,
    { expiresIn: "12h" }
  );
}

function safeJsonParse(value, fallback = null) {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch (error) {
    return fallback;
  }
}

function uniqueIds(values) {
  return [...new Set(values.filter(Boolean))];
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
}

function isValidPhone(value) {
  return /^[0-9]{10,15}$/.test(String(value || "").trim());
}

function normalizeSeverity(value) {
  const severity = Number(value || 1);
  return Math.max(1, Math.min(5, severity));
}

function compareQueueItems(left, right) {
  if (right.severity !== left.severity) {
    return right.severity - left.severity;
  }

  return new Date(left.createdAt) - new Date(right.createdAt);
}

function buildPrescriptionChangeSummary(previousVersion, nextVersion) {
  if (!previousVersion) {
    return "Initial prescription created.";
  }

  const changes = [];

  if ((previousVersion.diagnosis || "") !== (nextVersion.diagnosis || "")) {
    changes.push("Diagnosis updated");
  }

  const previousMedicines = JSON.stringify(previousVersion.medicines || []);
  const nextMedicines = JSON.stringify(nextVersion.medicines || []);
  if (previousMedicines !== nextMedicines) {
    changes.push("Medicine plan updated");
  }

  if ((previousVersion.notes || "") !== (nextVersion.notes || "")) {
    changes.push("Clinical notes revised");
  }

  return changes.length ? `${changes.join(", ")}.` : "No material treatment changes.";
}

function getCapabilities(role) {
  return {
    canCreateUsers: ["super_admin", "admin", "receptionist"].includes(role),
    canDeleteUsers: role === "super_admin",
    canViewReports: ["super_admin", "admin"].includes(role),
    canBookForOthers: ["super_admin", "admin", "receptionist"].includes(role),
    canTriage: ["super_admin", "admin", "doctor", "nurse", "receptionist", "staff"].includes(role),
    canPrescribe: role === "doctor",
    canChat: ["patient", "doctor"].includes(role)
  };
}

function buildSummary(user, payload) {
  const unreadNotifications = payload.notifications.filter((item) => !item.isRead).length;
  const criticalEmergencies = payload.emergencyQueue.filter((item) => item.severity >= 4).length;

  if (user.role === "patient") {
    const activeAppointments = payload.appointments.filter((item) =>
      APPOINTMENT_ACTIVE_STATUSES.has(item.status)
    );
    const nextAppointment = activeAppointments[0];

    return {
      headline: "Track your treatment plan, queue position, and doctor replies from one place.",
      cards: [
        {
          label: "Active appointments",
          value: activeAppointments.length,
          helper: "Pending, accepted, or in progress"
        },
        {
          label: "Next queue rank",
          value: nextAppointment?.queueRank || "-",
          helper: "Within your doctor's active queue"
        },
        {
          label: "Prescription versions",
          value: payload.prescriptions.reduce(
            (total, prescription) => total + prescription.versions.length,
            0
          ),
          helper: "Historical treatment snapshots"
        },
        {
          label: "Unread alerts",
          value: unreadNotifications,
          helper: "Appointments, chat, and emergency updates"
        }
      ],
      tasks: [
        "Book your next appointment or check queue rank.",
        "Use chat to follow up directly with your doctor.",
        "Review prescription changes version by version."
      ]
    };
  }

  if (user.role === "doctor") {
    const pending = payload.appointments.filter((item) => item.status === "pending").length;
    const activePatients = new Set(payload.appointments.map((item) => item.patient.id)).size;

    return {
      headline: "Manage high-priority patients, respond in chat, and publish versioned prescriptions.",
      cards: [
        {
          label: "Pending approvals",
          value: pending,
          helper: "Appointments waiting for accept or reject"
        },
        {
          label: "Active patients",
          value: activePatients,
          helper: "Patients attached to your appointments"
        },
        {
          label: "Chat threads",
          value: payload.chats.length,
          helper: "Open patient conversations"
        },
        {
          label: "Critical emergencies",
          value: criticalEmergencies,
          helper: "Severity 4 and 5 across the hospital"
        }
      ],
      tasks: [
        "Triage pending appointments by severity and FIFO order.",
        "Update notes before finalizing prescriptions.",
        "Reply quickly to incoming patient questions."
      ]
    };
  }

  if (user.role === "admin") {
    return {
      headline: "Run the hospital floor with reporting, user oversight, and queue control.",
      cards: [
        {
          label: "Users",
          value: payload.users.length,
          helper: "Accessible accounts in the system"
        },
        {
          label: "Appointments",
          value: payload.appointments.length,
          helper: "Tracked bookings across departments"
        },
        {
          label: "Open emergencies",
          value: payload.emergencyQueue.filter((item) =>
            !["stable", "closed"].includes(item.status)
          ).length,
          helper: "Cases requiring operational oversight"
        },
        {
          label: "Unread alerts",
          value: unreadNotifications,
          helper: "System notifications awaiting review"
        }
      ],
      tasks: [
        "Monitor queue flow and rebalance departments when spikes happen.",
        "Provision doctors, nurses, receptionists, and staff accounts.",
        "Review patient, emergency, and utilization reports."
      ]
    };
  }

  if (user.role === "super_admin") {
    return {
      headline: "Keep a global view of roles, reports, and operational risk across the entire hospital.",
      cards: [
        {
          label: "Total users",
          value: payload.users.length,
          helper: "All roles including admins"
        },
        {
          label: "Admin accounts",
          value: payload.users.filter((item) => ["admin", "super_admin"].includes(item.role)).length,
          helper: "Leadership and governance access"
        },
        {
          label: "Prescription files",
          value: payload.prescriptions.length,
          helper: "Current prescription records"
        },
        {
          label: "Critical alerts",
          value: criticalEmergencies + unreadNotifications,
          helper: "Emergency and notification pressure"
        }
      ],
      tasks: [
        "Create or remove users with role-level controls.",
        "Audit hospital-wide queue, report, and prescription activity.",
        "Keep admin access and escalation ownership clean."
      ]
    };
  }

  if (user.role === "nurse") {
    const assigned = payload.emergencyQueue.filter(
      (item) => item.assignedNurse?.id === user.id && !["stable", "closed"].includes(item.status)
    ).length;

    return {
      headline: "Support doctors with live triage visibility and rapid status updates.",
      cards: [
        {
          label: "Open emergency cases",
          value: payload.emergencyQueue.filter((item) =>
            !["stable", "closed"].includes(item.status)
          ).length,
          helper: "Visible queue items"
        },
        {
          label: "Assigned to you",
          value: assigned,
          helper: "Cases needing your follow-up"
        },
        {
          label: "Critical alerts",
          value: criticalEmergencies,
          helper: "Severity 4 and 5 cases"
        },
        {
          label: "Unread alerts",
          value: unreadNotifications,
          helper: "Operational updates"
        }
      ],
      tasks: [
        "Update patient status as triage progresses.",
        "Coordinate with assigned doctors on critical cases.",
        "Watch the queue for FIFO changes inside equal severity bands."
      ]
    };
  }

  if (user.role === "receptionist") {
    return {
      headline: "Register patients, book appointments, and keep front-desk flow moving.",
      cards: [
        {
          label: "Patients",
          value: payload.patients.length,
          helper: "Registered patient records"
        },
        {
          label: "Pending appointments",
          value: payload.appointments.filter((item) => item.status === "pending").length,
          helper: "Waiting for doctor action"
        },
        {
          label: "Open emergencies",
          value: payload.emergencyQueue.filter((item) =>
            !["stable", "closed"].includes(item.status)
          ).length,
          helper: "Active queue entries"
        },
        {
          label: "Unread alerts",
          value: unreadNotifications,
          helper: "Desk and queue notifications"
        }
      ],
      tasks: [
        "Register walk-ins or new portal patients.",
        "Book appointments on behalf of patients.",
        "Coordinate emergency intake with staff and nurses."
      ]
    };
  }

  const openCases = payload.emergencyQueue.filter((item) => !["stable", "closed"].includes(item.status));

  return {
    headline: "Handle emergency intake quickly and keep high-severity cases at the top of the queue.",
    cards: [
      {
        label: "Open emergency cases",
        value: openCases.length,
        helper: "Active queue entries"
      },
      {
        label: "Critical cases",
        value: criticalEmergencies,
        helper: "Severity 4 and 5 patients"
      },
      {
        label: "Waiting cases",
        value: openCases.filter((item) => item.status === "waiting").length,
        helper: "Still untriaged"
      },
      {
        label: "Unread alerts",
        value: unreadNotifications,
        helper: "Emergency notifications"
      }
    ],
    tasks: [
      "Add new emergency patients with the right severity.",
      "Keep severity ordering strict, then preserve FIFO.",
      "Escalate critical cases to nurses and doctors immediately."
    ]
  };
}

function canCreateRole(requester, targetRole) {
  return (USER_CREATION_RULES[requester.role] || []).includes(targetRole);
}

function canEditUser(requester, targetUser, nextRole = targetUser.role) {
  if (requester.role === "super_admin") {
    return DASHBOARD_ROLES.includes(nextRole);
  }

  if (requester.role === "admin") {
    return (
      !["super_admin", "admin"].includes(targetUser.role) &&
      USER_CREATION_RULES.admin.includes(nextRole)
    );
  }

  if (requester.role === "receptionist") {
    return targetUser.role === "patient" && nextRole === "patient";
  }

  return false;
}

module.exports = {
  APPOINTMENT_ACTIVE_STATUSES,
  APPOINTMENT_STATUSES,
  DASHBOARD_ROLES,
  EMERGENCY_STATUSES,
  ROLE_LABELS,
  USER_CREATION_RULES,
  buildPrescriptionChangeSummary,
  buildSummary,
  canCreateRole,
  canEditUser,
  compareQueueItems,
  getCapabilities,
  isValidEmail,
  isValidPhone,
  normalizeSeverity,
  safeJsonParse,
  sanitizeUser,
  signToken,
  uniqueIds
};
