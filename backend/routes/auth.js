const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const express = require("express");
const { OAuth2Client } = require("google-auth-library");
const { authMiddleware } = require("../middleware/auth");
const {
  createUser,
  findUserConflictByEmailOrPhone,
  getUserByEmail,
  getUserById,
  getUserByIdentifier,
  getUserByGoogleSub,
  linkUserGoogleSub
} = require("../models/userModel");
const {
  isValidEmail,
  isValidPhone,
  sanitizeUser,
  signToken
} = require("../utils/portal");

const router = express.Router();
let googleClient = null;

function getGoogleClientId() {
  return String(process.env.GOOGLE_CLIENT_ID || "").trim();
}

function getGoogleClient() {
  const clientId = getGoogleClientId();

  if (!clientId) {
    return null;
  }

  if (!googleClient) {
    googleClient = new OAuth2Client(clientId);
  }

  return googleClient;
}

function createGooglePhone(googleSub) {
  const digits = String(googleSub || "").replace(/\D/g, "");
  return `99${digits.slice(-13).padStart(13, "0")}`;
}

async function verifyGoogleCredential(credential) {
  const clientId = getGoogleClientId();
  const client = getGoogleClient();

  if (!clientId || !client) {
    const error = new Error("Google sign-in is not configured yet.");
    error.status = 503;
    throw error;
  }

  const ticket = await client.verifyIdToken({
    idToken: credential,
    audience: clientId
  });
  const payload = ticket.getPayload();

  if (!payload?.sub || !payload?.email) {
    const error = new Error("Google account details were incomplete.");
    error.status = 400;
    throw error;
  }

  if (!payload.email_verified) {
    const error = new Error("Please use a Google account with a verified email address.");
    error.status = 400;
    throw error;
  }

  return payload;
}

router.get("/google/config", (req, res) => {
  const clientId = getGoogleClientId();

  res.json({
    success: true,
    enabled: Boolean(clientId),
    clientId: clientId || "",
    mode: clientId ? "popup" : "disabled"
  });
});

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

router.post("/google", async (req, res) => {
  try {
    const credential = String(req.body.credential || "").trim();

    if (!credential) {
      res.status(400).json({ error: "Google credential is required." });
      return;
    }

    const payload = await verifyGoogleCredential(credential);
    const email = String(payload.email || "").trim().toLowerCase();
    let user = await getUserByGoogleSub(payload.sub);

    if (!user) {
      user = await getUserByEmail(email);

      if (user?.google_sub && user.google_sub !== payload.sub) {
        res.status(409).json({
          error: "This email is already linked to a different Google account."
        });
        return;
      }

      if (user && !user.google_sub) {
        await linkUserGoogleSub(user.id, payload.sub);
        user = await getUserByGoogleSub(payload.sub);
      }
    }

    if (!user) {
      const passwordHash = await bcrypt.hash(
        crypto.randomBytes(32).toString("hex"),
        10
      );
      const phone = createGooglePhone(payload.sub);
      const conflict = await findUserConflictByEmailOrPhone(email, phone);

      if (conflict) {
        res.status(409).json({
          error: "Google sign-in could not create an account because this profile already exists."
        });
        return;
      }

      const insert = await createUser({
        name: String(payload.name || payload.given_name || "Google User").trim(),
        email,
        phone,
        passwordHash,
        googleSub: payload.sub,
        role: "patient",
        department: "General",
        notes: "Google sign-in patient account"
      });

      user = await getUserById(insert.id);
    } else {
      user = await getUserById(user.id);
    }

    const token = signToken(user);

    res.json({
      success: true,
      token,
      user: sanitizeUser(user),
      redirect: `/dashboard/${user.role}`
    });
  } catch (error) {
    res.status(error.status || 500).json({
      error: error.status ? error.message : "Unable to complete Google sign-in right now."
    });
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
