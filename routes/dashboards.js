const bcrypt = require('bcrypt')
const jwt    = require('jsonwebtoken')
const { db } = require('../utils/db')
const { now }= require('../utils/helpers')
const router = require('express').Router();
const { authenticate } = require('../middleware/auth');


router.get('/parts', authenticate, async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        category,
        COUNT(*) AS total
      FROM parts
      WHERE deleted_at IS NULL
      GROUP BY category
      ORDER BY category ASC
    `)

    res.json({ success: true, data: rows })
  } catch (err) {
    console.error('Error getting parts sum by category:', err)
    res.status(500).json({ success: false, message: err })
  }
})

router.get('/overview', authenticate, async (req, res) => {
  try {
    const selectedYear = req.query.year ? parseInt(req.query.year, 10) : new Date().getFullYear()

    // --- Query 1: Purchase Orders ---
    const [orders] = await db.query(
      `
      SELECT
        DATE_FORMAT(created_at, '%b') AS month,
        SUM(original_quantity) AS total
      FROM purchase_order_details
      WHERE deleted_at IS NULL
        AND YEAR(created_at) = ?
      GROUP BY MONTH(created_at), DATE_FORMAT(created_at, '%b') -- Group by both month number and name
      ORDER BY MONTH(created_at)  -- Order by month number
      `,
      [selectedYear]
    )

    // --- Query 2: Production Plans ---
    const [productions] = await db.query(
      `
      SELECT
        DATE_FORMAT(created_at, '%b') AS month,
        SUM(quantity_plan) AS total
      FROM production_plan
      WHERE deleted_at IS NULL
        AND YEAR(created_at) = ?
      GROUP BY MONTH(created_at), DATE_FORMAT(created_at, '%b')
      ORDER BY MONTH(created_at)
      `,
      [selectedYear]
    )

    // --- Query 3: Shipping Plans ---
    const [shippings] = await db.query(
      `
      SELECT
        DATE_FORMAT(created_at, '%b') AS month,
        SUM(actual_quantity) AS total
      FROM shipping_plan_detail
      WHERE deleted_at IS NULL
        AND YEAR(created_at) = ?
      GROUP BY MONTH(created_at), DATE_FORMAT(created_at, '%b')
      ORDER BY MONTH(created_at)
      `,
      [selectedYear]
    )

    // --- Combine results into unified structure (JS logic remains correct) ---
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

    const total_order = months.map(m => {
      const found = orders.find(o => o.month === m)
      return found ? Number(found.total) : 0
    })

    const production = months.map(m => {
      const found = productions.find(p => p.month === m)
      return found ? Number(found.total) : 0
    })

    const shipping = months.map(m => {
      const found = shippings.find(s => s.month === m)
      return found ? Number(found.total) : 0
    })

    res.json({
      success: true,
      data: { months, total_order, production, shipping },
    })
  } catch (err) {
    console.error('Error fetching overview:', err)
    res.status(500).json({ success: false, message: err.message })
  }
})




module.exports = router;