// routes/production.js
const router = require('express').Router();
const { db } = require('../utils/db');
const { authenticate } = require('../middleware/auth');

router.post('/save', authenticate, async (req, res) => {
  const { plan, rows } = req.body;
  const conn = await db.getConnection();
  await conn.beginTransaction();

  try {
    // Update plan (misal remark, status, quantity_plan)
    if (plan && plan.id) {
      await conn.query(
        `UPDATE production_plan 
         SET machine_id=?, status=?, remark=?, quantity_plan=?, updated_by=? 
         WHERE id=?`,
        [
          plan.machine_id,
          plan.status,
          plan.remark,
          plan.quantity_plan,
          req.user.id,
          plan.id
        ]
      );
    }

    // Insert proses produksi (rows tabel hijau)
    if (rows && rows.length > 0) {
      for (let row of rows) {
        await conn.query(
          `INSERT INTO production_process
           (production_plan_id, date, output_shift1, output_shift2, total, created_by)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            plan.id,
            row.date,
            row.output_1,
            row.output_2,
            row.total,
            req.user.id
          ]
        );
      }
    }

    await conn.commit();
    res.json({ success: true, message: "Data berhasil disimpan" });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ error: "Gagal menyimpan data produksi" });
  } finally {
    conn.release();
  }
});

module.exports = router;
