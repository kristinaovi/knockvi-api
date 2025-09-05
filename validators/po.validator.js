const { body: b4 } = require('express-validator')
exports.validatePO = [ b4('pecgi_no').notEmpty(),b4('ppap_no').notEmpty(), b4('issuer_id').isInt() ]