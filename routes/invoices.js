// routes/invoices.js
const router = require('express').Router();
const { db } = require('../utils/db');
const { insertOrUpdate, softDelete, buildFilterQuery, applySorting } = require('../utils/helpers');
const { validateInv } = require('../validators/invoices.validator');
const { validationResult } = require('express-validator');
const { Parser } = require('json2csv');
const { authenticate } = require('../middleware/auth');

// GET /invoices
router.get('/', authenticate, async (req, res) => {
  try {
    const withTrashed = req.query.with_trashed === 'true';
    const { filterSql, values } = buildFilterQuery(req.query, 'inv.', withTrashed);
    const sortClause = applySorting(req.query, 'inv.id');
const [rows] = await db.query(`
SELECT inv.id,
       inv.invoice_number,
       inv.booking_no,
       inv.vessel_flight,
       inv.container,
       inv.etd_nkb,
       inv.ship_method,
       inv.seq,
       inv.customer_id,
       c.name AS customer_name,
       c.code AS customer_code,
       inv.created_at,
       inv.updated_at,
       sp.etd_cust AS eta_customer
FROM invoices inv
LEFT JOIN shipping_plans sp ON sp.invoice_id = inv.id
LEFT JOIN customers c ON inv.customer_id = c.id
  ${filterSql} ${sortClause}
`, values);


    res.json(rows);
  } catch (err) {
    console.error('GET /invoices error', err);
    res.status(500).json({ message: 'Failed to fetch invoices' });
  }
});

// GET /invoices/next?customer=PESA
router.get('/next', authenticate, async (req, res) => {
  try {
    const customer = req.query.customer;
    if (!customer) {
      return res.status(400).json({ message: 'Customer is required' });
    }

    const now = new Date();
    const year = now.getFullYear();
    const yearShort = String(year).slice(-2);
    const month = String(now.getMonth() + 1).padStart(2, '0');

    const [rows] = await db.query(
      `SELECT COALESCE(MAX(inv.seq),0) AS last_seq
       FROM customers c
       LEFT JOIN invoices inv ON inv.customer_id = c.id
         AND YEAR(inv.created_at) = ?
         AND MONTH(inv.created_at) = ?
       WHERE c.code = ?`,
      [year, month, customer]
    );

    const nextSeq = rows[0].last_seq + 1;
    const seqStr = String(nextSeq).padStart(3, '0');
    const invoice_number = `${yearShort}/${month} (${customer})-${seqStr}`;

    res.json({ invoice_number, seq: nextSeq });
  } catch (err) {
    console.error('GET /invoices/next error', err);
    res.status(500).json({ message: 'Failed to generate invoice number' });
  }
});

// POST /invoices
router.post('/', authenticate, validateInv, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }

    const payload = { ...req.body };

    // Pastikan ada customer_code dari frontend
    if (!payload.customer_code) {
      return res.status(400).json({ message: 'customer_code is required' });
    }

    // 1. Ambil customer_id dari tabel customers
    const [custRows] = await db.query(
      `SELECT id, code FROM customers WHERE code = ? LIMIT 1`,
      [payload.customer_code]
    );
    if (custRows.length === 0) {
      return res.status(404).json({ message: 'Customer not found' });
    }
    const customerId = custRows[0].id;
    const customerCode = custRows[0].code;

    // 2. Ambil tahun & bulan sekarang
    const now = new Date();
    const year = now.getFullYear();
    const yearShort = String(year).slice(-2);
    const month = String(now.getMonth() + 1).padStart(2, '0');

    // 3. Cari seq terakhir
    const [rows] = await db.query(
      `SELECT COALESCE(MAX(inv.seq),0) AS last_seq
       FROM invoices inv
       WHERE YEAR(inv.created_at) = ? 
         AND MONTH(inv.created_at) = ?
         AND inv.customer_id = ?`,
      [year, month, customerId]
    );
    const nextSeq = rows[0].last_seq + 1;
    const seqStr = String(nextSeq).padStart(3, '0');

    // 4. Generate invoice_number
    const invoice_number = `${yearShort}/${month} (${customerCode})-${seqStr}`;

    // 5. Buat data akhir untuk insert
    const finalPayload = {
      ...payload,
      customer_id: customerId,
      invoice_number,
      seq: nextSeq,
    };

    // Jangan kirim field customer_code ke DB karena tidak ada kolomnya
    delete finalPayload.customer_code;

    const result = await insertOrUpdate('invoices', finalPayload, req.user.id);
    res.json(result);
  } catch (err) {
    console.error('POST /invoices error', err);
    res.status(500).json({ message: 'Failed to save invoice' });
  }
});


// PUT /invoices/:id  (update)
router.put('/:id', authenticate, async (req, res) => {
  try {
    const payload = { ...req.body };
    // don't save empty string/null for date
    if (payload.eta_customer === '' || payload.eta_customer === null || payload.eta_customer === undefined) {
      delete payload.eta_customer;
    }

    // ensure id present if your helper expects it in data for update
    payload.id = Number(req.params.id);

    const result = await insertOrUpdate('invoices', payload, req.user.id);
    res.json(result);
  } catch (err) {
    console.error('PUT /invoices/:id error', err);
    res.status(500).json({ message: 'Failed to update invoice' });
  }
});

// PUT /invoices/:id/eta
router.put('/:id/eta', authenticate, async (req, res) => {
  const invoiceId = Number(req.params.id);
  const { eta_customer, force } = req.body; // force = true => overwrite
  if (!eta_customer) return res.status(400).json({ message: 'eta_customer required' });

  const params = [eta_customer, invoiceId];
  const sql = force
    ? `UPDATE invoices SET eta_customer = ? WHERE id = ?`
    : `UPDATE invoices SET eta_customer = ? WHERE id = ? AND (eta_customer IS NULL OR eta_customer = '')`;

  await db.query(sql, params);
  res.json({ ok: true });
});


// DELETE /invoices/:id
router.delete('/:id', authenticate, async (req, res) => {
  try {
    await softDelete('invoices', req.params.id, req.user.id);
    res.sendStatus(204);
  } catch (err) {
    console.error('DELETE /invoices/:id error', err);
    res.status(500).json({ message: 'Failed to delete invoice' });
  }
});

module.exports = router;
