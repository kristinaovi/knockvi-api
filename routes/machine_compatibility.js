const router = require('express').Router()
const { db } = require('../utils/db')
const { insertOrUpdate, softDelete, buildFilterQuery, applySorting } = require('../utils/helpers')
const { validateMC } = require('../validators/mc.validator')
const { validationResult } = require('express-validator')
const { Parser } = require('json2csv')
const { authenticate } = require('../middleware/auth')

// GET /machine_compatibility
router.get('/', authenticate, async (req, res) => {
  const withTrashed = req.query.with_trashed === 'true'
  const { filterSql, values } = buildFilterQuery(req.query, 'mc.', withTrashed)
  const sortClause = applySorting(req.query, 'mc.id')
  const [rows] = await db.query(`
    SELECT mc.*, p.name AS part_name, m.name AS machine_name
    FROM machine_compatibility mc
    LEFT JOIN parts p ON mc.part_id = p.id
    LEFT JOIN machines m ON mc.machine_id = m.id
    ${filterSql}${sortClause}
  `, values)
  res.json(rows)
})

// POST /machine_compatibility
router.post('/', authenticate, validateMC, async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() })
  const result = await insertOrUpdate('machine_compatibility', req.body, req.user.id)
  res.json(result)
})

// GET /machine_compatibility/export/csv
router.get('/export/csv', authenticate, async (req, res) => {
  const [rows] = await db.query('SELECT * FROM machine_compatibility WHERE deleted_at IS NULL')
  const csv = new Parser().parse(rows)
  res.header('Content-Type', 'text/csv')
  res.attachment('machine_compatibility.csv')
  res.send(csv)
})

// DELETE /machine_compatibility/:id
router.delete('/:id', authenticate, async (req, res) => {
  await softDelete('machine_compatibility', req.params.id, req.user.id)
  res.sendStatus(204)
})

module.exports = router

