const { body } = require('express-validator');

exports.validateProgProc = [
  body('production_plan_id').isInt().withMessage('Production Plan ID required'),
  body('production_type').notEmpty().withMessage('Production Type required'),
  body('output_1').isInt().withMessage('Output 1 must be integer'),
  body('output_2').isInt().withMessage('Output 2 must be integer'),
  body('date').isISO8601().withMessage('Valid date required'),
  body('issuer_id').isInt().withMessage('Issuer ID required'),
];
