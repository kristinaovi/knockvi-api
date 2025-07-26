const { body: b3 } = require('express-validator')
exports.validateMC = [ b3('part_id').isInt(), b3('machine_id').isInt() ]