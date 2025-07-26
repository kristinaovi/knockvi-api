const { body: b8 } = require('express-validator')
exports.validateProgPlan = [
  b8('part_id').isInt(), b8('machine_id').isInt(), b8('status').notEmpty(),
  b8('quantity_plan').isInt(), b8('remarks').optional(), b8('issuer_id').isInt()
]