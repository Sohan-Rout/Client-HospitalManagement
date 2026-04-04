const express = require("express");
const { authMiddleware, requireRole } = require("../middleware/auth");
const {
  completeAppointmentWithPrescription,
  getAppointmentById
} = require("../models/appointmentModel");
const { createNotifications } = require("../models/notificationModel");
const {
  addPrescriptionVersion,
  createPrescription,
  getLatestPrescriptionVersion,
  getPrescriptionByAppointment,
  updatePrescription
} = require("../models/prescriptionModel");
const {
  buildPrescriptionChangeSummary,
  safeJsonParse
} = require("../utils/portal");

const router = express.Router();

router.post(
  "/",
  authMiddleware,
  requireRole("doctor"),
  async (req, res) => {
    try {
      const appointmentId = Number(req.body.appointmentId);
      const title = String(req.body.title || "").trim();
      const diagnosis = String(req.body.diagnosis || "").trim();
      const notes = String(req.body.notes || "").trim();
      const doctorNotes = String(req.body.doctorNotes || "").trim();
      const medicines = Array.isArray(req.body.medicines)
        ? req.body.medicines
        : safeJsonParse(req.body.medicines, []);

      if (!appointmentId || !medicines.length) {
        res
          .status(400)
          .json({ error: "Appointment and at least one medicine are required." });
        return;
      }

      const appointment = await getAppointmentById(appointmentId);
      if (!appointment || appointment.doctor_id !== req.user.id) {
        res.status(404).json({ error: "Appointment not found for this doctor." });
        return;
      }

      let prescription = await getPrescriptionByAppointment(appointmentId);
      if (!prescription) {
        const insert = await createPrescription({
          appointmentId,
          patientId: appointment.patient_id,
          doctorId: req.user.id,
          title: title || "Prescription"
        });

        prescription = {
          id: insert.id,
          current_version_number: 0,
          title: title || "Prescription"
        };
      }

      const previousVersion = await getLatestPrescriptionVersion(prescription.id);
      const nextVersion = {
        diagnosis,
        medicines,
        notes
      };
      const versionNumber = Number(prescription.current_version_number || 0) + 1;
      const changeSummary = buildPrescriptionChangeSummary(
        previousVersion
          ? {
              diagnosis: previousVersion.diagnosis,
              medicines: safeJsonParse(previousVersion.medicines_json, []) || [],
              notes: previousVersion.notes
            }
          : null,
        nextVersion
      );

      await addPrescriptionVersion({
        prescriptionId: prescription.id,
        versionNumber,
        diagnosis,
        medicines,
        notes,
        changeSummary,
        createdByUserId: req.user.id
      });

      await updatePrescription(
        prescription.id,
        title || prescription.title || "Prescription",
        versionNumber
      );

      await completeAppointmentWithPrescription(appointmentId, prescription.id, doctorNotes);

      await createNotifications([appointment.patient_id], {
        type: "prescription",
        severity: "medium",
        title: "Prescription updated",
        body: `A new prescription version is ready for appointment #${appointmentId}.`,
        meta: {
          section: "prescriptions",
          prescriptionId: prescription.id
        }
      });

      res.json({
        success: true,
        prescriptionId: prescription.id,
        versionNumber
      });
    } catch (error) {
      res.status(500).json({ error: "Unable to save the prescription." });
    }
  }
);

module.exports = router;
