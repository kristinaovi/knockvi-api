const router = require('express').Router();
const { db } = require('../utils/db');
const { authenticate } = require('../middleware/auth');

// GET /customers → ambil semua daftar customer
router.get('/', authenticate, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT id, code, name, address, created_at, updated_at
       FROM customers
       ORDER BY name ASC`
    );
    res.json(rows);
  } catch (err) {
    console.error('GET /customers error', err);
    res.status(500).json({ message: 'Failed to fetch customers' });
  }
});

module.exports = router;
