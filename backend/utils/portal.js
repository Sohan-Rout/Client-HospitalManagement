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
const CRITICAL_EMERGENCY_THRESHOLD = 4;
const CRITICAL_EMERGENCY_VISIBLE_ROLES = new Set(["admin", "nurse", "super_admin"]);
const USER_CREATION_RULES = {
  super_admin: DASHBOARD_ROLES,
  admin: ["doctor", "nurse", "receptionist", "staff", "patient"],
  receptionist: ["patient"]
};
const BED_CAPACITY = {
  icu: 40,
  opd: 60,
  ot: 20
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

function normalizeMedicalField(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
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
    canCreateUsers: role === "super_admin",
    canDeleteUsers: role === "super_admin",
    canViewReports: ["super_admin", "admin"].includes(role),
    canBookForOthers: ["super_admin", "admin", "receptionist"].includes(role),
    canTriage: ["super_admin", "admin", "doctor", "staff"].includes(role),
    canPrescribe: role === "doctor",
    canChat: ["patient", "doctor"].includes(role)
  };
}

function canViewCriticalEmergency(roleOrUser) {
  const role = typeof roleOrUser === "string" ? roleOrUser : roleOrUser?.role;
  return CRITICAL_EMERGENCY_VISIBLE_ROLES.has(role);
}

function canSetCriticalEmergencyLevel(roleOrUser) {
  const role = typeof roleOrUser === "string" ? roleOrUser : roleOrUser?.role;
  return role === "doctor";
}

function buildSummary(user, payload) {
  const unreadNotifications = payload.notifications.filter((item) => !item.isRead).length;
  const criticalEmergencies = payload.emergencyQueue.filter(
    (item) => item.severity >= CRITICAL_EMERGENCY_THRESHOLD
  ).length;
  const bedAvailabilityCard = buildBedAvailabilityCard(payload.admissions || []);

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
        },
        bedAvailabilityCard
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
    const visibleEmergencies = payload.emergencyQueue.filter(
      (item) => !["stable", "closed"].includes(item.status)
    ).length;

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
          label: "Visible emergencies",
          value: visibleEmergencies,
          helper: "Queue items available to your role"
        },
        bedAvailabilityCard
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
        },
        bedAvailabilityCard
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
        },
        bedAvailabilityCard
      ],
      tasks: [
        "Create or remove users with role-level controls.",
        "Audit hospital-wide queue, report, and prescription activity.",
        "Keep admin access and escalation ownership clean."
      ]
    };
  }

  if (user.role === "nurse") {
    const activeAdmissions = (payload.admissions || []).filter((item) => item.status !== "discharged");
    const medicationDoses = (payload.prescriptions || []).reduce(
      (total, prescription) => total + (prescription.currentVersion?.medicines?.length || 0),
      0
    );

    return {
      headline: "Stay focused on admitted patients and the medicine doses doctors have prescribed.",
      cards: [
        {
          label: "Admitted patients",
          value: activeAdmissions.length,
          helper: "Patients currently in nurse care flow"
        },
        {
          label: "Under observation",
          value: activeAdmissions.filter((item) => item.status === "under_observation").length,
          helper: "Patients awaiting closer monitoring"
        },
        {
          label: "Medicine doses",
          value: medicationDoses,
          helper: "Current doctor-prescribed medication lines"
        },
        {
          label: "Unread alerts",
          value: unreadNotifications,
          helper: "Operational updates"
        },
        bedAvailabilityCard
      ],
      tasks: [
        "Review admitted patient rooms and care notes before each round.",
        "Follow the latest prescription doses exactly as prescribed by the doctor.",
        "Escalate dose or observation concerns back to the assigned doctor."
      ]
    };
  }

  if (user.role === "receptionist") {
    const activeOpdQueue = payload.appointments.filter((item) =>
      APPOINTMENT_ACTIVE_STATUSES.has(item.status)
    );
    const pendingBills = (payload.billingRecords || []).filter((item) => item.status !== "paid").length;

    return {
      headline: "Keep front-desk flow smooth with patient bookings, OPD queue visibility, and billing follow-up.",
      cards: [
        {
          label: "Patients",
          value: payload.patients.length,
          helper: "Registered patient records"
        },
        {
          label: "OPD queue",
          value: activeOpdQueue.length,
          helper: "Appointments waiting in doctor order"
        },
        {
          label: "Pending billing",
          value: pendingBills,
          helper: "Bills still awaiting payment"
        },
        {
          label: "Unread alerts",
          value: unreadNotifications,
          helper: "Front-desk and appointment updates"
        },
        bedAvailabilityCard
      ],
      tasks: [
        "Register walk-ins or new portal patients.",
        "Book appointments and guide patients using the OPD queue order.",
        "Track billing status before sending the next patient to the doctor."
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
        label: "Visible critical cases",
        value: criticalEmergencies,
        helper: "Critical cases visible to your role"
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
      },
      bedAvailabilityCard
    ],
    tasks: [
      "Add new emergency patients with the right severity.",
      "Keep severity ordering strict, then preserve FIFO.",
      "Escalate critical cases to nurses and doctors immediately."
    ]
  };
}

function buildBedAvailabilityCard(admissions) {
  const occupied = { icu: 0, opd: 0, ot: 0 };

  (admissions || []).forEach((admission) => {
    const room = String(admission.roomLabel || "").toLowerCase();
    if (room.includes("icu")) {
      occupied.icu += 1;
    } else if (room.includes("ot")) {
      occupied.ot += 1;
    } else {
      occupied.opd += 1;
    }
  });

  const available = {
    icu: Math.max(0, BED_CAPACITY.icu - occupied.icu),
    opd: Math.max(0, BED_CAPACITY.opd - occupied.opd),
    ot: Math.max(0, BED_CAPACITY.ot - occupied.ot)
  };

  return {
    label: "Beds available",
    value: available.icu + available.opd + available.ot,
    helper: `ICU ${available.icu}/${BED_CAPACITY.icu} · OPD ${available.opd}/${BED_CAPACITY.opd} · OT ${available.ot}/${BED_CAPACITY.ot}`
  };
}

function canCreateRole(requester, targetRole) {
  if (requester.role !== "super_admin") {
    return false;
  }

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
  CRITICAL_EMERGENCY_THRESHOLD,
  DASHBOARD_ROLES,
  EMERGENCY_STATUSES,
  ROLE_LABELS,
  USER_CREATION_RULES,
  buildPrescriptionChangeSummary,
  buildSummary,
  canCreateRole,
  canEditUser,
  canSetCriticalEmergencyLevel,
  canViewCriticalEmergency,
  compareQueueItems,
  getCapabilities,
  isValidEmail,
  isValidPhone,
  normalizeSeverity,
  normalizeMedicalField,
  safeJsonParse,
  sanitizeUser,
  signToken,
  uniqueIds
};
