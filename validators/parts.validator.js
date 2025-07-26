const { body } = require('express-validator')
exports.validateParts = [
  body('code').notEmpty(),
  body('name').notEmpty(),
  body('category').notEmpty(),
  body('pack_carton_quantity').isInt(),
  body('pack_plt_quantity').isInt()
]