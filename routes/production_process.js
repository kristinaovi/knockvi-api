const router = require('express').Router()
const { db } = require('../utils/db')
const { insertOrUpdate, softDelete, buildFilterQuery, applySorting } = require('../utils/helpers')
const { validateProgProc } = require('../validators/progproc.validator')
const { validationResult } = require('express-validator')
const { Parser } = require('json2csv')
const { authenticate } = require('../middleware/auth')

// GET /production_process
router.get('/', authenticate, async (req, res) => {
  const withTrashed = req.query.with_trashed === 'true'
  const { filterSql, values } = buildFilterQuery(req.query, 'pr.', withTrashed)
  const sortClause = applySorting(req.query, 'pr.id')
  const [rows] = await db.query(`
    SELECT pr.*, pp.status AS plan_status
    FROM production_process pr
    LEFT JOIN production_plan pp ON pr.production_plan_id = pp.id
    ${filterSql}${sortClause}
  `, values)
  res.json(rows)
})

// POST /production_process
router.post('/', authenticate, validateProgProc, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

  try {
    const result = await insertOrUpdate('production_process', req.body, req.user.id);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Gagal menyimpan data produksi harian" });
  }
});

// POST /production_process/bulk
router.post('/bulk', authenticate, async (req, res) => {
  const { production_plan_id, rows } = req.body;
  if (!production_plan_id || !Array.isArray(rows)) {
    return res.status(400).json({ error: "production_plan_id dan rows wajib diisi" });
  }

  try {
    // hapus data lama (biar tidak duplikat)
    await db.query(`DELETE FROM production_process WHERE production_plan_id = ?`, [production_plan_id]);

    // insert ulang semua rows
    for (const row of rows) {
      await insertOrUpdate('production_process', {
        production_plan_id,
        date: row.date,
        output_1: row.output_1,
        output_2: row.output_2,
      }, req.user.id);
    }

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Gagal menyimpan data produksi harian (bulk)" });
  }
});


// GET /production_process/export/csv
router.get('/export/csv', authenticate, async (req, res) => {
  const [rows] = await db.query('SELECT * FROM production_process WHERE deleted_at IS NULL')
  const csv = new Parser().parse(rows)
  res.header('Content-Type', 'text/csv')
  res.attachment('production_process.csv')
  res.send(csv)
})

// GET /production_process/:id
router.get('/:id', authenticate, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT * FROM production_process WHERE production_plan_id = ? AND deleted_at IS NULL`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Gagal mengambil detail produksi" });
  }
});


// DELETE /production_process/:id
router.delete('/:id', authenticate, async (req, res) => {
  await softDelete('production_process', req.params.id, req.user.id)
  res.sendStatus(204)
})



module.exports = router

