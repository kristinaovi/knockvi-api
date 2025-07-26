const { body: b4 } = require('express-validator')
exports.validatePO = [ b4('no').notEmpty(), b4('issuer_id').isInt(), b4('requested_date').isISO8601() ]