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
  fetchPrescriptions,
  getLatestPrescriptionVersion,
  getPrescriptionByAppointment,
  updatePrescription
} = require("../models/prescriptionModel");
const {
  buildPrescriptionChangeSummary,
  safeJsonParse
} = require("../utils/portal");

const router = express.Router();

function formatExportDate(value) {
  if (!value) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapePdfText(value) {
  return String(value || "")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function sanitizeFilename(value) {
  return String(value || "prescription")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "prescription";
}

function buildPrescriptionLines(prescription) {
  const version = prescription.currentVersion || prescription.versions?.[0] || null;
  const medicines = version?.medicines || [];

  return [
    "ABC Hospital Prescription",
    "",
    `Prescription #: ${prescription.id}`,
    `Title: ${prescription.title || "Prescription"}`,
    `Patient: ${prescription.patient.name}`,
    `Doctor: ${prescription.doctor.name}${
      prescription.doctor.specialization ? ` (${prescription.doctor.specialization})` : ""
    }`,
    `Appointment: ${formatExportDate(prescription.appointmentDate)}`,
    `Reason: ${prescription.reason || "Not provided"}`,
    "",
    "Diagnosis",
    version?.diagnosis || "Not provided",
    "",
    "Medicines",
    ...(medicines.length
      ? medicines.map(
          (medicine, index) =>
            `${index + 1}. ${medicine.name || "Medicine"} - ${medicine.dosage || "Dose not set"} - ${
              medicine.timing || "Timing not set"
            }`
        )
      : ["No medicines listed."]),
    "",
    "Notes",
    version?.notes || "No notes added.",
    "",
    `Version: ${version?.versionNumber || prescription.currentVersionNumber || 1}`,
    `Generated: ${formatExportDate(new Date().toISOString())}`
  ];
}

function buildPrescriptionExcelDocument(prescription) {
  const version = prescription.currentVersion || prescription.versions?.[0] || null;
  const medicines = version?.medicines || [];

  const medicineRows = medicines.length
    ? medicines
        .map(
          (medicine, index) => `
            <tr>
              <td>${index + 1}</td>
              <td>${escapeHtml(medicine.name || "Medicine")}</td>
              <td>${escapeHtml(medicine.dosage || "Dose not set")}</td>
              <td>${escapeHtml(medicine.timing || "Timing not set")}</td>
            </tr>`
        )
        .join("")
    : `
      <tr>
        <td colspan="4">No medicines listed.</td>
      </tr>`;

  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(prescription.title || "Prescription")}</title>
  </head>
  <body>
    <table border="1">
      <tr><th colspan="2">ABC Hospital Prescription</th></tr>
      <tr><td>Prescription #</td><td>${prescription.id}</td></tr>
      <tr><td>Title</td><td>${escapeHtml(prescription.title || "Prescription")}</td></tr>
      <tr><td>Patient</td><td>${escapeHtml(prescription.patient.name)}</td></tr>
      <tr><td>Doctor</td><td>${escapeHtml(
        `${prescription.doctor.name}${
          prescription.doctor.specialization ? ` (${prescription.doctor.specialization})` : ""
        }`
      )}</td></tr>
      <tr><td>Visit date</td><td>${escapeHtml(formatExportDate(prescription.appointmentDate))}</td></tr>
      <tr><td>Reason</td><td>${escapeHtml(prescription.reason || "Not provided")}</td></tr>
      <tr><td>Diagnosis</td><td>${escapeHtml(version?.diagnosis || "Not provided")}</td></tr>
      <tr><td>Notes</td><td>${escapeHtml(version?.notes || "No notes added.")}</td></tr>
      <tr><td>Version</td><td>${version?.versionNumber || prescription.currentVersionNumber || 1}</td></tr>
      <tr><td>Generated</td><td>${escapeHtml(formatExportDate(new Date().toISOString()))}</td></tr>
    </table>
    <br />
    <table border="1">
      <tr>
        <th>#</th>
        <th>Medicine</th>
        <th>Dosage</th>
        <th>Timing</th>
      </tr>
      ${medicineRows}
    </table>
  </body>
</html>`;
}

function buildSimplePdfDocument(lines) {
  const content = [
    "BT",
    "/F1 12 Tf",
    "16 TL",
    "50 790 Td",
    ...lines.flatMap((line) => [`(${escapePdfText(line)}) Tj`, "T*"]),
    "ET"
  ].join("\n");
  const objects = {
    1: "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    2: "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    3: "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 1 0 R >> >> >>",
    4: `<< /Length ${Buffer.byteLength(content, "utf8")} >>\nstream\n${content}\nendstream`,
    5: "<< /Type /Catalog /Pages 2 0 R >>"
  };

  let pdf = "%PDF-1.4\n";
  const offsets = [];

  for (let index = 1; index <= 5; index += 1) {
    offsets[index] = Buffer.byteLength(pdf, "utf8");
    pdf += `${index} 0 obj\n${objects[index]}\nendobj\n`;
  }

  const xrefOffset = Buffer.byteLength(pdf, "utf8");
  pdf += "xref\n0 6\n0000000000 65535 f \n";

  for (let index = 1; index <= 5; index += 1) {
    pdf += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
  }

  pdf += `trailer\n<< /Size 6 /Root 5 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return Buffer.from(pdf, "utf8");
}

function buildPrescriptionPdf(prescription) {
  return buildSimplePdfDocument(buildPrescriptionLines(prescription).slice(0, 42));
}

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

router.get("/:id/export/:format", authMiddleware, async (req, res) => {
  try {
    const prescriptionId = Number(req.params.id);
    const format = String(req.params.format || "").trim().toLowerCase();

    if (!prescriptionId || !["pdf", "excel"].includes(format)) {
      res.status(400).json({ error: "Invalid prescription export request." });
      return;
    }

    const prescription = (await fetchPrescriptions(req.user)).find(
      (item) => item.id === prescriptionId
    );

    if (!prescription) {
      res.status(404).json({ error: "Prescription not found for this user." });
      return;
    }

    const fileStem = sanitizeFilename(`${prescription.title || "prescription"}-${prescription.id}`);

    if (format === "excel") {
      res.setHeader("Content-Type", "application/vnd.ms-excel; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="${fileStem}.xls"`);
      res.send(buildPrescriptionExcelDocument(prescription));
      return;
    }

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${fileStem}.pdf"`);
    res.send(buildPrescriptionPdf(prescription));
  } catch (error) {
    res.status(500).json({ error: "Unable to export the prescription right now." });
  }
});

module.exports = router;
