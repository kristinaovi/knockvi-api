// routes/inventory.js
const express = require("express");
const router = express.Router();
const { db } = require("../utils/db"); // asumsi kamu pakai utils/db.js untuk koneksi pool mysql

// GET all inventory
router.get("/", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM inventory ORDER BY id DESC");
    res.json(rows);
  } catch (err) {
    console.error("Error fetching inventory:", err);
    res.status(500).json({ message: "Database error" });
  }
});

// GET one inventory by id
router.get("/:id", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM inventory WHERE id = ?", [
      req.params.id,
    ]);
    if (rows.length === 0) {
      return res.status(404).json({ message: "Inventory not found" });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error("Error fetching inventory:", err);
    res.status(500).json({ message: "Database error" });
  }
});

// POST new inventory
router.post("/", async (req, res) => {
  try {
    const {
      inven_code,
      part_code,
      part_name,
      total_stock,
      finish_good,
      carton,
      pallete,
    } = req.body;

    await db.query(
      `INSERT INTO inventory 
       (inven_code, part_code, part_name, total_stock, finish_good, carton, pallete) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [inven_code, part_code, part_name, total_stock, finish_good, carton, pallete]
    );

    res.status(201).json({ message: "Inventory created successfully" });
  } catch (err) {
    console.error("Error inserting inventory:", err);
    res.status(500).json({ message: "Database error" });
  }
});

module.exports = router;
