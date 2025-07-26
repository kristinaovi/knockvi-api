const { body: b2 } = require('express-validator')
exports.validateMachines = [ b2('name').notEmpty(), b2('type').notEmpty() ]