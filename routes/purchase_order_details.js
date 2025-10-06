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
SELECT
  pod.*,
  p.name AS part_name,
  p.code AS part_code,
  po.pecgi_no,
  po.ppap_no,
  po.requested_date,
  DATE_FORMAT(po.requested_date, '%Y-%m-%d') AS request_date_formatted,

  0 AS shipped_qty,              -- selalu nol
  pod.original_quantity AS open_quantity -- open qty = issued qty (tidak berkurang)
FROM purchase_order_details pod
LEFT JOIN parts p ON pod.part_id = p.id
LEFT JOIN purchase_orders po ON pod.purchase_order_id = po.id
${filterSql}
${sortClause}

  `, values)
  res.json(rows)
})

// POST /purchase_order_details
router.post('/', authenticate, validatePOD, async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() })

  console.log('DEBUG POST /purchase_order_details body:', req.body); // <-- tambahkan

  const result = await insertOrUpdate('purchase_order_details', req.body, req.user.id)
  res.json(result)
})




router.put('/:id', authenticate, validatePOD, async (req, res) => {
  const podId = req.params.id
  req.body.id = podId
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

// GET /purchase_order_details/:id – return IN/OUT history with running total
router.get('/:id', authenticate, async (req, res) => {
  const podId = req.params.id

  // 1) Fetch the PO detail record
  const [podRows] = await db.query(
    `SELECT original_quantity, created_at
     FROM purchase_order_details
     WHERE id = ? AND deleted_at IS NULL`,
    [podId]
  )
  if (podRows.length === 0) {
    return res.status(404).json({ error: 'Purchase order detail not found' })
  }
  const { original_quantity, created_at } = podRows[0]

  // 2) Fetch all OUT transactions for this detail
  const [outRows] = await db.query(
    `SELECT spd.actual_quantity AS quantity,
            sp.etd_nkb               AS date
     FROM shipping_plan_detail spd
     JOIN shipping_plans sp
       ON spd.shipping_plan_id = sp.id
      AND sp.deleted_at IS NULL
     WHERE spd.purchase_order_detail_id = ?
       AND spd.deleted_at IS NULL`,
    [podId]
  )

  // 3) Build the history array and compute running total
  let running = original_quantity
  const history = []

  // IN record
  history.push({
    type:     'IN',
    quantity: original_quantity,
    date:     created_at,
    total:    running
  })

  // sort OUTs by date ascending so we subtract in chronological order
  outRows
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .forEach(({ quantity, date }) => {
      running -= quantity
      history.push({
        type:     'OUT',
        quantity,
        date,
        total:    running
      })
    })

  // 4) Finally sort history by date descending (oldest first)
  history.sort((a, b) => new Date(a.date) - new Date(b.date))

  res.json(history)
})


module.exports = router

