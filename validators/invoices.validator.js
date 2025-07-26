const { body: b10 } = require('express-validator')
exports.validateInv = [
  b10('invoice_number').notEmpty(), b10('date').isISO8601(),
  b10('order_number').notEmpty(), b10('eta').isISO8601(), b10('issuer_id').isInt()
]