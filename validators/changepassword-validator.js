// validators/changepassword-validator.js
const { body, validationResult } = require("express-validator");

exports.validateChangePassword = [
  // Validasi password lama
  body("oldPassword")
    .notEmpty()
    .withMessage("Old password is required"),

  // Validasi password baru
  body("newPassword")
    .isLength({ min: 8 })
    .withMessage("New password must be at least 8 characters long")
    .matches(/[0-9]/)
    .withMessage("New password must contain at least one number")
    .matches(/[A-Z]/)
    .withMessage("New password must contain at least one uppercase letter"),

  // Middleware untuk mengembalikan error jika ada
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }
    next();
  }
];
