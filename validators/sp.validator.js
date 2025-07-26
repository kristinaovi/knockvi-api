const { body: b6 } = require('express-validator')
exports.validateSP = [
  b6('issuer_id').isInt(), b6('etd_nkb').isISO8601(), b6('booking_number').notEmpty(),
  b6('vessel_name').notEmpty(), b6('container_name').notEmpty(), b6('status').notEmpty()
]