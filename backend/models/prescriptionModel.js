const { all, get, run } = require("../config/db");
const { safeJsonParse } = require("../utils/portal");

async function fetchPrescriptions(currentUser) {
  if (!["patient", "doctor", "nurse", "admin", "super_admin"].includes(currentUser.role)) {
    return [];
  }

  const where = [];
  const params = [];

  if (currentUser.role === "patient") {
    where.push("pr.patient_id = ?");
    params.push(currentUser.id);
  } else if (currentUser.role === "doctor") {
    where.push("pr.doctor_id = ?");
    params.push(currentUser.id);
  } else if (currentUser.role === "nurse") {
    where.push(
      "pr.patient_id IN (SELECT patient_id FROM portal_admissions WHERE status IN ('admitted', 'under_observation'))"
    );
  }

  const rows = await all(
    `SELECT
      pr.id,
      pr.appointment_id,
      pr.patient_id,
      pr.doctor_id,
      pr.title,
      pr.current_version_number,
      pr.created_at,
      pr.updated_at,
      a.appointment_date,
      a.reason,
      p.name AS patient_name,
      d.name AS doctor_name,
      d.specialization AS doctor_specialization
    FROM portal_prescriptions pr
    INNER JOIN portal_appointments a ON a.id = pr.appointment_id
    INNER JOIN portal_users p ON p.id = pr.patient_id
    INNER JOIN portal_users d ON d.id = pr.doctor_id
    ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
    ORDER BY datetime(pr.updated_at) DESC`,
    params
  );

  const prescriptions = [];

  for (const row of rows) {
    const versions = await all(
      `SELECT
        id,
        version_number,
        diagnosis,
        medicines_json,
        notes,
        change_summary,
        created_at
      FROM portal_prescription_versions
      WHERE prescription_id = ?
      ORDER BY version_number DESC`,
      [row.id]
    );

    const mappedVersions = versions.map((version) => ({
      id: version.id,
      versionNumber: version.version_number,
      diagnosis: version.diagnosis || "",
      medicines: safeJsonParse(version.medicines_json, []) || [],
      notes: version.notes || "",
      changeSummary: version.change_summary || "",
      createdAt: version.created_at
    }));

    prescriptions.push({
      id: row.id,
      appointmentId: row.appointment_id,
      appointmentDate: row.appointment_date,
      reason: row.reason || "",
      title: row.title || "Prescription",
      currentVersionNumber: row.current_version_number,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      patient: {
        id: row.patient_id,
        name: row.patient_name
      },
      doctor: {
        id: row.doctor_id,
        name: row.doctor_name,
        specialization: row.doctor_specialization || ""
      },
      currentVersion: mappedVersions[0] || null,
      versions: mappedVersions
    });
  }

  return prescriptions;
}

async function getPrescriptionByAppointment(appointmentId) {
  return get(
    `SELECT
      id,
      current_version_number,
      title
    FROM portal_prescriptions
    WHERE appointment_id = ?`,
    [appointmentId]
  );
}

async function createPrescription({ appointmentId, patientId, doctorId, title }) {
  return run(
    `INSERT INTO portal_prescriptions (
      appointment_id,
      patient_id,
      doctor_id,
      title,
      current_version_number
    ) VALUES (?, ?, ?, ?, 0)`,
    [appointmentId, patientId, doctorId, title]
  );
}

async function getLatestPrescriptionVersion(prescriptionId) {
  return get(
    `SELECT
      diagnosis,
      medicines_json,
      notes
    FROM portal_prescription_versions
    WHERE prescription_id = ?
    ORDER BY version_number DESC
    LIMIT 1`,
    [prescriptionId]
  );
}

async function addPrescriptionVersion({
  prescriptionId,
  versionNumber,
  diagnosis,
  medicines,
  notes,
  changeSummary,
  createdByUserId
}) {
  return run(
    `INSERT INTO portal_prescription_versions (
      prescription_id,
      version_number,
      diagnosis,
      medicines_json,
      notes,
      change_summary,
      created_by_user_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      prescriptionId,
      versionNumber,
      diagnosis,
      JSON.stringify(medicines),
      notes,
      changeSummary,
      createdByUserId
    ]
  );
}

async function updatePrescription(prescriptionId, title, versionNumber) {
  return run(
    `UPDATE portal_prescriptions
    SET
      title = ?,
      current_version_number = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?`,
    [title, versionNumber, prescriptionId]
  );
}

module.exports = {
  addPrescriptionVersion,
  createPrescription,
  fetchPrescriptions,
  getLatestPrescriptionVersion,
  getPrescriptionByAppointment,
  updatePrescription
};
