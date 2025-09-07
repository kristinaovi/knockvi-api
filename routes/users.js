const router = require('express').Router();
const { db } = require('../utils/db');
const { insertOrUpdate, softDelete, buildFilterQuery, applySorting } = require('../utils/helpers');
const { validationResult, body } = require('express-validator');
const { Parser } = require('json2csv');
const { authenticate } = require('../middleware/auth');

// ===== VALIDATOR =====
const validateUser = [
  body('userName').notEmpty().withMessage('Name is required'),
  body('userEmail').isEmail().withMessage('Valid email is required'),
  body('userRole').notEmpty().withMessage('Role is required'),
  body('userStatus').isIn(['Active', 'Inactive']).withMessage('Status must be Active or Inactive')
];

// ===== GET /users =====

router.get('/me', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;

    const [rows] = await db.query(`
      SELECT id, name, email, badge_number, department, role, status, created_at, updated_at
      FROM users
      WHERE id = ?
      LIMIT 1
    `, [userId]);

    if (rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ message: 'Failed to fetch user profile' });
  }
});


router.get('/', authenticate, async (req, res) => {
  const withTrashed = req.query.with_trashed === 'true';
  const { filterSql, values } = buildFilterQuery(req.query, 'u.', withTrashed);
  const sortClause = applySorting(req.query, 'u.id');

  const [rows] = await db.query(`
    SELECT
      u.id,
      u.name,
      u.email,
      u.badge_number,
      u.department,
      u.role,
      u.status,
      DATE_FORMAT(u.created_at, '%Y-%m-%d %H:%i:%s') AS created_at
    FROM users u
    ${filterSql}
    ${sortClause}
  `, values);

  res.json(rows);
});

// ===== POST /users =====
router.post('/', authenticate, validateUser, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

  const { userName, userEmail, userBadge, userDepartment, userRole, userStatus, id } = req.body;

  // Mapping ke kolom database
  const payload = {
    id,
    name: userName,
    email: userEmail,
    badge_number: userBadge || null,
    department: userDepartment || null,
    role: userRole,
    status: userStatus,
  };

  const result = await insertOrUpdate('users', payload, req.user.id);
  res.status(201).json(result);
});

// ===== EXPORT CSV =====
router.get('/export/csv', authenticate, async (req, res) => {
  const [rows] = await db.query('SELECT * FROM users WHERE deleted_at IS NULL');
  const csv = new Parser().parse(rows);
  res.header('Content-Type', 'text/csv');
  res.attachment('users.csv');
  res.send(csv);
});

// ===== DELETE /users/:id =====
router.delete('/:id', authenticate, async (req, res) => {
  await softDelete('users', req.params.id, req.user.id);
  res.sendStatus(204);
});

module.exports = router;
