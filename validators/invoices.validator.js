const { body: b } = require('express-validator');

exports.validateInv = [
  b('invoice_number').notEmpty().withMessage('Invoice number is required'),
  b('customer').notEmpty().withMessage('Customer is required'),
  b('etd_nkb').isISO8601().withMessage('ETD NKB must be a valid date'),
  b('eta_customer').isISO8601().withMessage('ETA Customer must be a valid date'),
  b('ship_method').isIn(['Sea', 'Air']).withMessage('Ship Method must be Sea or Air')
];
