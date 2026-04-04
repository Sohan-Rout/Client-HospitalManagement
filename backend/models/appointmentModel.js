const { all, get, run } = require("../config/db");
const {
  APPOINTMENT_ACTIVE_STATUSES,
  compareQueueItems
} = require("../utils/portal");

function attachAppointmentQueueRanks(appointments) {
  const ranks = new Map();

  const grouped = appointments
    .filter((appointment) => APPOINTMENT_ACTIVE_STATUSES.has(appointment.status))
    .reduce((collection, appointment) => {
      const key = appointment.doctor.id;
      collection[key] = collection[key] || [];
      collection[key].push(appointment);
      return collection;
    }, {});

  Object.values(grouped).forEach((group) => {
    group
      .slice()
      .sort(compareQueueItems)
      .forEach((item, index) => {
        ranks.set(item.id, index + 1);
      });
  });

  return appointments.map((appointment) => ({
    ...appointment,
    queueRank: ranks.get(appointment.id) || null
  }));
}

async function fetchAppointments(currentUser, filters = {}) {
  if (currentUser.role === "nurse") {
    return [];
  }

  const where = [];
  const params = [];

  if (currentUser.role === "patient") {
    where.push("a.patient_id = ?");
    params.push(currentUser.id);
  } else if (currentUser.role === "doctor") {
    where.push("a.doctor_id = ?");
    params.push(currentUser.id);
  }

  if (filters.status) {
    where.push("a.status = ?");
    params.push(filters.status);
  }

  if (filters.date) {
    where.push("date(a.appointment_date) = date(?)");
    params.push(filters.date);
  }

  if (filters.doctorId) {
    where.push("a.doctor_id = ?");
    params.push(filters.doctorId);
  }

  if (filters.patientId) {
    where.push("a.patient_id = ?");
    params.push(filters.patientId);
  }

  if (filters.search) {
    where.push(
      "(LOWER(p.name) LIKE ? OR LOWER(d.name) LIKE ? OR LOWER(a.reason) LIKE ? OR LOWER(a.symptoms) LIKE ?)"
    );
    const searchTerm = `%${filters.search.toLowerCase()}%`;
    params.push(searchTerm, searchTerm, searchTerm, searchTerm);
  }

  const rows = await all(
    `SELECT
      a.id,
      a.appointment_date,
      a.status,
      a.medical_field,
      a.severity,
      a.symptoms,
      a.reason,
      a.patient_notes,
      a.doctor_notes,
      a.decision_notes,
      a.prescription_id,
      a.created_at,
      a.updated_at,
      p.id AS patient_id,
      p.name AS patient_name,
      p.email AS patient_email,
      p.phone AS patient_phone,
      d.id AS doctor_id,
      d.name AS doctor_name,
      d.email AS doctor_email,
      d.phone AS doctor_phone,
      d.specialization AS doctor_specialization,
      d.department AS doctor_department,
      c.id AS created_by_id,
      c.name AS created_by_name,
      c.role AS created_by_role
    FROM portal_appointments a
    INNER JOIN portal_users p ON p.id = a.patient_id
    INNER JOIN portal_users d ON d.id = a.doctor_id
    INNER JOIN portal_users c ON c.id = a.created_by_user_id
    ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
    ORDER BY datetime(a.appointment_date) ASC, datetime(a.created_at) ASC`,
    params
  );

  const appointments = rows.map((row) => ({
    id: row.id,
    appointmentDate: row.appointment_date,
    status: row.status,
    medicalField: row.medical_field || "general",
    severity: Number(row.severity || 1),
    symptoms: row.symptoms || "",
    reason: row.reason || "",
    patientNotes: row.patient_notes || "",
    doctorNotes: row.doctor_notes || "",
    decisionNotes: row.decision_notes || "",
    prescriptionId: row.prescription_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    patient: {
      id: row.patient_id,
      name: row.patient_name,
      email: row.patient_email,
      phone: row.patient_phone
    },
    doctor: {
      id: row.doctor_id,
      name: row.doctor_name,
      email: row.doctor_email,
      phone: row.doctor_phone,
      specialization: row.doctor_specialization || "",
      department: row.doctor_department || ""
    },
    createdBy: {
      id: row.created_by_id,
      name: row.created_by_name,
      role: row.created_by_role
    }
  }));

  return attachAppointmentQueueRanks(appointments);
}

async function getAppointmentById(appointmentId) {
  return get(
    `SELECT
      id,
      patient_id,
      doctor_id,
      medical_field,
      status,
      severity,
      appointment_date,
      doctor_notes,
      decision_notes,
      prescription_id
    FROM portal_appointments
    WHERE id = ?`,
    [appointmentId]
  );
}

async function createAppointment({
  patientId,
  doctorId,
  createdByUserId,
  appointmentDate,
  medicalField,
  severity,
  symptoms,
  reason,
  patientNotes,
  decisionNotes
}) {
  return run(
    `INSERT INTO portal_appointments (
      patient_id,
      doctor_id,
      created_by_user_id,
      appointment_date,
      status,
      medical_field,
      severity,
      symptoms,
      reason,
      patient_notes,
      decision_notes
    ) VALUES (?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?)`,
    [
      patientId,
      doctorId,
      createdByUserId,
      appointmentDate,
      medicalField,
      severity,
      symptoms,
      reason,
      patientNotes,
      decisionNotes
    ]
  );
}

async function updateAppointment(appointmentId, payload) {
  return run(
    `UPDATE portal_appointments
    SET
      status = ?,
      severity = ?,
      appointment_date = ?,
      doctor_notes = ?,
      decision_notes = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?`,
    [
      payload.status,
      payload.severity,
      payload.appointmentDate,
      payload.doctorNotes,
      payload.decisionNotes,
      appointmentId
    ]
  );
}

async function completeAppointmentWithPrescription(appointmentId, prescriptionId, doctorNotes) {
  return run(
    `UPDATE portal_appointments
    SET
      prescription_id = ?,
      doctor_notes = ?,
      status = 'completed',
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?`,
    [prescriptionId, doctorNotes, appointmentId]
  );
}

module.exports = {
  completeAppointmentWithPrescription,
  createAppointment,
  fetchAppointments,
  getAppointmentById,
  updateAppointment
};
