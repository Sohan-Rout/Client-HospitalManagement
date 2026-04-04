const jwt = require("jsonwebtoken");
const { getUserById } = require("../models/userModel");
const { sanitizeUser } = require("../utils/portal");

async function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7)
      : req.headers["x-auth-token"];

    if (!token) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    const jwtSecret = process.env.JWT_SECRET || "abc-hospital-super-secret";
    const payload = jwt.verify(token, jwtSecret);
    const user = await getUserById(payload.sub);

    if (!user) {
      res.status(401).json({ error: "Session is no longer valid" });
      return;
    }

    req.user = sanitizeUser(user);
    next();
  } catch (error) {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ error: "You do not have access to this resource" });
      return;
    }

    next();
  };
}

module.exports = {
  authMiddleware,
  requireRole
};
