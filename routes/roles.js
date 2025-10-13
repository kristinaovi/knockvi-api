const express = require('express');
const { db } = require('../utils/db')
const router = express.Router();

router.get('/', async (req, res) => {
  try {
    // Ambil semua role unik dari kolom users.role
    const [rows] = await db.query('SELECT DISTINCT role FROM users WHERE role IS NOT NULL');
    res.json(rows);
  } catch (err) {
    console.error('Error fetching roles:', err);
    res.status(500).json({ message: 'Error fetching roles' });
  }
});

module.exports = router;
