const bcrypt = require("bcryptjs");
const express = require("express");
const { authMiddleware, requireRole } = require("../middleware/auth");
const {
  countLinkedRecords,
  createUser,
  deleteUser,
  fetchUsers,
  findUserConflictByEmailOrPhone,
  getUserById,
  getUserDeleteTarget,
  getUserForEdit,
  updateUser
} = require("../models/userModel");
const {
  DASHBOARD_ROLES,
  canCreateRole,
  canEditUser,
  isValidEmail,
  isValidPhone,
  sanitizeUser
} = require("../utils/portal");

const router = express.Router();

router.post(
  "/",
  authMiddleware,
  requireRole("super_admin"),
  async (req, res) => {
    try {
      const role = String(req.body.role || "patient").trim().toLowerCase();
      const name = String(req.body.name || "").trim();
      const email = String(req.body.email || "").trim().toLowerCase();
      const phone = String(req.body.phone || "").trim();
      const password = String(req.body.password || "");
      const specialization = String(req.body.specialization || "").trim();
      const experienceYears = Number(req.body.experienceYears || 0);
      const department = String(req.body.department || "").trim();
      const notes = String(req.body.notes || "").trim();

      if (!canCreateRole(req.user, role)) {
        res.status(403).json({ error: "You cannot create that role." });
        return;
      }

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

      if (role === "doctor" && !specialization) {
        res.status(400).json({ error: "Doctor accounts require a specialization." });
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
        role,
        specialization: role === "doctor" ? specialization : "",
        experienceYears: role === "doctor" ? experienceYears : 0,
        department: department || (role === "doctor" ? specialization : "General"),
        notes
      });

      const createdUser = await getUserById(insert.id);

      res.status(201).json({
        success: true,
        user: sanitizeUser(createdUser)
      });
    } catch (error) {
      res.status(500).json({ error: "Unable to create the user." });
    }
  }
);

router.patch(
  "/:id",
  authMiddleware,
  requireRole("super_admin", "admin", "receptionist"),
  async (req, res) => {
    try {
      const userId = Number(req.params.id);
      const existing = await getUserForEdit(userId);

      if (!existing) {
        res.status(404).json({ error: "User not found." });
        return;
      }

      const nextRole = String(req.body.role || existing.role).trim().toLowerCase();

      if (!DASHBOARD_ROLES.includes(nextRole)) {
        res.status(400).json({ error: "Invalid role supplied." });
        return;
      }

      if (!canEditUser(req.user, existing, nextRole)) {
        res.status(403).json({ error: "You cannot edit this user." });
        return;
      }

      const name = String(req.body.name || existing.name).trim();
      const email = String(req.body.email || existing.email).trim().toLowerCase();
      const phone = String(req.body.phone || existing.phone).trim();
      const specialization = String(
        req.body.specialization !== undefined ? req.body.specialization : existing.specialization
      ).trim();
      const experienceYears = Number(
        req.body.experienceYears !== undefined
          ? req.body.experienceYears
          : existing.experience_years
      );
      const department = String(
        req.body.department !== undefined ? req.body.department : existing.department
      ).trim();
      const notes = String(req.body.notes !== undefined ? req.body.notes : existing.notes).trim();
      const password = String(req.body.password || "").trim();

      if (!name || !email || !phone) {
        res.status(400).json({ error: "Name, email, and phone are required." });
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

      const conflict = await findUserConflictByEmailOrPhone(email, phone, userId);
      if (conflict) {
        res.status(409).json({ error: "Email or phone is already in use by another user." });
        return;
      }

      const nextPayload = {
        name,
        email,
        phone,
        role: nextRole,
        specialization: nextRole === "doctor" ? specialization : "",
        experienceYears: nextRole === "doctor" ? experienceYears : 0,
        department:
          department || (nextRole === "doctor" ? specialization : existing.department || "General"),
        notes
      };

      if (password) {
        nextPayload.passwordHash = await bcrypt.hash(password, 10);
      }

      await updateUser(userId, nextPayload);

      const updatedUser = await getUserById(userId);

      res.json({
        success: true,
        user: sanitizeUser(updatedUser)
      });
    } catch (error) {
      res.status(500).json({ error: "Unable to update the user." });
    }
  }
);

router.delete(
  "/:id",
  authMiddleware,
  requireRole("super_admin"),
  async (req, res) => {
    try {
      const userId = Number(req.params.id);

      if (userId === req.user.id) {
        res.status(400).json({ error: "You cannot delete your own account." });
        return;
      }

      const target = await getUserDeleteTarget(userId);
      if (!target) {
        res.status(404).json({ error: "User not found." });
        return;
      }

      const linkedRecords = await countLinkedRecords(userId);
      if (linkedRecords && linkedRecords.total > 0) {
        res
          .status(400)
          .json({ error: "This user has linked records and cannot be removed in the demo." });
        return;
      }

      await deleteUser(userId);

      res.json({
        success: true,
        message: `${target.name} was removed successfully.`
      });
    } catch (error) {
      res.status(500).json({ error: "Unable to delete the user." });
    }
  }
);

router.get(
  "/",
  authMiddleware,
  requireRole("super_admin", "admin", "receptionist"),
  async (req, res) => {
    try {
      const filters = {
        search: String(req.query.search || "").trim(),
        role: String(req.query.role || "").trim().toLowerCase()
      };

      const users = await fetchUsers(req.user, filters);
      res.json({
        success: true,
        users: users.map(sanitizeUser)
      });
    } catch (error) {
      res.status(500).json({ error: "Unable to fetch users." });
    }
  }
);

module.exports = router;
