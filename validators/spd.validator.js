const { body: b7 } = require('express-validator')
exports.validateSPD = [
  b7('purchase_order_detail_id').isInt(), b7('actual_quantity').isInt(),
  b7('carton').isInt(), b7('pallete').isInt()
]