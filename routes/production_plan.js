// routes/production_plan.js
const router = require('express').Router();
const { db } = require('../utils/db');
const { authenticate } = require('../middleware/auth');
const { validationResult, body } = require('express-validator');
const { insertOrUpdate, softDelete, buildFilterQuery, applySorting } = require('../utils/helpers');

// Validator
const validateProductionPlan = [
  body('part_id').notEmpty().withMessage('Part ID is required').isInt(),
  body('machine_id').notEmpty().withMessage('Machine ID is required').isInt(),
  body('status').notEmpty().withMessage('Status is required'),
  body('quantity_plan').notEmpty().withMessage('Quantity Plan is required').isInt({ gt: 0 })
];

// GET all production plans
router.get('/', authenticate, async (req, res) => {
  const withTrashed = req.query.with_trashed === 'true';
  const { filterSql, values } = buildFilterQuery(req.query, '', withTrashed);
  const sortClause = applySorting(req.query, 'id');
  const [rows] = await db.query(`SELECT * FROM production_plan${filterSql}${sortClause}`, values);
  res.json(rows);
});

// POST new production plan
router.post('/', authenticate, validateProductionPlan, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ errors: errors.array() });
  }

  try {
    // cari kode terakhir
    const [rows] = await db.query(
      `SELECT prod_code FROM production_plan 
       WHERE prod_code IS NOT NULL 
       ORDER BY id DESC 
       LIMIT 1`
    );

    let newCode = "NKBPROD-001";
    if (rows.length > 0 && rows[0].prod_code) {
      const lastCode = rows[0].prod_code; // contoh: NKBPROD-007
      const numPart = parseInt(lastCode.replace("NKBPROD-", ""), 10) || 0;
      const nextNum = numPart + 1;
      newCode = "NKBPROD-" + String(nextNum).padStart(3, "0");
    }

    // sisipkan ke body sebelum insert
    req.body.prod_code = newCode;

    const result = await insertOrUpdate('production_plan', req.body, req.user.id);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to insert production plan" });
  }
});


// PUT update plan & process sekaligus
router.put('/save-both/:planId', authenticate, async (req, res) => {
  const { planData, processData } = req.body;

  try {
    // Update production_plan
    await insertOrUpdate(
      'production_plan',
      { ...planData, id: req.params.planId },
      req.user.id
    );

    // Update semua production_process terkait
    if (Array.isArray(processData)) {
      for (const proc of processData) {
        await insertOrUpdate(
          'production_process',
          { ...proc, production_plan_id: req.params.planId },
          req.user.id
        );
      }
    }

    res.json({ message: "Production plan & processes updated successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update plan & process" });
  }
});


// DELETE production plan
router.delete('/:id', authenticate, async (req, res) => {
  await softDelete('production_plan', req.params.id, req.user.id);
  res.sendStatus(204);
});

module.exports = router;
