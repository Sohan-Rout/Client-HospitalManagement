const bcrypt = require("bcryptjs");
const express = require("express");
const { authMiddleware } = require("../middleware/auth");
const {
  createUser,
  findUserConflictByEmailOrPhone,
  getUserById,
  getUserByIdentifier
} = require("../models/userModel");
const {
  isValidEmail,
  isValidPhone,
  sanitizeUser,
  signToken
} = require("../utils/portal");

const router = express.Router();

router.post("/register", async (req, res) => {
  try {
    const name = String(req.body.name || "").trim();
    const email = String(req.body.email || "").trim().toLowerCase();
    const phone = String(req.body.phone || "").trim();
    const password = String(req.body.password || "");

    if (!name || !email || !phone || !password) {
      res.status(400).json({ error: "Name, email, phone, and password are required." });
      return;
    }

    if (!isValidEmail(email)) {
      res.status(400).json({ error: "Please provide a valid email address." });
      return;
    }

    if (!isValidPhone(phone)) {
      res.status(400).json({ error: "Phone number must be 10 to 15 digits." });
      return;
    }

    if (password.length < 8) {
      res.status(400).json({ error: "Password must be at least 8 characters long." });
      return;
    }

    const existing = await findUserConflictByEmailOrPhone(email, phone);
    if (existing) {
      res.status(409).json({ error: "An account with this email or phone already exists." });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const insert = await createUser({
      name,
      email,
      phone,
      passwordHash,
      role: "patient",
      department: "General",
      notes: "Self-registered portal patient"
    });

    const user = await getUserById(insert.id);
    const token = signToken(user);

    res.status(201).json({
      success: true,
      token,
      user: sanitizeUser(user),
      redirect: `/dashboard/${user.role}`
    });
  } catch (error) {
    res.status(500).json({ error: "Unable to complete registration right now." });
  }
});

router.post("/login", async (req, res) => {
  try {
    const identifier = String(req.body.identifier || "").trim().toLowerCase();
    const password = String(req.body.password || "");

    if (!identifier || !password) {
      res.status(400).json({ error: "Email or phone and password are required." });
      return;
    }

    const user = await getUserByIdentifier(identifier);
    if (!user) {
      res.status(401).json({ error: "No account found for those credentials." });
      return;
    }

    const matches = await bcrypt.compare(password, user.password_hash);
    if (!matches) {
      res.status(401).json({ error: "Incorrect password." });
      return;
    }

    const token = signToken(user);

    res.json({
      success: true,
      token,
      user: sanitizeUser(user),
      redirect: `/dashboard/${user.role}`
    });
  } catch (error) {
    res.status(500).json({ error: "Unable to log in right now." });
  }
});

router.post("/logout", authMiddleware, (req, res) => {
  res.json({
    success: true,
    message: "Logged out successfully."
  });
});

router.get("/me", authMiddleware, async (req, res) => {
  res.json({
    success: true,
    user: req.user
  });
});

module.exports = router;
