// validators/spd.validator.js
const { body: b7 } = require('express-validator')
exports.validateSPD = [
  b7('purchase_order_detail_id').optional({ nullable: true }).isInt(),
  b7('carton').optional({ nullable: true }).isInt(),
  b7('pallete').optional({ nullable: true }).isInt()
]
