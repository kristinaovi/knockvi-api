const { body: b } = require('express-validator');

exports.validateFrontendProgPlan = [
  b('partId').notEmpty().withMessage('Part ID is required'),
  b('machineNo').notEmpty().withMessage('Machine No is required'),
  b('machineStatus').notEmpty().withMessage('Machine status is required'),
  b('quantity').isInt().withMessage('Quantity must be an integer'),
  b('partName').optional(),
  b('remarks').optional()
];
