const { all, get, run } = require("../config/db");
const {
  CRITICAL_EMERGENCY_THRESHOLD,
  canViewCriticalEmergency
} = require("../utils/portal");

async function fetchEmergencyCases(currentUser) {
  if (currentUser.role === "receptionist") {
    return [];
  }

  const where = [];
  const params = [];

  if (currentUser.role === "patient") {
    where.push("e.patient_user_id = ?");
    params.push(currentUser.id);
  }

  if (currentUser.role === "doctor") {
    where.push("e.assigned_doctor_id = ?");
    params.push(currentUser.id);
  }

  if (!canViewCriticalEmergency(currentUser)) {
    where.push("e.severity < ?");
    params.push(CRITICAL_EMERGENCY_THRESHOLD);
  }

  const rows = await all(
    `SELECT
      e.id,
      e.patient_name,
      e.patient_age,
      e.symptoms,
      e.severity,
      e.status,
      e.notes,
      e.created_at,
      e.updated_at,
      e.patient_user_id,
      ad.id AS added_by_id,
      ad.name AS added_by_name,
      ad.role AS added_by_role,
      d.id AS doctor_id,
      d.name AS doctor_name,
      n.id AS nurse_id,
      n.name AS nurse_name
    FROM portal_emergency_cases e
    INNER JOIN portal_users ad ON ad.id = e.added_by_user_id
    LEFT JOIN portal_users d ON d.id = e.assigned_doctor_id
    LEFT JOIN portal_users n ON n.id = e.assigned_nurse_id
    ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
    ORDER BY e.severity DESC, datetime(e.created_at) ASC`,
    params
  );

  return rows.map((row, index) => ({
    id: row.id,
    patientName: row.patient_name,
    patientAge: Number(row.patient_age || 0),
    symptoms: row.symptoms || "",
    severity: Number(row.severity || 1),
    status: row.status,
    notes: row.notes || "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    patientUserId: row.patient_user_id,
    queueRank: index + 1,
    addedBy: {
      id: row.added_by_id,
      name: row.added_by_name,
      role: row.added_by_role
    },
    assignedDoctor: row.doctor_id
      ? {
          id: row.doctor_id,
          name: row.doctor_name
        }
      : null,
    assignedNurse: row.nurse_id
      ? {
          id: row.nurse_id,
          name: row.nurse_name
        }
      : null
  }));
}

async function getEmergencyCaseById(emergencyId) {
  return get(
    `SELECT
      id,
      patient_user_id,
      assigned_doctor_id,
      assigned_nurse_id,
      patient_name,
      severity,
      status,
      notes
    FROM portal_emergency_cases
    WHERE id = ?`,
    [emergencyId]
  );
}

async function createEmergencyCase(payload) {
  return run(
    `INSERT INTO portal_emergency_cases (
      patient_name,
      patient_age,
      symptoms,
      severity,
      status,
      patient_user_id,
      added_by_user_id,
      assigned_doctor_id,
      assigned_nurse_id,
      notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      payload.patientName,
      payload.patientAge,
      payload.symptoms,
      payload.severity,
      payload.status,
      payload.patientUserId,
      payload.addedByUserId,
      payload.assignedDoctorId,
      payload.assignedNurseId,
      payload.notes
    ]
  );
}

async function updateEmergencyCase(emergencyId, payload) {
  return run(
    `UPDATE portal_emergency_cases
    SET
      severity = ?,
      status = ?,
      notes = ?,
      assigned_doctor_id = ?,
      assigned_nurse_id = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?`,
    [
      payload.severity,
      payload.status,
      payload.notes,
      payload.assignedDoctorId,
      payload.assignedNurseId,
      emergencyId
    ]
  );
}

module.exports = {
  createEmergencyCase,
  fetchEmergencyCases,
  getEmergencyCaseById,
  updateEmergencyCase
};
