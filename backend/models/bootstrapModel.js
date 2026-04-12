const { fetchAdmissions } = require("./admissionModel");
const { fetchAppointments } = require("./appointmentModel");
const { fetchBillingRecords } = require("./billingModel");
const { fetchChatThreads } = require("./chatModel");
const { fetchEmergencyCases } = require("./emergencyModel");
const { fetchNotifications } = require("./notificationModel");
const { fetchPrescriptions } = require("./prescriptionModel");
const { buildReports } = require("./reportModel");
const { fetchDoctors, fetchPatients, fetchUsers } = require("./userModel");
const {
  APPOINTMENT_STATUSES,
  EMERGENCY_STATUSES,
  ROLE_LABELS,
  buildSummary,
  getCapabilities
} = require("../utils/portal");

async function buildBootstrapPayload(currentUser) {
  const doctors = await fetchDoctors();
  const patients = ["doctor", "receptionist", "staff", "admin", "super_admin"].includes(
    currentUser.role
  )
    ? await fetchPatients()
    : [];
  const users = await fetchUsers(currentUser);
  const appointments = await fetchAppointments(currentUser);
  const admissions = await fetchAdmissions(currentUser);
  const emergencyQueue = currentUser.role === "doctor" ? await fetchEmergencyCases(currentUser) : [];
  const chats = await fetchChatThreads(currentUser);
  const prescriptions = await fetchPrescriptions(currentUser);
  const billingRecords = await fetchBillingRecords(currentUser);
  const notifications = await fetchNotifications(currentUser);
  const reports = ["super_admin", "admin"].includes(currentUser.role)
    ? await buildReports()
    : null;

  return {
    user: currentUser,
    summary: buildSummary(currentUser, {
      users,
      doctors,
      patients,
      admissions,
      appointments,
      emergencyQueue,
      chats,
      prescriptions,
      billingRecords,
      notifications
    }),
    doctors,
    patients,
    admissions,
    users,
    appointments,
    emergencyQueue,
    chats,
    prescriptions,
    billingRecords,
    notifications,
    reports,
    capabilities: getCapabilities(currentUser.role),
    lookups: {
      roles: ROLE_LABELS,
      appointmentStatuses: APPOINTMENT_STATUSES,
      emergencyStatuses: EMERGENCY_STATUSES
    }
  };
}

module.exports = {
  buildBootstrapPayload
};
