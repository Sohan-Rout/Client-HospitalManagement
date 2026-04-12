const { all } = require("../config/db");
const { get, run } = require("../config/db");

async function fetchAdmissions(currentUser) {
  if (!["nurse", "doctor", "admin", "super_admin", "receptionist"].includes(currentUser.role)) {
    return [];
  }

  const where = ["ad.status IN ('admitted', 'under_observation')"];
  const params = [];

  if (currentUser.role === "doctor") {
    where.push("ad.admitted_by_doctor_id = ?");
    params.push(currentUser.id);
  }

  const rows = await all(
    `SELECT
      ad.id,
      ad.patient_id,
      ad.appointment_id,
      ad.admitted_by_doctor_id,
      ad.room_label,
      ad.shifted_to,
      ad.shifted_updated_by_user_id,
      ad.status,
      ad.care_notes,
      ad.admitted_at,
      ad.updated_at,
      p.name AS patient_name,
      p.email AS patient_email,
      p.phone AS patient_phone,
      d.name AS doctor_name,
      d.specialization AS doctor_specialization,
      d.department AS doctor_department,
      su.name AS shifted_updated_by_name,
      a.appointment_date,
      a.medical_field,
      a.reason
    FROM portal_admissions ad
    INNER JOIN portal_users p ON p.id = ad.patient_id
    INNER JOIN portal_users d ON d.id = ad.admitted_by_doctor_id
    LEFT JOIN portal_users su ON su.id = ad.shifted_updated_by_user_id
    LEFT JOIN portal_appointments a ON a.id = ad.appointment_id
    ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
    ORDER BY datetime(ad.admitted_at) DESC`,
    params
  );

  return rows.map((row) => ({
    id: row.id,
    status: row.status,
    roomLabel: row.room_label || "",
    shiftedTo: row.shifted_to || "",
    shiftedUpdatedBy: row.shifted_updated_by_name || "",
    careNotes: row.care_notes || "",
    admittedAt: row.admitted_at,
    updatedAt: row.updated_at,
    patient: {
      id: row.patient_id,
      name: row.patient_name,
      email: row.patient_email,
      phone: row.patient_phone
    },
    doctor: {
      id: row.admitted_by_doctor_id,
      name: row.doctor_name,
      specialization: row.doctor_specialization || "",
      department: row.doctor_department || ""
    },
    appointment: row.appointment_id
      ? {
          id: row.appointment_id,
          appointmentDate: row.appointment_date,
          medicalField: row.medical_field || "general",
          reason: row.reason || ""
        }
      : null
  }));
}

async function getAdmissionById(admissionId) {
  return get("SELECT id, admitted_by_doctor_id, shifted_to FROM portal_admissions WHERE id = ?", [
    admissionId
  ]);
}

async function updateAdmissionShift(admissionId, shiftedTo, updatedByUserId) {
  return run(
    `UPDATE portal_admissions
    SET shifted_to = ?, shifted_updated_by_user_id = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?`,
    [shiftedTo, updatedByUserId, admissionId]
  );
}

module.exports = {
  fetchAdmissions,
  getAdmissionById,
  updateAdmissionShift
};
