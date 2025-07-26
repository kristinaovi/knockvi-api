const router = require('express').Router()
const { db } = require('../utils/db')
const { insertOrUpdate, softDelete, buildFilterQuery, applySorting } = require('../utils/helpers')
const { validateProgPlan } = require('../validators/progplan.validator')
const { validationResult } = require('express-validator')
const { Parser } = require('json2csv')
const { authenticate } = require('../middleware/auth')

// GET /production_plan
router.get('/', authenticate, async (req, res) => {
  const withTrashed = req.query.with_trashed === 'true'
  const { filterSql, values } = buildFilterQuery(req.query, 'pp.', withTrashed)
  const sortClause = applySorting(req.query, 'pp.id')
  const [rows] = await db.query(`
    SELECT pp.*, p.name AS part_name, m.name AS machine_name
    FROM production_plan pp
    LEFT JOIN parts p    ON pp.part_id    = p.id
    LEFT JOIN machines m ON pp.machine_id = m.id
    ${filterSql}${sortClause}
  `, values)
  res.json(rows)
})

// POST /production_plan
router.post('/', authenticate, validateProgPlan, async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() })
  const result = await insertOrUpdate('production_plan', req.body, req.user.id)
  res.json(result)
})

// GET /production_plan/export/csv
router.get('/export/csv', authenticate, async (req, res) => {
  const [rows] = await db.query('SELECT * FROM production_plan WHERE deleted_at IS NULL')
  const csv = new Parser().parse(rows)
  res.header('Content-Type', 'text/csv')
  res.attachment('production_plan.csv')
  res.send(csv)
})

// DELETE /production_plan/:id
router.delete('/:id', authenticate, async (req, res) => {
  await softDelete('production_plan', req.params.id, req.user.id)
  res.sendStatus(204)
})

module.exports = router

