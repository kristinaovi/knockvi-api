const bcrypt = require('bcrypt')
const jwt    = require('jsonwebtoken')
const { db } = require('../utils/db')
const { now }= require('../utils/helpers')

exports.login = async (req, res) => {
  const { email, password } = req.body
  const [rows] = await db.query(
    'SELECT * FROM users WHERE email = ? AND deleted_at IS NULL',
    [email]
  )
  const user = rows[0]
  if (!user || !(await bcrypt.compare(password, user.password)))
    return res.sendStatus(401)

  const token = jwt.sign(
    { id: user.id, email: user.email, is_admin: user.is_admin },
    process.env.JWT_SECRET
  )
  res.json({ token })
}

exports.assignRole = async (req, res) => {
  if (!req.user.is_admin) return res.sendStatus(403)
  const { user_id, department, role } = req.body
  await db.query(
    `UPDATE users
     SET department = ?, role = ?, updated_at = ?, updated_by = ?
     WHERE id = ? AND deleted_at IS NULL`,
    [department, role, now(), req.user.id, user_id]
  )
  res.json({ success: true })
}

