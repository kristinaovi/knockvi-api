const router = require('express').Router()
const { db } = require('../utils/db')
const { insertOrUpdate, softDelete, buildFilterQuery, applySorting } = require('../utils/helpers')
const { validatePO } = require('../validators/po.validator')
const { validationResult } = require('express-validator')
const { Parser } = require('json2csv')
const { authenticate } = require('../middleware/auth')

// GET /purchase_orders
router.get('/', authenticate, async (req, res) => {
  const withTrashed = req.query.with_trashed === 'true'
  const { filterSql, values } = buildFilterQuery(req.query, 'po.', withTrashed)
  const sortClause = applySorting(req.query, 'po.id')
  const [rows] = await db.query(`
    SELECT po.*, u.email AS issuer_email, u.department AS issuer_department
    FROM purchase_orders po
    LEFT JOIN users u ON po.issuer_id = u.id
    ${filterSql}${sortClause}
  `, values)
  res.json(rows)
})

// POST /purchase_orders
router.post('/', authenticate, validatePO, async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() })
  const result = await insertOrUpdate('purchase_orders', req.body, req.user.id)
  res.json(result)
})

// GET /purchase_orders/export/csv
router.get('/export/csv', authenticate, async (req, res) => {
  const [rows] = await db.query('SELECT * FROM purchase_orders WHERE deleted_at IS NULL')
  const csv = new Parser().parse(rows)
  res.header('Content-Type', 'text/csv')
  res.attachment('purchase_orders.csv')
  res.send(csv)
})

// DELETE /purchase_orders/:id
router.delete('/:id', authenticate, async (req, res) => {
  await softDelete('purchase_orders', req.params.id, req.user.id)
  res.sendStatus(204)
})

module.exports = router

