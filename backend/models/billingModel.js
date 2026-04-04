const { all } = require("../config/db");

async function fetchBillingRecords(currentUser) {
  if (!["patient", "receptionist", "admin", "super_admin"].includes(currentUser.role)) {
    return [];
  }

  const where = [];
  const params = [];

  if (currentUser.role === "patient") {
    where.push("b.patient_id = ?");
    params.push(currentUser.id);
  }

  const rows = await all(
    `SELECT
      b.id,
      b.patient_id,
      b.appointment_id,
      b.created_by_user_id,
      b.category,
      b.amount,
      b.status,
      b.due_date,
      b.paid_at,
      b.notes,
      b.created_at,
      b.updated_at,
      p.name AS patient_name,
      p.email AS patient_email,
      p.phone AS patient_phone,
      a.appointment_date,
      a.reason,
      d.name AS doctor_name,
      d.specialization AS doctor_specialization,
      c.name AS created_by_name
    FROM portal_bills b
    INNER JOIN portal_users p ON p.id = b.patient_id
    LEFT JOIN portal_appointments a ON a.id = b.appointment_id
    LEFT JOIN portal_users d ON d.id = a.doctor_id
    LEFT JOIN portal_users c ON c.id = b.created_by_user_id
    ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
    ORDER BY
      CASE b.status
        WHEN 'pending' THEN 0
        WHEN 'partial' THEN 1
        ELSE 2
      END,
      datetime(COALESCE(b.due_date, b.created_at)) ASC`,
    params
  );

  return rows.map((row) => ({
    id: row.id,
    category: row.category || "OPD Consultation",
    amount: Number(row.amount || 0),
    status: row.status,
    dueDate: row.due_date,
    paidAt: row.paid_at,
    notes: row.notes || "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    patient: {
      id: row.patient_id,
      name: row.patient_name,
      email: row.patient_email,
      phone: row.patient_phone
    },
    appointment: row.appointment_id
      ? {
          id: row.appointment_id,
          appointmentDate: row.appointment_date,
          reason: row.reason || "",
          doctorName: row.doctor_name || "Not assigned",
          doctorSpecialization: row.doctor_specialization || ""
        }
      : null,
    createdBy: {
      id: row.created_by_user_id,
      name: row.created_by_name || "System"
    }
  }));
}

module.exports = {
  fetchBillingRecords
};
