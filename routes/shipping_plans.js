const router = require('express').Router()
const { db } = require('../utils/db')
const { insertOrUpdate, softDelete, buildFilterQuery, applySorting } = require('../utils/helpers')
const { validateSP } = require('../validators/sp.validator')
const { validationResult } = require('express-validator')
const { Parser } = require('json2csv')
const { authenticate } = require('../middleware/auth')

// GET /shipping_plans
router.get('/', authenticate, async (req, res) => {
  const withTrashed = req.query.with_trashed === 'true'
  const { filterSql, values } = buildFilterQuery(req.query, 'sp.', withTrashed)
  const sortClause = applySorting(req.query, 'sp.id')
  const [rows] = await db.query(`
    SELECT sp.*
    FROM shipping_plans sp
    ${filterSql}${sortClause}
  `, values)
  res.json(rows)
})

// POST /shipping_plans
router.post('/', authenticate, validateSP, async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() })
  const {invoice_id, ...restOfForm} = req.body
  const result = await insertOrUpdate('shipping_plans', restOfForm, req.user.id)
  res.json(result)
})

// GET /shipping_plans/export/csv
router.get('/export/csv', authenticate, async (req, res) => {
  const [rows] = await db.query('SELECT * FROM shipping_plans WHERE deleted_at IS NULL')
  const csv = new Parser().parse(rows)
  res.header('Content-Type', 'text/csv')
  res.attachment('shipping_plans.csv')
  res.send(csv)
})

// DELETE /shipping_plans/:id
router.delete('/:id', authenticate, async (req, res) => {
  await softDelete('shipping_plans', req.params.id, req.user.id)
  res.sendStatus(204)
})

module.exports = router

