const express = require("express");
const { authMiddleware, requireRole } = require("../middleware/auth");
const {
  createEmergencyCase,
  getEmergencyCaseById,
  updateEmergencyCase
} = require("../models/emergencyModel");
const { createNotifications } = require("../models/notificationModel");
const { getRecipientsByRoles } = require("../models/userModel");
const {
  EMERGENCY_STATUSES,
  normalizeSeverity,
  uniqueIds
} = require("../utils/portal");

const router = express.Router();

router.post(
  "/",
  authMiddleware,
  requireRole("staff", "receptionist", "nurse", "doctor", "admin", "super_admin"),
  async (req, res) => {
    try {
      const patientName = String(req.body.patientName || "").trim();
      const patientAge = Number(req.body.patientAge || req.body.age || 0);
      const symptoms = String(req.body.symptoms || "").trim();
      const severity = normalizeSeverity(req.body.severity);
      const status = String(req.body.status || "waiting").trim().toLowerCase();
      const notes = String(req.body.notes || "").trim();
      const patientUserId = req.body.patientUserId ? Number(req.body.patientUserId) : null;
      const assignedDoctorId = req.body.assignedDoctorId ? Number(req.body.assignedDoctorId) : null;
      const assignedNurseId = req.body.assignedNurseId ? Number(req.body.assignedNurseId) : null;

      if (!patientName || !patientAge || !symptoms) {
        res.status(400).json({ error: "Patient name, age, and symptoms are required." });
        return;
      }

      if (!EMERGENCY_STATUSES.includes(status)) {
        res.status(400).json({ error: "Invalid emergency status." });
        return;
      }

      const insert = await createEmergencyCase({
        patientName,
        patientAge,
        symptoms,
        severity,
        status,
        patientUserId,
        addedByUserId: req.user.id,
        assignedDoctorId,
        assignedNurseId,
        notes
      });

      const recipients = [
        ...(await getRecipientsByRoles(["super_admin", "admin", "nurse"])),
        assignedDoctorId,
        assignedNurseId,
        patientUserId
      ];

      await createNotifications(recipients, {
        type: "emergency",
        severity: severity >= 4 ? "critical" : "medium",
        title: severity >= 4 ? "Critical patient added" : "Emergency queue updated",
        body: `${patientName} entered the emergency queue with severity ${severity}.`,
        meta: {
          section: "queue",
          emergencyId: insert.id
        }
      });

      res.status(201).json({
        success: true,
        emergencyId: insert.id
      });
    } catch (error) {
      res.status(500).json({ error: "Unable to add the emergency case." });
    }
  }
);

router.patch(
  "/:id",
  authMiddleware,
  requireRole("staff", "receptionist", "nurse", "doctor", "admin", "super_admin"),
  async (req, res) => {
    try {
      const emergencyId = Number(req.params.id);
      const existing = await getEmergencyCaseById(emergencyId);

      if (!existing) {
        res.status(404).json({ error: "Emergency case not found." });
        return;
      }

      const severity = normalizeSeverity(req.body.severity || existing.severity);
      const status = String(req.body.status || existing.status).trim().toLowerCase();
      const notes = String(req.body.notes !== undefined ? req.body.notes : existing.notes).trim();
      const assignedDoctorId =
        req.body.assignedDoctorId !== undefined
          ? Number(req.body.assignedDoctorId) || null
          : existing.assigned_doctor_id;
      const assignedNurseId =
        req.body.assignedNurseId !== undefined
          ? Number(req.body.assignedNurseId) || null
          : existing.assigned_nurse_id;

      if (!EMERGENCY_STATUSES.includes(status)) {
        res.status(400).json({ error: "Invalid emergency status." });
        return;
      }

      await updateEmergencyCase(emergencyId, {
        severity,
        status,
        notes,
        assignedDoctorId,
        assignedNurseId
      });

      await createNotifications(
        uniqueIds([
          existing.patient_user_id,
          assignedDoctorId,
          assignedNurseId,
          ...(await getRecipientsByRoles(["super_admin", "admin"]))
        ]),
        {
          type: "emergency",
          severity: severity >= 4 ? "critical" : "medium",
          title: "Emergency case updated",
          body: `Emergency case #${emergencyId} is now ${status.replace(/_/g, " ")}.`,
          meta: {
            section: "queue",
            emergencyId
          }
        }
      );

      res.json({
        success: true,
        message: "Emergency case updated successfully."
      });
    } catch (error) {
      res.status(500).json({ error: "Unable to update the emergency case." });
    }
  }
);

module.exports = router;
