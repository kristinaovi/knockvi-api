const { body: b9 } = require('express-validator')
exports.validateProgProc = [
  b9('production_type').notEmpty(), b9('production_plan_id').isInt(),
  b9('output_1').isInt(), b9('output_2').isInt(), b9('date').isISO8601(),
  b9('issuer_id').isInt()
]