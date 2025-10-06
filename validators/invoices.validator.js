// invoices.validator.js
const { body: b } = require('express-validator');

exports.validateInv = [
  b('customer_code').notEmpty().withMessage('Customer is required'),
  b('invoice_number').notEmpty().withMessage('Invoice number is required'),
  b('booking_no').notEmpty().withMessage('Booking no. is required'),
  b('vessel_flight').notEmpty().withMessage('Vessel/flight is required'),
  b('container').notEmpty().withMessage('Container is required'),
  b('etd_nkb')
    .notEmpty()
    .withMessage('ETD NKB is required')
    .bail()
    .isISO8601()
    .withMessage('ETD NKB must be a valid date'),
  // make eta_customer optional; skip validation if missing/null/empty
  b('eta_customer')
    .optional({ nullable: true, checkFalsy: true })
    .isISO8601()
    .withMessage('ETA Customer must be a valid date'),
  b('ship_method')
    .notEmpty()
    .withMessage('Ship Method is required')
    .bail()
    .isIn(['Sea', 'Air'])
    .withMessage('Ship Method must be Sea or Air'),
];
