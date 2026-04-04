const express = require("express");
const { authMiddleware } = require("../middleware/auth");
const {
  markAllNotificationsRead,
  markNotificationRead
} = require("../models/notificationModel");

const router = express.Router();

router.patch("/:id/read", authMiddleware, async (req, res) => {
  try {
    const notificationId = Number(req.params.id);
    await markNotificationRead(notificationId, req.user.id);

    res.json({
      success: true
    });
  } catch (error) {
    res.status(500).json({ error: "Unable to update the notification." });
  }
});

router.post("/read-all", authMiddleware, async (req, res) => {
  try {
    await markAllNotificationsRead(req.user.id);

    res.json({
      success: true
    });
  } catch (error) {
    res.status(500).json({ error: "Unable to mark notifications as read." });
  }
});

module.exports = router;
