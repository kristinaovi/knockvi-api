const router = require('express').Router()
const { db } = require('../utils/db')
const { insertOrUpdate, softDelete, buildFilterQuery, applySorting } = require('../utils/helpers')
const { validateSPD } = require('../validators/spd.validator')
const { validationResult } = require('express-validator')
const { Parser } = require('json2csv')
const { authenticate } = require('../middleware/auth')

// GET /shipping_plan_detail
router.get('/', authenticate, async (req, res) => {
  const { shipping_plan_id } = req.query;

  let sql = `
    SELECT spd.*, pod.line AS po_line, p.price AS price, pod.original_quantity,
           p.code AS part_code, p.name AS part_name, p.pack_carton_quantity AS part_pack_carton_quantity
    FROM shipping_plan_detail spd
    LEFT JOIN purchase_order_details pod ON spd.purchase_order_detail_id = pod.id
    LEFT JOIN parts p ON p.id=pod.part_id
    WHERE spd.deleted_at IS NULL
  `;
  const values = [];

  if (shipping_plan_id) {
    sql += ` AND spd.shipping_plan_id = ?`;
    values.push(shipping_plan_id);
  }

  const [rows] = await db.query(sql, values);
  res.json(rows);
});


// routes/shipping_plan_detail.js (POST)
router.post('/', authenticate, validateSPD, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

  try {
    const {
      id,
      shipping_plan_id,
      purchase_order_detail_id, // optional
      actual_quantity,
      carton,
      pallete,
      note,
    } = req.body;

    const spId = shipping_plan_id || null;
    const podId = purchase_order_detail_id || null; // boleh null
    const qty = actual_quantity != null ? Number(actual_quantity) : 0;
    const cartonVal = carton != null ? Number(carton) : 0;
    const palleteVal = pallete != null ? Number(pallete) : 0;
    const noteVal = note ?? null;
    const userId = req.user.id;

    let result;
    if (id) {
      // UPDATE
      const [r] = await db.query(
        `UPDATE shipping_plan_detail
         SET shipping_plan_id = ?, purchase_order_detail_id = ?, actual_quantity = ?, carton = ?, pallete = ?, note = ?, updated_by = ?, updated_at = NOW()
         WHERE id = ?`,
        [spId, podId, qty, cartonVal, palleteVal, noteVal, userId, id]
      );
      const [[updatedRow]] = await db.query(`SELECT * FROM shipping_plan_detail WHERE id = ?`, [id]);
      result = updatedRow;
    } else {
      // INSERT
      const [ins] = await db.query(
        `INSERT INTO shipping_plan_detail
         (shipping_plan_id, purchase_order_detail_id, actual_quantity, carton, pallete, note, created_by, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
        [spId, podId, qty, cartonVal, palleteVal, noteVal, userId]
      );
      const insertId = ins.insertId;
      const [[newRow]] = await db.query(`SELECT * FROM shipping_plan_detail WHERE id = ?`, [insertId]);
      result = newRow;
    }

    // ❌ Tidak ada update ke purchase_order_details
    res.json({ success: true, data: result });
  } catch (err) {
    console.error('Failed to save shipping_plan_detail:', err);
    res.status(500).json({ error: 'Failed to save shipping_plan_detail' });
  }
});




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

