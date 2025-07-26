const router = require('express').Router()
const { db } = require('../utils/db')
const { insertOrUpdate, softDelete, buildFilterQuery, applySorting } = require('../utils/helpers')
const { validateSPD } = require('../validators/spd.validator')
const { validationResult } = require('express-validator')
const { Parser } = require('json2csv')
const { authenticate } = require('../middleware/auth')

// GET /shipping_plan_detail
router.get('/', authenticate, async (req, res) => {
  const withTrashed = req.query.with_trashed === 'true'
  const { filterSql, values } = buildFilterQuery(req.query, 'spd.', withTrashed)
  const sortClause = applySorting(req.query, 'spd.id')
  const [rows] = await db.query(`
    SELECT spd.*, pod.line AS po_line
    FROM shipping_plan_detail spd
    LEFT JOIN purchase_order_details pod ON spd.purchase_order_detail_id = pod.id
    ${filterSql}${sortClause}
  `, values)
  res.json(rows)
})

// POST /shipping_plan_detail
router.post('/', authenticate, validateSPD, async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() })
  const result = await insertOrUpdate('shipping_plan_detail', req.body, req.user.id)
  res.json(result)
})

// GET /shipping_plan_detail/export/csv
router.get('/export/csv', authenticate, async (req, res) => {
  const [rows] = await db.query('SELECT * FROM shipping_plan_detail WHERE deleted_at IS NULL')
  const csv = new Parser().parse(rows)
  res.header('Content-Type', 'text/csv')
  res.attachment('shipping_plan_detail.csv')
  res.send(csv)
})

// DELETE /shipping_plan_detail/:id
router.delete('/:id', authenticate, async (req, res) => {
  await softDelete('shipping_plan_detail', req.params.id, req.user.id)
  res.sendStatus(204)
})

module.exports = router

