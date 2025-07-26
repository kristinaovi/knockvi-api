const router = require('express').Router()
const { db } = require('../utils/db')
const { insertOrUpdate, softDelete, buildFilterQuery, applySorting } = require('../utils/helpers')
const { validatePOD } = require('../validators/pod.validator')
const { validationResult } = require('express-validator')
const { Parser } = require('json2csv')
const { authenticate } = require('../middleware/auth')

// GET /purchase_order_details
router.get('/', authenticate, async (req, res) => {
  const withTrashed = req.query.with_trashed === 'true'
  const { filterSql, values } = buildFilterQuery(req.query, 'pod.', withTrashed)
  const sortClause = applySorting(req.query, 'pod.id')
  const [rows] = await db.query(`
    SELECT pod.*, p.name AS part_name
    FROM purchase_order_details pod
    LEFT JOIN parts p ON pod.part_id = p.id
    ${filterSql}${sortClause}
  `, values)
  res.json(rows)
})

// POST /purchase_order_details
router.post('/', authenticate, validatePOD, async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() })
  const result = await insertOrUpdate('purchase_order_details', req.body, req.user.id)
  res.json(result)
})

// GET /purchase_order_details/export/csv
router.get('/export/csv', authenticate, async (req, res) => {
  const [rows] = await db.query('SELECT * FROM purchase_order_details WHERE deleted_at IS NULL')
  const csv = new Parser().parse(rows)
  res.header('Content-Type', 'text/csv')
  res.attachment('purchase_order_details.csv')
  res.send(csv)
})

// DELETE /purchase_order_details/:id
router.delete('/:id', authenticate, async (req, res) => {
  await softDelete('purchase_order_details', req.params.id, req.user.id)
  res.sendStatus(204)
})

module.exports = router

