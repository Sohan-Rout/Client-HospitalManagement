const { all, get } = require("../config/db");
const { ROLE_LABELS } = require("../utils/portal");

async function buildReports() {
  const roleCounts = await all(
    `SELECT role AS label, COUNT(*) AS total
    FROM portal_users
    GROUP BY role
    ORDER BY total DESC`
  );

  const appointmentStatusCounts = await all(
    `SELECT status AS label, COUNT(*) AS total
    FROM portal_appointments
    GROUP BY status
    ORDER BY total DESC`
  );

  const emergencySeverityCounts = await all(
    `SELECT severity AS label, COUNT(*) AS total
    FROM portal_emergency_cases
    GROUP BY severity
    ORDER BY severity DESC`
  );

  const doctorLoad = await all(
    `SELECT
      d.name AS label,
      COUNT(a.id) AS total
    FROM portal_users d
    LEFT JOIN portal_appointments a ON a.doctor_id = d.id
    WHERE d.role = 'doctor'
    GROUP BY d.id
    ORDER BY total DESC, d.name ASC`
  );

  const totals = {
    patients: await get("SELECT COUNT(*) AS total FROM portal_users WHERE role = 'patient'"),
    emergencies: await get(
      "SELECT COUNT(*) AS total FROM portal_emergency_cases WHERE status NOT IN ('stable', 'closed')"
    ),
    chats: await get("SELECT COUNT(*) AS total FROM portal_messages"),
    prescriptions: await get("SELECT COUNT(*) AS total FROM portal_prescriptions")
  };

  return {
    highlights: [
      {
        label: "Registered patients",
        value: totals.patients.total
      },
      {
        label: "Open emergency cases",
        value: totals.emergencies.total
      },
      {
        label: "Stored messages",
        value: totals.chats.total
      },
      {
        label: "Prescription files",
        value: totals.prescriptions.total
      }
    ],
    roleDistribution: roleCounts.map((item) => ({
      label: ROLE_LABELS[item.label] || item.label,
      value: item.total
    })),
    appointmentStatus: appointmentStatusCounts.map((item) => ({
      label: item.label,
      value: item.total
    })),
    emergencySeverity: emergencySeverityCounts.map((item) => ({
      label: `Severity ${item.label}`,
      value: item.total
    })),
    doctorLoad: doctorLoad.map((item) => ({
      label: item.label,
      value: item.total
    }))
  };
}

module.exports = {
  buildReports
};
