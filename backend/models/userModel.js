const { all, get, run } = require("../config/db");
const { sanitizeUser } = require("../utils/portal");

async function getUserById(userId) {
  return get(
    `SELECT
      id,
      name,
      email,
      phone,
      google_sub,
      role,
      specialization,
      experience_years,
      department,
      notes,
      created_at
    FROM portal_users
    WHERE id = ?`,
    [userId]
  );
}

async function getUserByIdentifier(identifier) {
  return get(
    `SELECT
      id,
      name,
      email,
      phone,
      password_hash,
      google_sub,
      role,
      specialization,
      experience_years,
      department,
      notes,
      created_at
    FROM portal_users
    WHERE email = ? OR phone = ?`,
    [identifier, identifier]
  );
}

async function getUserByEmail(email) {
  return get(
    `SELECT
      id,
      name,
      email,
      phone,
      password_hash,
      google_sub,
      role,
      specialization,
      experience_years,
      department,
      notes,
      created_at
    FROM portal_users
    WHERE email = ?`,
    [email]
  );
}

async function getUserByGoogleSub(googleSub) {
  return get(
    `SELECT
      id,
      name,
      email,
      phone,
      password_hash,
      google_sub,
      role,
      specialization,
      experience_years,
      department,
      notes,
      created_at
    FROM portal_users
    WHERE google_sub = ?`,
    [googleSub]
  );
}

async function findUserConflictByEmailOrPhone(email, phone, excludeUserId = null) {
  if (excludeUserId) {
    return get(
      "SELECT id FROM portal_users WHERE (email = ? OR phone = ?) AND id != ?",
      [email, phone, excludeUserId]
    );
  }

  return get("SELECT id FROM portal_users WHERE email = ? OR phone = ?", [email, phone]);
}

