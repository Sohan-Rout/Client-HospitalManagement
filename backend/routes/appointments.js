const express = require("express");
const { authMiddleware, requireRole } = require("../middleware/auth");
const {
  createAppointment,
  getAppointmentById,
  updateAppointment
} = require("../models/appointmentModel");
const { createNotifications } = require("../models/notificationModel");
const { getUserByIdAndRole } = require("../models/userModel");
const {
  APPOINTMENT_STATUSES,
  normalizeMedicalField,
  normalizeSeverity
} = require("../utils/portal");

const router = express.Router();

router.post(
  "/",
  authMiddleware,
  requireRole("patient", "receptionist", "admin", "super_admin"),
  async (req, res) => {
    try {
      const doctorId = Number(req.body.doctorId);
      const patientId = req.user.role === "patient" ? req.user.id : Number(req.body.patientId);
      const appointmentDate = String(req.body.appointmentDate || req.body.date || "").trim();
      const reason = String(req.body.reason || "").trim();
      const symptoms = String(req.body.symptoms || "").trim();
      const patientNotes = String(req.body.patientNotes || "").trim();
      const severity = normalizeSeverity(req.body.severity || req.body.emergencyLevel);
      const requestedMedicalField = normalizeMedicalField(
        req.body.medicalField || req.body.specialization
      );

      if (!doctorId || !patientId || !appointmentDate || !reason) {
        res
          .status(400)
          .json({ error: "Patient, doctor, appointment date, and reason are required." });
        return;
      }

      const doctor = await getUserByIdAndRole(doctorId, "doctor");
      const patient = await getUserByIdAndRole(patientId, "patient");
      const doctorMedicalField = normalizeMedicalField(doctor?.specialization || "general");

      if (!doctor || !patient) {
        res.status(404).json({ error: "Patient or doctor could not be found." });
        return;
      }

      if (requestedMedicalField && requestedMedicalField !== doctorMedicalField) {
        res.status(400).json({
          error: "Please choose a doctor from the same specialization field."
        });
        return;
      }

      const insert = await createAppointment({
        patientId,
        doctorId,
        createdByUserId: req.user.id,
        appointmentDate,
        medicalField: requestedMedicalField || doctorMedicalField || "general",
        severity,
        symptoms,
        reason,
        patientNotes,
        decisionNotes: "Awaiting doctor confirmation."
      });

      await createNotifications([doctorId, patientId], {
        type: "appointment",
        severity: severity >= 4 ? "critical" : "medium",
        title: "New appointment request",
        body: `${patient.name} booked a ${doctor.specialization || "general"} visit with severity ${severity}.`,
        meta: {
          section: "appointments",
          appointmentId: insert.id
        }
      });

      res.status(201).json({
        success: true,
        appointmentId: insert.id
      });
    } catch (error) {
      res.status(500).json({ error: "Unable to book the appointment." });
    }
  }
);

router.patch(
  "/:id",
  authMiddleware,
  requireRole("patient", "doctor", "receptionist", "admin", "super_admin"),
  async (req, res) => {
    try {
      const appointmentId = Number(req.params.id);
      const appointment = await getAppointmentById(appointmentId);

      if (!appointment) {
        res.status(404).json({ error: "Appointment not found." });
        return;
      }

      if (req.user.role === "patient" && appointment.patient_id !== req.user.id) {
        res.status(403).json({ error: "You can only update your own appointments." });
        return;
      }

      if (req.user.role === "doctor" && appointment.doctor_id !== req.user.id) {
        res.status(403).json({ error: "You can only update appointments assigned to you." });
        return;
      }

      if (
        req.user.role === "doctor" &&
        normalizeMedicalField(req.user.specialization || req.user.department) !==
          normalizeMedicalField(appointment.medical_field || "")
      ) {
        res.status(403).json({
          error: "You can only update severity for appointments in your specialization."
        });
        return;
      }

      let status = String(req.body.status || appointment.status).trim().toLowerCase();
      const action = String(req.body.action || "").trim().toLowerCase();
      const doctorNotes = String(
        req.body.doctorNotes !== undefined ? req.body.doctorNotes : appointment.doctor_notes || ""
      ).trim();
      const decisionNotes = String(
        req.body.decisionNotes !== undefined
          ? req.body.decisionNotes
          : appointment.decision_notes || ""
      ).trim();
      const severity = normalizeSeverity(req.body.severity || appointment.severity);
      const appointmentDate = String(
        req.body.appointmentDate || req.body.date || appointment.appointment_date
      ).trim();

      if (req.user.role === "patient") {
        status = "cancelled";
      } else if (req.user.role === "doctor") {
        if (action === "accept") {
          status = "accepted";
        } else if (action === "reject") {
          status = "rejected";
        } else if (action === "start") {
          status = "in_progress";
        } else if (action === "complete") {
          status = "completed";
        }
      }

      if (!APPOINTMENT_STATUSES.includes(status)) {
        res.status(400).json({ error: "Invalid appointment status." });
        return;
      }

      await updateAppointment(appointmentId, {
        status,
        severity,
        appointmentDate,
        doctorNotes,
        decisionNotes
      });

      await createNotifications([appointment.patient_id, appointment.doctor_id], {
        type: "appointment",
        severity: severity >= 4 ? "critical" : "medium",
        title: "Appointment updated",
        body: `Appointment #${appointmentId} moved to ${status.replace(/_/g, " ")} status.`,
        meta: {
          section: "appointments",
          appointmentId
        }
      });

      res.json({
        success: true,
        message: "Appointment updated successfully."
      });
    } catch (error) {
      res.status(500).json({ error: "Unable to update the appointment." });
    }
  }
);

module.exports = router;
