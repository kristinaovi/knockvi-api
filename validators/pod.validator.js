const { body: b5 } = require('express-validator')
exports.validatePOD = [
  b5('part_id').isInt(), b5('request_date').isISO8601(), b5('line').notEmpty(),
  b5('original_quantity').isInt(), b5('price').isDecimal()
]