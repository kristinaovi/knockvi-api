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
  const errors = validationResult(req)
  if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() })
  const result = await insertOrUpdate('production_process', req.body, req.user.id)
  res.json(result)
})

// GET /production_process/export/csv
router.get('/export/csv', authenticate, async (req, res) => {
  const [rows] = await db.query('SELECT * FROM production_process WHERE deleted_at IS NULL')
  const csv = new Parser().parse(rows)
  res.header('Content-Type', 'text/csv')
  res.attachment('production_process.csv')
  res.send(csv)
})

// DELETE /production_process/:id
router.delete('/:id', authenticate, async (req, res) => {
  await softDelete('production_process', req.params.id, req.user.id)
  res.sendStatus(204)
})

module.exports = router

