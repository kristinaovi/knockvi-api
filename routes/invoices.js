const router = require('express').Router()
const { db } = require('../utils/db')
const { insertOrUpdate, softDelete, buildFilterQuery, applySorting } = require('../utils/helpers')
const { validateInv } = require('../validators/invoices.validator')
const { validationResult } = require('express-validator')
const { Parser } = require('json2csv')
const { authenticate } = require('../middleware/auth')

// GET /invoices
router.get('/', authenticate, async (req, res) => {
  const withTrashed = req.query.with_trashed === 'true'
  const { filterSql, values } = buildFilterQuery(req.query, 'inv.', withTrashed)
  const sortClause = applySorting(req.query, 'inv.id')
  const [rows] = await db.query(`
    SELECT inv.*, po.no AS order_no
    FROM invoices inv
    LEFT JOIN purchase_orders po ON inv.order_number = po.no
    ${filterSql}${sortClause}
  `, values)
  res.json(rows)
})

// POST /invoices
router.post('/', authenticate, validateInv, async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() })
  const result = await insertOrUpdate('invoices', req.body, req.user.id)
  res.json(result)
})

// GET /invoices/export/csv
router.get('/export/csv', authenticate, async (req, res) => {
  const [rows] = await db.query('SELECT * FROM invoices WHERE deleted_at IS NULL')
  const csv = new Parser().parse(rows)
  res.header('Content-Type', 'text/csv')
  res.attachment('invoices.csv')
  res.send(csv)
})

// DELETE /invoices/:id
router.delete('/:id', authenticate, async (req, res) => {
  await softDelete('invoices', req.params.id, req.user.id)
  res.sendStatus(204)
})

module.exports = router

