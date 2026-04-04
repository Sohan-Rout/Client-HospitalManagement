const express = require("express");
const { authMiddleware, requireRole } = require("../middleware/auth");
const {
  createChat,
  createMessage,
  findChatByParticipants,
  touchChat
} = require("../models/chatModel");
const { createNotifications } = require("../models/notificationModel");
const { getUserIdentityById } = require("../models/userModel");

const router = express.Router();

router.post(
  "/send",
  authMiddleware,
  requireRole("patient", "doctor"),
  async (req, res) => {
    try {
      const recipientId = Number(req.body.recipientId);
      const body = String(req.body.body || "").trim();

      if (!recipientId || !body) {
        res.status(400).json({ error: "Recipient and message body are required." });
        return;
      }

      const recipient = await getUserIdentityById(recipientId);
      if (!recipient) {
        res.status(404).json({ error: "Recipient not found." });
        return;
      }

      if (req.user.role === recipient.role) {
        res.status(400).json({ error: "Messages must be between a patient and a doctor." });
        return;
      }

      const patientId = req.user.role === "patient" ? req.user.id : recipient.id;
      const doctorId = req.user.role === "doctor" ? req.user.id : recipient.id;

      let chat = await findChatByParticipants(patientId, doctorId);
      if (!chat) {
        const insert = await createChat(patientId, doctorId);
        chat = { id: insert.id };
      }

      await createMessage(chat.id, req.user.id, body);
      await touchChat(chat.id);

      await createNotifications([recipient.id], {
        type: "chat",
        severity: "medium",
        title: "New chat message",
        body: `${req.user.name} sent you a new message.`,
        meta: {
          section: "chat",
          chatId: chat.id
        }
      });

      res.json({
        success: true,
        chatId: chat.id
      });
    } catch (error) {
      res.status(500).json({ error: "Unable to send the message." });
    }
  }
);

module.exports = router;
