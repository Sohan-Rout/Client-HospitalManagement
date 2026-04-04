const express = require("express");
const { dbPath } = require("../config/db");
const { getUserCount } = require("../models/userModel");

const router = express.Router();

router.get("/health", async (req, res) => {
  const userCount = await getUserCount();

  res.json({
    status: "OK",
    database: dbPath,
    users: userCount.total,
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