async function createUser({
  name,
  email,
  phone,
  passwordHash,
  googleSub = null,
  role,
  specialization = "",
  experienceYears = 0,
  department = "General",
  notes = ""
}) {
  return run(
    `INSERT INTO portal_users (
      name,
      email,
      phone,
      password_hash,
      google_sub,
      role,
      specialization,
      experience_years,
      department,
      notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      name,
      email,
      phone,
      passwordHash,
      googleSub,
      role,
      specialization,
      experienceYears,
      department,
      notes
    ]
  );
}

async function linkUserGoogleSub(userId, googleSub) {
  return run(
    `UPDATE portal_users
    SET google_sub = ?
    WHERE id = ?`,
    [googleSub, userId]
  );
}

async function fetchDoctors() {
  const doctors = await all(
    `SELECT
      id,
      name,
      email,
      phone,
      role,
      specialization,
      experience_years,
      department,
      notes,
      created_at
    FROM portal_users
    WHERE role = 'doctor'
    ORDER BY name ASC`
  );

  return doctors.map(sanitizeUser);
}

async function fetchPatients() {
  const patients = await all(
    `SELECT
      id,
      name,
      email,
      phone,
      role,
      specialization,
      experience_years,
      department,
      notes,
      created_at
    FROM portal_users
    WHERE role = 'patient'
    ORDER BY name ASC`
  );

  return patients.map(sanitizeUser);
}

async function fetchUsers(currentUser, filters = {}) {
  if (!["super_admin", "admin", "receptionist"].includes(currentUser.role)) {
    return [];
  }

  const where = [];
  const params = [];

  if (filters.search) {
    where.push("(LOWER(name) LIKE ? OR LOWER(email) LIKE ? OR phone LIKE ?)");
    params.push(
      `%${filters.search.toLowerCase()}%`,
      `%${filters.search.toLowerCase()}%`,
      `%${filters.search}%`
    );
  }

  if (filters.role) {
    where.push("role = ?");
    params.push(filters.role);
  }

  if (currentUser.role === "admin") {
    where.push("role != 'super_admin'");
  }

  if (currentUser.role === "receptionist") {
    where.push("role IN ('patient', 'doctor')");
  }

  const users = await all(
    `SELECT
      id,
      name,
      email,
      phone,
      role,
      specialization,
      experience_years,
      department,
      notes,
      created_at
    FROM portal_users
    ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
    ORDER BY created_at DESC`,
    params
  );

  return users.map(sanitizeUser);
}

async function getUserForEdit(userId) {
  return get(
    `SELECT
      id,
      name,
      email,
      phone,
      role,
      specialization,
      experience_years,
      department,
      notes
    FROM portal_users
    WHERE id = ?`,
    [userId]
  );
}

async function updateUser(userId, payload) {
  const shouldUpdatePassword = Boolean(payload.passwordHash);

  return run(
    `UPDATE portal_users
    SET
      name = ?,
      email = ?,
      phone = ?,
      role = ?,
      specialization = ?,
      experience_years = ?,
      department = ?,
      notes = ?
      ${shouldUpdatePassword ? ", password_hash = ?" : ""}
    WHERE id = ?`,
    [
      payload.name,
      payload.email,
      payload.phone,
      payload.role,
      payload.specialization,
      payload.experienceYears,
      payload.department,
      payload.notes,
      ...(shouldUpdatePassword ? [payload.passwordHash] : []),
      userId
    ]
  );
}

async function getUserDeleteTarget(userId) {
  return get("SELECT id, role, name FROM portal_users WHERE id = ?", [userId]);
}

async function countLinkedRecords(userId) {
  return get(
    `SELECT
      (
        (SELECT COUNT(*) FROM portal_appointments WHERE patient_id = ? OR doctor_id = ? OR created_by_user_id = ?)
        + (SELECT COUNT(*) FROM portal_emergency_cases WHERE patient_user_id = ? OR added_by_user_id = ? OR assigned_doctor_id = ? OR assigned_nurse_id = ?)
        + (SELECT COUNT(*) FROM portal_chats WHERE patient_id = ? OR doctor_id = ?)
        + (SELECT COUNT(*) FROM portal_messages WHERE sender_id = ?)
        + (SELECT COUNT(*) FROM portal_prescriptions WHERE patient_id = ? OR doctor_id = ?)
        + (SELECT COUNT(*) FROM portal_notifications WHERE user_id = ?)
      ) AS total`,
    [
      userId,
      userId,
      userId,
      userId,
      userId,
      userId,
      userId,
      userId,
      userId,
      userId,
      userId,
      userId,
      userId
    ]
  );
}

async function deleteUser(userId) {
  return run("DELETE FROM portal_users WHERE id = ?", [userId]);
}

async function getRecipientsByRoles(roles) {
  if (!roles.length) {
    return [];
  }

  const placeholders = roles.map(() => "?").join(", ");
  const rows = await all(
    `SELECT id FROM portal_users WHERE role IN (${placeholders})`,
    roles
  );

  return rows.map((row) => row.id);
}

async function getUserIdentityById(userId) {
  return get("SELECT id, role, name FROM portal_users WHERE id = ?", [userId]);
}

async function getUserByIdAndRole(userId, role) {
  return get(
    "SELECT id, name, specialization, role FROM portal_users WHERE id = ? AND role = ?",
    [userId, role]
  );
}

async function getUserCount() {
  return get("SELECT COUNT(*) AS total FROM portal_users");
}

module.exports = {
  countLinkedRecords,
  createUser,
  deleteUser,
  fetchDoctors,
  fetchPatients,
  fetchUsers,
  findUserConflictByEmailOrPhone,
  getRecipientsByRoles,
  getUserByEmail,
  getUserById,
  getUserByIdAndRole,
  getUserByIdentifier,
  getUserByGoogleSub,
  getUserCount,
  getUserDeleteTarget,
  getUserForEdit,
  getUserIdentityById,
  linkUserGoogleSub,
  updateUser
};
