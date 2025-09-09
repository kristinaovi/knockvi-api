const express = require("express");
const bcrypt = require("bcrypt");
const router = express.Router();
const { db } = require("../utils/db");
const { authenticate } = require("../middleware/auth");
const { validateChangePassword } = require("../validators/changepassword-validator");

// PUT /api/change-password
router.put("/", authenticate, validateChangePassword, async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const userId = req.user.id; // Dari JWT token

  try {
    // 1. Ambil password lama user
    const [rows] = await db.query("SELECT password FROM users WHERE id = ?", [userId]);
    if (!rows || rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    // 2. Verifikasi oldPassword
    const isMatch = await bcrypt.compare(oldPassword, rows[0].password);
    if (!isMatch) {
      return res.status(400).json({ message: "Old password is incorrect" });
    }

    // 3. Hash password baru
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // 4. Update password di database
    await db.query("UPDATE users SET password = ? WHERE id = ?", [hashedPassword, userId]);

    res.json({ message: "Password changed successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
});

module.exports = router;
