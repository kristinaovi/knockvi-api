const router = require('express').Router()
const { db } = require('../utils/db')
const { insertOrUpdate, softDelete, buildFilterQuery, applySorting } = require('../utils/helpers')
const { validateParts } = require('../validators/parts.validator')
const { validationResult } = require('express-validator')
const { Parser } = require('json2csv')
const { authenticate } = require('../middleware/auth')

// GET /parts
router.get('/', authenticate, async (req, res) => {
  const withTrashed = req.query.with_trashed === 'true'
  const { filterSql, values } = buildFilterQuery(req.query, '', withTrashed)
  const sortClause = applySorting(req.query, 'id')
  const [rows] = await db.query(`SELECT * FROM parts${filterSql}${sortClause}`, values)
  res.json(rows)
})

// POST /parts
router.post('/', authenticate, validateParts, async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() })
  const result = await insertOrUpdate('parts', req.body, req.user.id)
  res.json(result)
})

// GET /parts/export/csv
router.get('/export/csv', authenticate, async (req, res) => {
  const [rows] = await db.query('SELECT * FROM parts WHERE deleted_at IS NULL')
  const csv = new Parser().parse(rows)
  res.header('Content-Type', 'text/csv')
  res.attachment('parts.csv')
  res.send(csv)
})

// DELETE /parts/:id
router.delete('/:id', authenticate, async (req, res) => {
  await softDelete('parts', req.params.id, req.user.id)
  res.sendStatus(204)
})

module.exports = router

