const router = require('express').Router();
const { db } = require('../utils/db');
const { insertOrUpdate, softDelete, buildFilterQuery, applySorting } = require('../utils/helpers');
const { validateSP } = require('../validators/sp.validator');
const { validationResult } = require('express-validator');
const { Parser } = require('json2csv');
const { authenticate } = require('../middleware/auth');

// Sanitize date function
const sanitizeDate = (dateStr) => dateStr ? dateStr.slice(0, 10) : null;

// GET /shipping_plans
router.get('/', authenticate, async (req, res) => {
  const withTrashed = req.query.with_trashed === 'true';
  const { filterSql, values } = buildFilterQuery(req.query, 'sp.', withTrashed);
  const sortClause = applySorting(req.query, 'sp.id');

  const [rows] = await db.query(`
    SELECT 
      id,
      shipping_code, 
      booking_number,
      vessel_name,
      container_name,
      invoice_id,
      DATE_FORMAT(etd_nkb, '%Y-%m-%d') AS etd_nkb,
      DATE_FORMAT(etd_cust, '%Y-%m-%d') AS etd_cust
    FROM shipping_plans
    WHERE deleted_at IS NULL
  `);

  res.json(rows);
});



// POST /shipping_plans
router.post('/', authenticate, validateSP, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

  // Sanitize dates before saving
  req.body.etd_nkb = sanitizeDate(req.body.etd_nkb);
  req.body.etd_cust = sanitizeDate(req.body.etd_cust);

  // 🔥 Generate shipping_code otomatis
  const [[last]] = await db.query(`
    SELECT shipping_code 
    FROM shipping_plans 
    WHERE shipping_code IS NOT NULL
    ORDER BY id DESC 
    LIMIT 1
  `);

  let nextNumber = 1;
  if (last && last.shipping_code) {
    const match = last.shipping_code.match(/NKBSHP-(\d+)/);
    if (match) {
      nextNumber = parseInt(match[1], 10) + 1;
    }
  }

  req.body.shipping_code = `NKBSHP-${String(nextNumber).padStart(3, "0")}`;

  // Simpan data
  const result = await insertOrUpdate('shipping_plans', req.body, req.user.id);
  res.json(result);
});

// GET /shipping_plans/export/csv
router.get('/export/csv', authenticate, async (req, res) => {
  const [rows] = await db.query('SELECT * FROM shipping_plans WHERE deleted_at IS NULL');
  const csv = new Parser().parse(rows);
  res.header('Content-Type', 'text/csv');
  res.attachment('shipping_plans.csv');
  res.send(csv);
});

// DELETE /shipping_plans/:id
router.delete('/:id', authenticate, async (req, res) => {
  await softDelete('shipping_plans', req.params.id, req.user.id);
  res.sendStatus(204);
});

module.exports = router;
