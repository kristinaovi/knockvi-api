const router = require('express').Router()
const { db } = require('../utils/db')
const { insertOrUpdate, softDelete, buildFilterQuery, applySorting } = require('../utils/helpers')
const { validateMachines } = require('../validators/machines.validator')
const { validationResult } = require('express-validator')
const { Parser } = require('json2csv')
const { authenticate } = require('../middleware/auth')

// GET /machines
router.get('/', authenticate, async (req, res) => {
  const withTrashed = req.query.with_trashed === 'true'
  const { filterSql, values } = buildFilterQuery(req.query, '', withTrashed)
  const sortClause = applySorting(req.query, 'id')
  const [rows] = await db.query(`SELECT * FROM machines${filterSql}${sortClause}`, values)
  res.json(rows)
})

// POST /machines
router.post('/', authenticate, validateMachines, async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() })
  const result = await insertOrUpdate('machines', req.body, req.user.id)
  res.json(result)
})

// GET /machines/export/csv
router.get('/export/csv', authenticate, async (req, res) => {
  const [rows] = await db.query('SELECT * FROM machines WHERE deleted_at IS NULL')
  const csv = new Parser().parse(rows)
  res.header('Content-Type', 'text/csv')
  res.attachment('machines.csv')
  res.send(csv)
})

// DELETE /machines/:id
router.delete('/:id', authenticate, async (req, res) => {
  await softDelete('machines', req.params.id, req.user.id)
  res.sendStatus(204)
})

module.exports = router

