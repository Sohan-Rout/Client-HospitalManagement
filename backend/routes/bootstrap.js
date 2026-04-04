const express = require("express");
const { authMiddleware } = require("../middleware/auth");
const { buildBootstrapPayload } = require("../models/bootstrapModel");

const router = express.Router();

router.get("/bootstrap", authMiddleware, async (req, res) => {
  try {
    const payload = await buildBootstrapPayload(req.user);

    res.json({
      success: true,
      ...payload
    });
  } catch (error) {
    res.status(500).json({ error: "Unable to load dashboard data." });
  }
});

module.exports = router;
