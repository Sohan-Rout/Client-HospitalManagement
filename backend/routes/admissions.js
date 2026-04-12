const express = require("express");
const { authMiddleware, requireRole } = require("../middleware/auth");
const { getAdmissionById, updateAdmissionShift } = require("../models/admissionModel");

const router = express.Router();

router.patch("/:id/shift", authMiddleware, requireRole("doctor", "nurse"), async (req, res) => {
  try {
    const admissionId = Number(req.params.id);
    const shiftedTo = String(req.body.shiftedTo || "").trim();

    if (!shiftedTo) {
      res.status(400).json({ error: "Shift location is required." });
      return;
    }

    const admission = await getAdmissionById(admissionId);

    if (!admission) {
      res.status(404).json({ error: "Admission record not found." });
      return;
    }

    if (req.user.role === "doctor" && Number(admission.admitted_by_doctor_id) !== Number(req.user.id)) {
      res.status(403).json({ error: "You can only update your own admitted patients." });
      return;
    }

    await updateAdmissionShift(admissionId, shiftedTo, req.user.id);

    res.json({
      success: true,
      shiftedTo
    });
  } catch (error) {
    res.status(500).json({ error: "Unable to update shift location." });
  }
});

module.exports = router;
